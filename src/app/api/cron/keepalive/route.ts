import { NextResponse } from 'next/server';
import { solanaIngestionService } from '@/lib/services/coordination/solana-ingestion.service';
import { logger } from '@/lib/utils/logger';

/**
 * Endpoint de Keep-Alive para el stream gRPC de Yellowstone.
 *
 * Vercel congela serverless functions tras inactividad.
 * Un cron job cada 5 minutos golpea este endpoint para:
 * 1. Mantener la funcion caliente
 * 2. Reconectar el stream gRPC si se corto
 *
 * Configurar en Vercel Dashboard:
 *   Cron Job: GET /api/cron/keepalive
 *   Schedule: every 5 minutes
 */
export async function GET() {
  try {
    const stats = solanaIngestionService.getStats();

    if (!stats.running) {
      logger.info('Keepalive: gRPC stream inactivo. Reiniciando...');
      await solanaIngestionService.start();
    }

    return NextResponse.json({
      status: 'ok',
      gRPC: stats.running ? 'connected' : 'reconnecting',
      processed: stats.processed,
      errors: stats.errors,
      timestamp: Date.now()
    });
  } catch (err: any) {
    logger.error('Keepalive error:', err.message);
    return NextResponse.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}
