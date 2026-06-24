/**
 * Middleware de protección para rutas internas del FES Pilot.
 *
 * Protege:
 * - /api/fes/metrics — Solo accesible desde entorno de desarrollo o con header interno
 * - /internal/* — Solo accesible desde entorno de desarrollo
 *
 * Estrategia:
 * - En desarrollo (NODE_ENV=development): permitir todo
 * - En producción: requerir header X-Internal-Key o bloquear
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const INTERNAL_PATHS = ['/api/fes/metrics', '/internal'];
const INTERNAL_KEY = process.env.FES_INTERNAL_KEY || 'dev-key-do-not-use-in-production';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isDev = process.env.NODE_ENV === 'development';

    // Verificar si la ruta necesita protección
    const needsProtection = INTERNAL_PATHS.some(path => pathname.startsWith(path));

    if (!needsProtection) {
        return NextResponse.next();
    }

    // En desarrollo, permitir todo
    if (isDev) {
        return NextResponse.next();
    }

    // En producción, verificar header interno
    const internalKey = request.headers.get('x-internal-key');
    if (internalKey === INTERNAL_KEY) {
        return NextResponse.next();
    }

    // Bloquear acceso
    return new NextResponse(
        JSON.stringify({
            error: 'Unauthorized',
            message: 'This endpoint is internal. Access restricted.',
        }),
        {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

export const config = {
    matcher: [
        '/api/fes/metrics',
        '/internal/:path*',
    ],
};
