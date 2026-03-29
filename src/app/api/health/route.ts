import { NextResponse } from 'next/server';
import { logger } from '../../../lib/utils/logger';
import { mongoDBClient } from '../../../lib/infrastructure/mongodb';
import { redisService } from '../../../lib/services/coordination/redis';

async function checkDatabase() {
  try {
    const result = await mongoDBClient.healthCheck();
    return {
      status: result.connected ? 'healthy' : 'unhealthy',
      latency: result.latency,
      error: result.error,
    };
  } catch (error) {
    return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown' };
  }
}

async function checkRedis() {
  try {
    const ok = await redisService.healthCheck();
    return { status: ok ? 'healthy' : 'unhealthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown' };
  }
}

export async function GET() {
  try {
    const [database, redis] = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
    ]);

    const db = database.status === 'fulfilled' ? database.value : { status: 'unhealthy', error: 'Check failed' };
    const rd = redis.status === 'fulfilled' ? redis.value : { status: 'unhealthy', error: 'Check failed' };

    const allHealthy = db.status === 'healthy' && rd.status === 'healthy';

    const response = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
      },
      services: { database: db, redis: rd },
    };

    logger.info('Health check', { status: response.status });
    return NextResponse.json(response, { status: allHealthy ? 200 : 207 });

  } catch (error) {
    logger.error('Health check failed', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}
