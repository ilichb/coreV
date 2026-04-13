import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/coordination/redis';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: false,
      thegraph: false,
      apiKey: false,
    },
  };

  try {
    // Verificar Redis
    await redisService.set('health-test', 'ok', 10);
    const redisCheck = await redisService.get('health-test');
    health.services.redis = redisCheck === 'ok';
  } catch (err) {
    health.services.redis = false;
  }

  // Verificar API Key de The Graph
  const apiKey = process.env.THEGRAPH_API_KEY;
  health.services.apiKey = !!apiKey;

  // Verificar subgraph (opcional)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://gateway.thegraph.com/api', { signal: controller.signal });
    clearTimeout(timeout);
    health.services.thegraph = res.ok;
  } catch {
    health.services.thegraph = false;
  }

  const statusCode = health.services.redis && health.services.apiKey ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
