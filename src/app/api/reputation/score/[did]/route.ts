import { NextRequest, NextResponse } from 'next/server';
import { ReputationEngineService } from '@/lib/services/reputation/reputation-engine.service';

const reputationEngine = new ReputationEngineService();
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
      message: 'API key required.',
      docs: 'https://andromeda-core.vercel.app/docs'
    }, { status: 401 });
  }

  const validation = await validateApiKey(apiKey, '/api/reputation/score');
  if (!validation.valid) {
    return NextResponse.json({ error: 'Forbidden', message: validation.error }, { status: 403 });
  }

  if (validation.plan === 'free') {
    return NextResponse.json({
      error: 'Plan upgrade required',
      message: 'Detailed score breakdown requires Pro or Enterprise plan.',
      upgrade: 'https://andromeda-core.vercel.app/docs#pricing'
    }, { status: 402 });
  }

  const { did: rawDid } = await params;
  const did = decodeURIComponent(rawDid);
  logger.info('Reputation score request', { did, client: validation.clientName, plan: validation.plan });

  try {
    await mongoDBClient.connect();
    const col = mongoDBClient.getMilestonesCollection();

    const milestones = await col.find({
      $or: [
        { 'action.metadata.builderDid': did },
        { 'action.metadata.authorAddress': did }
      ]
    }).sort({ _id: -1 }).toArray();

    if (milestones.length === 0) {
      return NextResponse.json({
        success: true,
        did,
        found: false,
        message: 'No verified activity found for this DID',
        reputation: null
      });
    }

    const total = milestones.length;
    const verified = milestones.filter((m: any) => m.status === 'VERIFIED').length;
    const pending = milestones.filter((m: any) => m.status === 'PENDING').length;
    const ecosystems = [...new Set(milestones.map((m: any) => m.action?.metadata?.ecosystem).filter(Boolean))] as string[];
    const verificationRate = Math.round((verified / total) * 100);

    // Desglose detallado del score AVIP
    // Calculate days since last activity for decay
    const lastActivityDate = milestones[0]?._id
      ? new Date((milestones[0]._id as any).getTimestamp())
      : new Date();
    const daysSinceLastActivity = Math.floor(
      (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Feed real data into the AVIP v2.0 engine
    // AVIP v2.0 input calibration
    // technical = verification quality (0-100)
    // governance = ecosystem breadth (0-100)  
    // community = activity volume normalized (0-100)
    const verificationQuality = Math.round((verified / Math.max(total, 1)) * 100);
    const ecosystemBreadth = Math.min(50 + ecosystems.length * 17, 100);
    const activityVolume = Math.min(60 + total * 5, 100); // base 50 + volume bonus

    const engineInput = {
      technical: verificationQuality,
      governance: ecosystemBreadth,
      community: activityVolume,
      verifiedCount: verified,
      totalMilestones: total,
      daysSinceLastActivity,
    };

    const avipResult = await reputationEngine.calculateScore(engineInput);
    const avipScore = Math.round(avipResult.total);

    const components = {
      verificationScore: {
        value: Math.round((verified / Math.max(total, 1)) * 70),
        max: 70,
        description: 'Based on verified vs total milestones (AVIP v2.0)',
        detail: `${verified}/${total} milestones verified`
      },
      ecosystemDiversity: {
        value: Math.min(ecosystems.length * 5, 20),
        max: 20,
        description: 'Multi-chain activity bonus',
        detail: `Active in ${ecosystems.length} ecosystem(s): ${ecosystems.join(', ')}`
      },
      volumeScore: {
        value: Math.min(Math.round(total * 0.5), 10),
        max: 10,
        description: 'Contribution volume bonus',
        detail: `${total} total contributions indexed`
      },
      behavioralConfidence: {
        value: Math.round(avipResult.behavioralConfidence * 100),
        max: 100,
        description: 'Shannon entropy anomaly detection',
        detail: `Confidence: ${(avipResult.behavioralConfidence * 100).toFixed(1)}% — isAnomaly: ${avipResult.isAnomaly}`
      },
      temporalDecay: {
        value: Math.round((1 - Math.min(daysSinceLastActivity / 365, 1)) * 100),
        max: 100,
        description: 'Asymmetric decay R(t) = R0 * exp(-λ * t)',
        detail: `${daysSinceLastActivity} days since last activity`
      }
    };

    // Timeline de actividad
    const timeline = milestones.slice(0, 10).map((m: any) => ({
      timestamp: m._id ? new Date((m._id as any).getTimestamp()).toISOString() : null,
      ecosystem: m.action?.metadata?.ecosystem || 'unknown',
      proposalId: m.action?.metadata?.proposalId?.slice(0, 20) + '...' || 'N/A',
      status: m.status,
      trustScore: m.metadata?.trustScore || null
    }));

    // Ecosistema breakdown
    const ecosystemBreakdown = ecosystems.reduce((acc: any, eco: string) => {
      const ecoMilestones = milestones.filter((m: any) => m.action?.metadata?.ecosystem === eco);
      const ecoVerified = ecoMilestones.filter((m: any) => m.status === 'VERIFIED').length;
      acc[eco] = {
        total: ecoMilestones.length,
        verified: ecoVerified,
        rate: Math.round((ecoVerified / ecoMilestones.length) * 100)
      };
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      did,
      found: true,
      reputation: {
        avipScore,
        trustLevel: getTrustLevel(avipScore),
        verificationRate,
        summary: {
          total,
          verified,
          pending,
          failed: total - verified - pending
        },
        components,
        ecosystems: ecosystemBreakdown,
        timeline,
        firstActivity: milestones[milestones.length - 1]?._id
          ? new Date((milestones[milestones.length - 1]._id as any).getTimestamp()).toISOString()
          : null,
        lastActivity: milestones[0]?._id
          ? new Date((milestones[0]._id as any).getTimestamp()).toISOString()
          : null,
        portable: true,
        standard: 'AVIP v2.0',
        verifiedBy: 'Andromeda Core Atlas Engine'
      },
      meta: {
        generatedAt: new Date().toISOString(),
        client: validation.clientName,
        plan: validation.plan,
        poweredBy: 'Andromeda Core AVIP v2.0',
        apiVersion: '1.0'
      }
    });

  } catch (err: any) {
    logger.error('Reputation score error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function getTrustLevel(score: number): string {
  if (score >= 90) return 'PLATINUM';
  if (score >= 75) return 'GOLD';
  if (score >= 50) return 'SILVER';
  if (score >= 25) return 'BRONZE';
  return 'UNVERIFIED';
}
