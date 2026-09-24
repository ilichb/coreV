/**
 * Middleware unificado — i18n (next-intl) + protección de rutas internas FES
 *
 * Estrategia de ejecución:
 * 1. Rutas internas:
 *    - Páginas (/internal/*, /:locale/internal/*): requieren cookie de sesión
 *      (obtenida vía POST /api/internal/login con FES_ADMIN_PASSWORD).
 *      Sin cookie → redirect a /<locale>/internal/login.
 *    - API datos (/api/fes/metrics): acepta cookie de sesión O header
 *      X-Internal-Key (para crons/scripts). Sin ninguno → 401.
 *    - Login/logout siempre públicos.
 *    - En desarrollo: pasar siempre (sin fricción local).
 * 2. Resto de rutas: delegado a next-intl para manejo de locale
 */

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { FES_AUTH_COOKIE, expectedToken } from '@/lib/auth/fes-admin';

const intlMiddleware = createMiddleware(routing);

const LOCALES = ['en', 'es', 'pt'] as const;
const DEFAULT_LOCALE = 'es';
const INTERNAL_KEY = process.env.FES_INTERNAL_KEY || '';

function stripLocale(pathname: string): { locale: string; rest: string } {
  const seg = pathname.split('/').filter(Boolean);
  if (seg.length > 0 && (LOCALES as readonly string[]).includes(seg[0])) {
    return { locale: seg[0], rest: '/' + seg.slice(1).join('/') };
  }
  return { locale: DEFAULT_LOCALE, rest: pathname };
}

async function hasValidCookie(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(FES_AUTH_COOKIE)?.value;
  const pwd = process.env.FES_ADMIN_PASSWORD;
  if (!token || !pwd) return false;
  try {
    return token === (await expectedToken(pwd));
  } catch {
    return false;
  }
}

function hasValidInternalKey(request: NextRequest): boolean {
  if (!INTERNAL_KEY) return false;
  return request.headers.get('x-internal-key') === INTERNAL_KEY;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === 'development';
  const { locale, rest } = stripLocale(pathname);

  const isLoginPage = rest === '/internal/login' || rest.startsWith('/internal/login/');
  const isLoginApi =
    pathname === '/api/internal/login' || pathname === '/api/internal/logout';
  const isMetricsApi = pathname === '/api/fes/metrics';
  const isInternalPage =
    rest === '/internal' || rest.startsWith('/internal/');

  // ── Rutas públicas de login: nunca bloquear ──────────────────────────────
  if (isLoginPage || isLoginApi) {
    // Páginas de login pasan por i18n; APIs pasan directo
    if (pathname.startsWith('/api/')) return NextResponse.next();
    return intlMiddleware(request);
  }

  // ── API de métricas: cookie de sesión O X-Internal-Key ───────────────────
  if (isMetricsApi) {
    if (isDev) return NextResponse.next();
    if ((await hasValidCookie(request)) || hasValidInternalKey(request)) {
      return NextResponse.next();
    }
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized', message: 'Internal endpoint. Access restricted.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── Páginas internas: requieren cookie → si no, redirect a login ────────
  if (isInternalPage) {
    if (isDev) return intlMiddleware(request);
    if (await hasValidCookie(request)) return intlMiddleware(request);

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/internal/login`;
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  // ── i18n para el resto de rutas ───────────────────────────────────────────
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // APIs internas
    '/api/internal/:path*',
    '/api/fes/metrics',
    // Páginas internas (con y sin prefijo de locale)
    '/internal/:path*',
    '/en/internal/:path*',
    '/es/internal/:path*',
    '/pt/internal/:path*',
    // Rutas i18n: todo excepto api, _next, archivos estáticos
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
