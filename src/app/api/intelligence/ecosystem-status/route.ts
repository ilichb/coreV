import { NextResponse } from 'next/server';
import { mongoDBClient } from '@/lib/infrastructure/mongodb';

// Each known ecosystem and its display name
const ECOSYSTEMS = [
  { id: 'rootstock',  label: 'Rootstock',  chain: 'rsk',      color: '#f97316' },
  { id: 'optimism',   label: 'Optimism',   chain: 'op',       color: '#ff0420' },
  { id: 'arbitrum',   label: 'Arbitrum',   chain: 'arb',      color: '#12aaff' },
  { id: 'algorand',   label: 'Algorand',   chain: 'algo',     color: '#00b4d8' },
  { id: 'snapshot',   label: 'Snapshot',   chain: 'multi',    color: '#9b5de5' },
  { id: 'ethereum',   label: 'Ethereum',   chain: 'eth',      color: '#8b949e' },
];

// A milestone is considered "fresh" if updated within the last 48 hours
const FRESHNESS_MS = 48 * 60 * 60 * 1000;

export async function GET() {
  try {
    await mongoDBClient.connect();
    const col = mongoDBClient.getMilestonesCollection();

    const now = Date.now();
    const cutoff = new Date(now - FRESHNESS_MS).toISOString();

    // Run all queries in parallel for speed
    const results = await Promise.all(
      ECOSYSTEMS.map(async (eco) => {
        const [total, recent, lastDoc] = await Promise.all([
          // Total milestones ever indexed for this ecosystem
          col.countDocuments({ 'sourceScorecard.ecosystem': eco.id }),
          // Milestones updated within the freshness window
          col.countDocuments({
            'sourceScorecard.ecosystem': eco.id,
            'metadata.updatedAt': { $gte: cutoff }
          }),
          // The most recently updated milestone for this ecosystem
          col
            .find({ 'sourceScorecard.ecosystem': eco.id })
            .sort({ 'metadata.updatedAt': -1 })
            .limit(1)
            .toArray()
        ]);

        const lastSeen = lastDoc[0]?.metadata?.updatedAt ?? null;
        const isFresh = lastSeen ? (now - new Date(lastSeen).getTime()) < FRESHNESS_MS : false;
        const status: 'online' | 'syncing' | 'offline' =
          total === 0       ? 'offline'  :
          isFresh           ? 'online'   :
                              'syncing'; // has data but not fresh

        return {
          ...eco,
          status,
          totalMilestones: total,
          recentMilestones: recent,
          lastSeen,
        };
      })
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ecosystems: results,
    });

  } catch (err: any) {
    // If DB is unreachable still return a shape the UI can render
    return NextResponse.json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
      ecosystems: ECOSYSTEMS.map(eco => ({
        ...eco,
        status: 'offline',
        totalMilestones: 0,
        recentMilestones: 0,
        lastSeen: null,
      })),
    }, { status: 200 }); // 200 so the UI doesn't hard-fail
  }
}
