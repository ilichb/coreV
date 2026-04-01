import { NextRequest, NextResponse } from 'next/server';
import { ecosystemIngestionService } from '@/lib/services/coordination/connectors/ecosystem-ingestion.service';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/cron/sync-ecosystems
 *
 * Vercel Cron Job — corre diariamente a las 06:00 UTC (Hobby plan: 1 invocación/día).
 * Sincroniza todos los ecosistemas configurados directamente en la función serverless,
 * sin depender de BullMQ ni workers externos.
 *
 * Protegido con CRON_SECRET para evitar invocaciones no autorizadas.
 */
export const maxDuration = 60; // Vercel Pro permite hasta 300s; Hobby: 60s

export async function GET(request: NextRequest) {
  // Seguridad: verificar el header que Vercel envía automáticamente
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Cron sync: unauthorized request rejected');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, any> = {};

  logger.info('Cron sync-ecosystems: starting daily sync...');

  try {
    const ecosystems = ecosystemIngestionService.getAvailableEcosystems();

    // Sincronizar cada ecosistema secuencialmente para no sobrecargar las APIs externas
    for (const ecosystem of ecosystems) {
      try {
        logger.info(`Cron: syncing ${ecosystem}...`);
        const result = await ecosystemIngestionService.syncEcosystem(ecosystem);
        results[ecosystem] = {
          success: true,
          decisions: result?.decisions ?? 0,
          registered: result?.registered ?? 0,
          anchored: result?.anchored ?? 0,
        };
        logger.info(`Cron: ${ecosystem} synced — ${result?.decisions ?? 0} decisions`);
      } catch (err: any) {
        logger.error(`Cron: ${ecosystem} sync failed:`, err.message);
        results[ecosystem] = { success: false, error: err.message };
      }
    }

    const elapsed = Date.now() - startTime;
    const totalSynced = Object.values(results).reduce(
      (sum: number, r: any) => sum + (r.decisions || 0), 0
    );

    logger.info(`Cron sync completed in ${elapsed}ms. Total synced: ${totalSynced}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      elapsed_ms: elapsed,
      total_synced: totalSynced,
      results,
    });

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    logger.error('Cron sync-ecosystems fatal error:', error.message);
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        elapsed_ms: elapsed,
        error: error.message,
        results,
      },
      { status: 500 }
    );
  }
}
