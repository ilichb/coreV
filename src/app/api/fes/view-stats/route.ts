/**
 * GET /api/fes/view-stats
 *
 * Endpoint interno (protegido por middleware) que devuelve
 * estadísticas agregadas del view logger (MongoDB + IPFS).
 *
 * Response:
 * {
 *   totalViews: number,
 *   uniqueWallets: number,
 *   viewsByCohort: { A: number, B: number, VIP: number },
 *   viewsByDate: { "2026-06-29": number, ... },
 *   lastPublishedReport: string | null,
 *   publishedReports: Array<{ date, cid, url, totalViews }>
 * }
 */

import { NextResponse } from 'next/server';
import { fesViewLogger } from '@/lib/services/rootstock/fes-view-logger.service';

export async function GET() {
    try {
        const [stats, reports] = await Promise.all([
            fesViewLogger.getAggregatedStats(),
            fesViewLogger.getPublishedReports(30),
        ]);

        return NextResponse.json({
            ...stats,
            publishedReports: reports,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to get view stats', detail: error.message },
            { status: 500 }
        );
    }
}
