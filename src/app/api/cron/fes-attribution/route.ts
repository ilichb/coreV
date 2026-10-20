/**
 * GET /api/cron/fes-attribution
 *
 * Disparador del monitor de atribución FUERA del cron diario.
 *
 * El escaneo diario corre dentro de /api/cron/fes-track (en Vercel Hobby
 * solo caben 2 crons programados y ya están sync-ecosystems + fes-track).
 * Este endpoint queda como gatillo manual para cuando se necesite una
 * re-lectura inmediata de la cadena (p. ej. después de un fallo de Blockscout
 * o para verificar una atribución puntual).
 *
 * Fail-closed: sin CRON_SECRET configurado se niega a ejecutarse. La versión
 * anterior solo exigía el header si la variable existía, así que con el
 * entorno mal configurado cualquier visitante podía disparar el escaneo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fesAttributionMonitor } from '@/lib/services/rootstock/fes-attribution-monitor.service';

export const maxDuration = 120;

export async function GET(request: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json(
            {
                error: 'CRON_SECRET not configured',
                message: 'Set CRON_SECRET in the deployment environment to enable this endpoint.',
            },
            { status: 500 }
        );
    }

    const authHeader = request.headers.get('authorization') || '';
    const querySecret = request.nextUrl.searchParams.get('secret');

    if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await fesAttributionMonitor.runCheck();

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Attribution check failed', detail: error.message },
            { status: 500 }
        );
    }
}
