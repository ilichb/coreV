import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/locales';
import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
  // Excluir rutas de API explícitamente
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

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
