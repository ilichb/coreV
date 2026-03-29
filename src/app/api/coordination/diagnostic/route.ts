import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { redisService } from '../../../../lib/services/coordination/redis-upstash';
import { logger } from '../../../../lib/utils/logger';

// Cache for diagnostic results (30s)
let cachedHealth: { status: string; data: any; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000;

export async function GET(request: NextRequest) {
  const now = Date.now();

  if (cachedHealth && (now - cachedHealth.timestamp < CACHE_TTL)) {
    logger.debug('Returning cached diagnostic data');
    return NextResponse.json(cachedHealth.data);
  }

  try {
    logger.info('Performing fresh diagnostic health check');
    const { error: supabaseError } = await supabase.from('scorecards').select('id').limit(1);
    const redisHealthy = await redisService.healthCheck();

    const result = {
      status: (supabaseError || !redisHealthy) ? 'warning' : 'ok',
      timestamp: new Date().toISOString(),
      services: {
        supabase: supabaseError ? { status: 'error', message: supabaseError.message } : { status: 'ok' },
        redis: { status: redisHealthy ? 'ok' : 'error' }
      }
    };

    cachedHealth = { status: result.status, data: result, timestamp: now };
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Diagnostic API Error', { error: error.message });
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
