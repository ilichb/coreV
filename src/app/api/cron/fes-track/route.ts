/**
 * GET /api/cron/fes-track
 *
 * Cron endpoint para ejecutar el tracking de reactivación periódicamente.
 * Diseñado para Vercel Cron Jobs o cualquier scheduler externo.
 *
 * Ejecuta POST /api/fes/track internamente para todos los participantes.
 *
 * Protegido por CRON_SECRET para evitar ejecución no autorizada.
 */

import { NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
    // Verificar autorización
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');

    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        // Llamar al endpoint de tracking internamente
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        const trackResponse = await fetch(`${baseUrl}/api/fes/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-key': process.env.FES_INTERNAL_KEY || 'dev-key-do-not-use-in-production',
            },
            body: JSON.stringify({ all: true }),
        });

        const result = await trackResponse.json();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            trackingResult: result,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Cron execution failed', detail: error.message },
            { status: 500 }
        );
    }
}
