import { NextResponse } from 'next/server';
import { syncQueueService } from '@/lib/services/coordination/connectors/sync-queue.service';
import { varaBatchAdapter } from '@/lib/services/coordination/vara-adapter';
import os from 'os';
import { logger } from '../../../../lib/utils/logger';

export async function GET() {
    try {
        const queueStats = await syncQueueService.getQueueStats();
        const varaBatchStats = varaBatchAdapter.getBatchStats();
        const varaStatus = varaBatchAdapter.getStatus();

        const monitoringData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                redis: {
                    status: 'connected',
                    queue: queueStats
                },
                vara: {
                    status: varaStatus.initialized ? 'connected' : 'idle',
                    pending_batches: varaBatchStats,
                    config: {
                        enabled: varaStatus.enabled,
                        contract: varaStatus.contractAddress
                    }
                }
            },
            system: {
                load: os.loadavg(),
                free_mem: Math.round(os.freemem() / 1024 / 1024) + ' MB',
                total_mem: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
                uptime: Math.round(os.uptime() / 3600) + ' hours'
            }
        };

        return NextResponse.json(monitoringData);
    } catch (error: any) {
        logger.error('Monitoring API Error:', error);
        return NextResponse.json({
            status: 'unhealthy',
            error: error.message
        }, { status: 500 });
    }
}
