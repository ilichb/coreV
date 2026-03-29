import { NextRequest, NextResponse } from 'next/server';
import { syncQueueService } from '@/lib/services/coordination/connectors/sync-queue.service';
import { logger } from '../../../../lib/utils/logger';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'queue-stats') {
    const stats = await syncQueueService.getQueueStats();
    return NextResponse.json(stats);
  }

  if (action === 'status') {
    const jobId = searchParams.get('jobId');
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    const status = await syncQueueService.getJobStatus(jobId);
    return NextResponse.json(status);
  }

  return NextResponse.json({
    message: 'Andromeda Cross-DAO Sync API',
    status: 'operational',
    availableActions: ['trigger-full', 'trigger-ecosystem', 'status', 'queue-stats']
  });
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const ecosystem = searchParams.get('ecosystem');

  try {
    // Initialize the service if not already initialized
    await syncQueueService.initialize().catch(err => {
      logger.warn('Sync queue initialization warning:', err.message);
    });

    if (action === 'trigger-full') {
      const jobId = await syncQueueService.triggerFullSync();
      return NextResponse.json({
        success: true,
        message: 'Full sync triggered via BullMQ',
        jobId
      });
    }

    if (action === 'trigger-ecosystem' && ecosystem) {
      const jobId = await syncQueueService.triggerEcosystemSync(ecosystem);
      return NextResponse.json({
        success: true,
        message: `Sync triggered for ${ecosystem} via BullMQ`,
        jobId,
        ecosystem
      });
    }

    return NextResponse.json({
      error: 'Invalid action or parameters'
    }, { status: 400 });

  } catch (error: any) {
    logger.error('Sync API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
