/**
 * Middleware unificado — i18n (next-intl) + protección de rutas internas FES
 *
 * Estrategia de ejecución:
 * 1. APIs internas (/api/fes/*, excepto check-wallet y dashboard-login) → header X-Internal-Key
 * 2. Dashboard interno (/internal/fes, excepto login) → cookie fes_dashboard_session
 * 3. Resto de rutas → delegado a next-intl para manejo de locale
 *
 * Las rutas con locale (/en/... /es/... /pt/...) se normalizan quitando el prefijo
 * antes de aplicar las reglas de protección.
 */

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const INTERNAL_KEY = process.env.FES_INTERNAL_KEY || '';
const LOCALES = routing.locales; // ['en', 'es', 'pt']

function stripLocale(pathname: string): string {
  for (const locale of LOCALES) {
    const prefix = `/${locale}`;
    if (pathname === prefix) return '/';
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || '/';
    }
  }
  return pathname;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === 'development';

  // ── Normalizar ruta quitando locale ──────────────────────────────────────
  const cleanPath = stripLocale(pathname);
  const localePrefix = LOCALES.find(l => pathname.startsWith(`/${l}/`)) || 'es';

  // ── En desarrollo, siempre pasar ──────────────────────────────────────────
  if (isDev) return intlMiddleware(request);

  // ── 1. APIs internas protegidas con X-Internal-Key ───────────────────────
  //    /api/fes/* excepto check-wallet y dashboard-login
  if (cleanPath.startsWith('/api/fes/')) {
    const isPublic = cleanPath.includes('/check-wallet') || cleanPath.includes('/dashboard-login');
    if (!isPublic) {
      const key = request.headers.get('x-internal-key');
      const hasValidKey = INTERNAL_KEY && key === INTERNAL_KEY;

      // El dashboard logueado (cookie de sesion) tambien puede llamar estas APIs,
      // sin necesidad de exponer X-Internal-Key al frontend.
      const sessionCookie = request.cookies.get('fes_dashboard_session');
      const hasValidSession = !!sessionCookie?.value;

      if (!hasValidKey && !hasValidSession) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized', message: 'Internal endpoint. Access restricted.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    // Las APIs no pasan por intlMiddleware (evita redirect con locale)
    return NextResponse.next();
  }

  // ── Para otras APIs: no pasar por intlMiddleware ──────────────────────────
  if (cleanPath.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ── 2. Página de login del dashboard → permitir acceso público ───────────
  if (cleanPath.startsWith('/internal/fes/login')) {
    return intlMiddleware(request);
  }

  // ── 3. Dashboard interno → verificar cookie fes_dashboard_session ─────────
  if (cleanPath.startsWith('/internal/fes')) {
    const sessionCookie = request.cookies.get('fes_dashboard_session');
    if (!sessionCookie?.value) {
      const loginUrl = new URL(`/${localePrefix}/internal/fes/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
    return intlMiddleware(request);
  }

  // ── 4. Resto: i18n ────────────────────────────────────────────────────────
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Rutas API de FES
    '/api/fes/:path*',
    // Dashboard interno
    '/internal/:path*',
    // Rutas i18n: todo excepto api, _next, _vercel, archivos estáticos
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};