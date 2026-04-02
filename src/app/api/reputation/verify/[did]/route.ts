import { NextRequest, NextResponse } from 'next/server';
import { mongoDBClient } from '@/lib/infrastructure/mongodb';
import { validateApiKey } from '@/lib/services/api-keys/api-key.service';
import { logger } from '@/lib/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ did: string }> }
) {
  const apiKey = request.headers.get('x-api-key') || 
                 request.nextUrl.searchParams.get('api_key');

  if (!apiKey) {
    return NextResponse.json({
      error: 'Unauthorized',
      message: 'API key required. Include x-api-key header or api_key query parameter.',
      docs: 'https://andromeda-core.vercel.app/docs'
    }, { status: 401 });
  }

  const validation = await validateApiKey(apiKey, '/api/reputation/verify');
  if (!validation.valid) {
    return NextResponse.json({
      error: 'Forbidden',
      message: validation.error
    }, { status: 403 });
  }

  const { did: rawDid } = await params;
  const did = decodeURIComponent(rawDid);
  logger.info('Reputation verify request', { did, client: validation.clientName });

  try {
    await mongoDBClient.connect();
    const col = mongoDBClient.getMilestonesCollection();

    const milestones = await col.find({
      $or: [
        { 'action.metadata.builderDid': did },
        { 'action.metadata.authorAddress': did }
      ]
    }).toArray();

    const total = milestones.length;
    const verified = milestones.filter((m: any) => m.status === 'VERIFIED').length;
    const ecosystems = [...new Set(milestones.map((m: any) => m.action?.metadata?.ecosystem).filter(Boolean))];
    const verificationRate = total > 0 ? Math.round((verified / total) * 100) : 0;
    const avipScore = calculateAvipScore(verified, total, ecosystems.length);

    return NextResponse.json({
      success: true,
      did,
      reputation: {
        avipScore,
        verificationRate,
        totalMilestones: total,
        verifiedMilestones: verified,
        ecosystems,
        trustLevel: getTrustLevel(avipScore),
        lastVerified: milestones[0]?._id
          ? new Date((milestones[0]._id as any).getTimestamp()).toISOString()
          : null,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        client: validation.clientName,
        plan: validation.plan,
        poweredBy: 'Andromeda Core AVIP v2.0'
      }
    });
  } catch (err: any) {
    logger.error('Reputation verify error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function calculateAvipScore(verified: number, total: number, ecosystems: number): number {
  if (total === 0) return 0;
  const baseScore = (verified / total) * 70;
  const ecosystemBonus = Math.min(ecosystems * 5, 20);
  const volumeBonus = Math.min(total * 0.5, 10);
  return Math.round(baseScore + ecosystemBonus + volumeBonus);
}

function getTrustLevel(score: number): string {
  if (score >= 90) return 'PLATINUM';
  if (score >= 75) return 'GOLD';
  if (score >= 50) return 'SILVER';
  if (score >= 25) return 'BRONZE';
  return 'UNVERIFIED';
}
