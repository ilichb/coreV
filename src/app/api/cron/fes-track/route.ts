/**
 * GET /api/cron/fes-track
 *
 * Cron diario del piloto FES. Ejecuta en proceso (sin HTTP intermedio):
 *   1. Atribución on-chain: escanea stakes/unstakes de la cohorte congelada
 *      (fes-attribution-monitor) y registra las atribuciones.
 *   2. Tracker de reactivación por wallet (subgraph), para el contralibre
 *      del dashboard.
 *
 * Antes hacía un fetch POST a /api/fes/track con un fallback
 * `dev-key-do-not-use-in-production`: si FES_INTERNAL_KEY no estaba seteada,
 * el cron llamaba a un endpoint con una clave inventada y en producción eso
 * terminaba en 401 o, peor, autorizaba con la clave de desarrollo. Llamar los
 * servicios directamente elimina esa cadena.
 *
 * Fail-closed: sin CRON_SECRET el endpoint se niega a ejecutarse. Un cron
 * abierto al público permitiría a cualquiera disparar escaneos y escribir
 * en la base del piloto.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fesAttributionMonitor } from '@/lib/services/rootstock/fes-attribution-monitor.service';
import { reactivationTracker } from '@/lib/services/rootstock/reactivation-tracker.service';
import { logger } from '@/lib/utils/logger';

// El escaneo pasa por Blockscout + RPC por wallet; 120s alcanzan holgadamente.
export const maxDuration = 120;

export async function GET(request: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        logger.error('[FES cron] CRON_SECRET no configurado: el cron queda deshabilitado (fail-closed)');
        return NextResponse.json(
            {
                error: 'CRON_SECRET not configured',
                message: 'Set CRON_SECRET in the deployment environment to enable this cron.',
            },
            { status: 500 }
        );
    }

    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');

    if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Atribución on-chain. Si falla la lectura de la cadena, se
        //    propaga y el cron reporta error: no se avanza el cursor y no se
        //    confunde "no pude leer" con "no pasó nada".
        const attribution = await fesAttributionMonitor.runCheck();

        // 2. Tracker de reactivación (contralibre del dashboard).
        const trackerResults = await reactivationTracker.checkAll();
        const trackerErrors = trackerResults.filter(r => r.error);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            attribution,
            tracker: {
                checked: trackerResults.length,
                reactivated: trackerResults.filter(r => r.reactivated).length,
                errors: trackerErrors.map(e => ({ wallet: e.wallet, error: e.error })),
            },
        });
    } catch (error: any) {
        logger.error('[FES cron] execution failed', error);
        return NextResponse.json(
            { success: false, error: 'Cron execution failed', detail: error.message },
            { status: 500 }
        );
    }
}
