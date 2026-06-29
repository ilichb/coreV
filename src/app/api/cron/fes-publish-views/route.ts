/**
 * GET /api/cron/fes-publish-views
 *
 * Cron diario que publica el resumen de vistas del día anterior a IPFS.
 * Ejecutar una vez al día (ej: 00:30 UTC).
 *
 * Protegido por CRON_SECRET.
 *
 * Response:
 * {
 *   published: boolean,
 *   date: string,
 *   cid?: string,
 *   url?: string,
 *   totalViews?: number,
 *   message: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { fesViewLogger } from '@/lib/services/rootstock/fes-view-logger.service';

export async function GET(request: NextRequest) {
    // Verificar CRON_SECRET
    const authHeader = request.headers.get('authorization') || '';
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Publicar resumen del día anterior
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        const result = await fesViewLogger.publishDailyReportToIPFS(dateStr);

        if (!result) {
            return NextResponse.json({
                published: false,
                date: dateStr,
                message: `No views found for ${dateStr}, nothing to publish.`,
            });
        }

        return NextResponse.json({
            published: true,
            date: dateStr,
            cid: result.cid,
            url: result.url,
            message: `Daily view report for ${dateStr} published to IPFS.`,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to publish daily report', detail: error.message },
            { status: 500 }
        );
    }
}
