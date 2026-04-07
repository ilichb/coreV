import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/locales';
import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
  // Log para verificar que el middleware se ejecuta
  console.log(`Middleware ejecutado para: ${request.nextUrl.pathname}`);
  
  if (request.nextUrl.pathname.startsWith('/api')) {
    console.log('Ruta API, pasando sin i18n');
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
