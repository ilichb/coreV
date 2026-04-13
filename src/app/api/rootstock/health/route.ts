import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/services/coordination/redis';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      graphApiKeyPresent: !!process.env.THEGRAPH_API_KEY,
      redisUrlPresent: !!process.env.REDIS_URL,
      nodeVersion: process.version,
    },
    services: {
      redis: 'unknown',
      subgraph: 'unknown',
      collectiveApi: 'unknown'
    }
  };

  try {
    // 1. Check Redis
    const redisAlive = await redisService.healthCheck();
    diagnostics.services.redis = redisAlive ? 'UP' : 'DOWN';
    if (!redisAlive) diagnostics.status = 'degraded';

    // 2. Check Governance Subgraph (Connectivity test)
    if (process.env.THEGRAPH_API_KEY) {
      const subgraphUrl = `https://gateway.thegraph.com/api/${process.env.THEGRAPH_API_KEY}/subgraphs/id/C9muK2hesS2V8ZpcR755wVfo9UUhfWSXaDhDKMkCNejP`;
      try {
        const start = Date.now();
        const res = await fetch(subgraphUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ _meta { block { number } } }' }),
          // Short timeout for health check
          signal: AbortSignal.timeout(3000)
        });
        const latency = Date.now() - start;
        diagnostics.services.subgraph = res.ok ? `UP (${latency}ms)` : `DOWN (${res.status})`;
        if (!res.ok) diagnostics.status = 'degraded';
      } catch (e) {
        diagnostics.services.subgraph = 'DOWN (Timeout/Refused)';
        diagnostics.status = 'degraded';
      }
    } else {
      diagnostics.services.subgraph = 'DISABLED (Missing API Key)';
      diagnostics.status = 'degraded';
    }

    // 3. Check Collective API
    try {
      const res = await fetch('https://app.rootstockcollective.xyz/api/builders', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      });
      diagnostics.services.collectiveApi = res.ok ? 'UP' : `DEGRADED (${res.status})`;
    } catch (e) {
      diagnostics.services.collectiveApi = 'DOWN';
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    logger.error('Health Check failed:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: error.message,
      timestamp: diagnostics.timestamp 
    }, { status: 500 });
  }
}
