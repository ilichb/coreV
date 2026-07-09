/**
 * Middleware unificado — i18n (next-intl) + protección de rutas internas FES
 *
 * Estrategia de ejecución:
 * 1. Rutas internas (/api/fes/metrics, /internal/*):
 *    - En desarrollo: pasar siempre
 *    - En producción: requerir header X-Internal-Key
 * 2. Resto de rutas: delegado a next-intl para manejo de locale
 */

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const INTERNAL_PATHS = ['/api/fes/metrics', '/internal'];
const INTERNAL_KEY = process.env.FES_INTERNAL_KEY || '';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === 'development';

  // ── Protección de rutas internas FES ─────────────────────────────────────
  const needsProtection = INTERNAL_PATHS.some(p => pathname.startsWith(p));

  if (needsProtection) {
    if (isDev) return NextResponse.next();

    const key = request.headers.get('x-internal-key');
    if (INTERNAL_KEY && key === INTERNAL_KEY) return NextResponse.next();

    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized', message: 'Internal endpoint. Access restricted.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── i18n para el resto de rutas ───────────────────────────────────────────
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Rutas internas protegidas
    '/api/fes/metrics',
    '/internal/:path*',
    // Rutas i18n: todo excepto api, _next, archivos estáticos
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
