/**
 * GET /api/cron/fes-attribution
 *
 * Cron horario que ejecuta el monitor de atribución:
 * 1. Consulta eventos Staked en el contrato de staking de Rootstock
 * 2. Cruza con walletHash que vieron /preview
 * 3. Registra nuevas atribuciones
 *
 * Protegido por CRON_SECRET.
 * Schedule: cada hora (configurado en vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fesAttributionMonitor } from '@/lib/services/rootstock/fes-attribution-monitor.service';

export async function GET(request: NextRequest) {
    // Verificar CRON_SECRET
    const authHeader = request.headers.get('authorization') || '';
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await fesAttributionMonitor.runCheck();

        return NextResponse.json({
            success: true,
            newAttributions: result.newAttributions,
            totalAttributions: result.totalAttributions,
            summary: result.summary,
            checkedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Attribution check failed', detail: error.message },
            { status: 500 }
        );
    }
}
