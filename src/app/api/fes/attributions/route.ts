/**
 * GET /api/fes/attributions
 *
 * Endpoint interno (protegido por middleware) que devuelve
 * las atribuciones de stake detectadas por el monitor.
 *
 * Query params:
 *   ?summary=true  → solo el resumen agregado
 *   ?limit=50      → número de atribuciones a devolver (default 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fesAttributionMonitor } from '@/lib/services/rootstock/fes-attribution-monitor.service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const summaryOnly = searchParams.get('summary') === 'true';
        const limit = parseInt(searchParams.get('limit') || '100', 10);

        if (summaryOnly) {
            const summary = await fesAttributionMonitor.getSummary();
            return NextResponse.json({ summary });
        }

        const [attributions, summary] = await Promise.all([
            fesAttributionMonitor.getAttributions(limit),
            fesAttributionMonitor.getSummary(),
        ]);

        return NextResponse.json({
            attributions,
            summary,
            count: attributions.length,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to get attributions', detail: error.message },
            { status: 500 }
        );
    }
}
