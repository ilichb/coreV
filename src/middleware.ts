import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/locales';
import { NextRequest, NextResponse } from 'next/server';

// Middleware personalizado que excluye explícitamente las rutas de API
export function middleware(request: NextRequest) {
  // Si la ruta empieza con /api, no aplicar i18n
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // Para el resto, usar el middleware de next-intl
  const handleI18n = createMiddleware({
    locales,
    defaultLocale,
    localeDetection: true,
    localePrefix: 'always'
  });
  
  return handleI18n(request);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*|favicon\\.ico).*)']
};
