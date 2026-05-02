import { NextResponse } from 'next/server';
import { mongoDBClient } from '@/lib/infrastructure/mongodb';
import { reputationEngineService } from '@/lib/services/reputation/reputation-engine.service';

export async function POST() {
  try {
    await mongoDBClient.connect();
    const col = mongoDBClient.getMilestonesCollection();

    // Encontrar todos los milestones de Solana sin trustScore
    const docs = await col.find({
      'action.tags': 'solana',
      $or: [
        { 'metadata.trustScore': { $exists: false } },
        { 'metadata.trustScore': 0 },
        { 'metadata.trustScore': null }
      ]
    }).toArray();

    console.log(`Found ${docs.length} Solana milestones without scores`);
    let updated = 0;

    for (const doc of docs) {
      const desc = doc.action?.description || '';
      const tags = doc.action?.tags || [];
      const descLen = desc.length;

      const techScore = Math.min(100, Math.round(Math.min(descLen / 30, 40) + 50));
      const govScore  = Math.min(100, 70 + (tags.includes('governance') ? 15 : 0));
      const commScore = Math.min(100, 50 + tags.filter((t: string) =>
        ['community','social','education','grant','dao','governance','delegate'].includes(t)).length * 8);

      const avipScore = await reputationEngineService.calculateScore({
        technical: techScore,
        governance: govScore,
        community: commScore,
        verifiedCount: 1,
        totalMilestones: 1
      });

      await col.updateOne(
        { atlasId: doc.atlasId },
        { $set: {
          'metadata.avipScore': avipScore,
          'metadata.trustScore': avipScore.total,
          status: 'VERIFIED',
          _mongoUpdatedAt: new Date()
        }}
      );
      updated++;
    }

    return NextResponse.json({ success: true, found: docs.length, updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
