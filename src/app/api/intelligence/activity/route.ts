import { NextResponse } from 'next/server';
import { mongoDBClient } from '@/lib/infrastructure/mongodb';
import { logger } from '@/lib/utils/logger';
import os from 'os';

export const maxDuration = 10;

/**
 * GET /api/intelligence/activity
 *
 * Returns a list of recent system events derived from:
 * 1. The last 20 milestone documents inserted into MongoDB (real governance events)
 * 2. AVIP verification status (verified vs total count)
 * 3. OS / system health snapshot
 *
 * Designed for the Activity Monitor panel — poll every 15s.
 */

interface ActivityEvent {
  ts: string;       // Formatted time string
  level: 'success' | 'info' | 'warn' | 'error';
  msg: string;
}

export async function GET() {
  const events: ActivityEvent[] = [];
  const now = new Date();

  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  try {
    await mongoDBClient.connect();
    const col = mongoDBClient.getMilestonesCollection();

    if (col) {
      // 1. Last 20 milestones inserted — real governance events
      const recent = await col
        .find({})
        .sort({ _id: -1 })
        .limit(20)
        .toArray();

      for (const doc of recent) {
        const ecosystem: string = doc.action?.metadata?.ecosystem ?? 'unknown';
        const proposalId: string = doc.action?.metadata?.proposalId ?? doc._id?.toString() ?? '';
        const status: string = doc.status ?? 'PENDING';
        const shortId = proposalId.slice(0, 16) + (proposalId.length > 16 ? '…' : '');

        // Extract timestamp from ObjectId (accurate insert time)
        const insertTime = doc._id ? new Date((doc._id as any).getTimestamp?.() ?? now) : now;

        events.push({
          ts: fmt(insertTime),
          level: status === 'VERIFIED' ? 'success' : 'info',
          msg: `[${ecosystem.toUpperCase()}] Proposal indexed · ${shortId} · ${status}`,
        });
      }

      // 2. AVIP verification summary
      const total = await col.countDocuments({});
      const verified = await col.countDocuments({ status: 'VERIFIED' });
      const verificationRate = total > 0 ? Math.round((verified / total) * 100) : 0;

      events.push({
        ts: fmt(now),
        level: verificationRate >= 80 ? 'success' : verificationRate >= 50 ? 'warn' : 'info',
        msg: `AVIP pipeline · ${verified}/${total} milestones verified · ${verificationRate}% integrity`,
      });

      // 3. Ecosystem breakdown summary
      const ecoBreakdown = await col.aggregate([
        { $group: { _id: '$action.metadata.ecosystem', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      for (const eco of ecoBreakdown) {
        if (eco._id) {
          events.push({
            ts: fmt(now),
            level: 'info',
            msg: `[${String(eco._id).toUpperCase()}] ${eco.count} proposals indexed in Atlas`,
          });
        }
      }
    }

  } catch (err: any) {
    logger.error('Activity API: MongoDB error:', err.message);
    events.push({
      ts: fmt(now),
      level: 'error',
      msg: `MongoDB connection error: ${err.message.slice(0, 60)}`,
    });
  }

  // 4. System health snapshot (cosmetic on Vercel but meaningful locally)
  const freeMb = Math.round(os.freemem() / 1024 / 1024);
  const totalMb = Math.round(os.totalmem() / 1024 / 1024);
  const uptimeHr = Math.round(os.uptime() / 3600);
  const load = os.loadavg()[0].toFixed(2);

  events.push({
    ts: fmt(now),
    level: 'info',
    msg: `System · uptime ${uptimeHr}h · freemem ${freeMb}/${totalMb} MB · load ${load}`,
  });

  return NextResponse.json({ success: true, events, generatedAt: now.toISOString() });
}
