import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/locales';
import { NextRequest, NextResponse } from 'next/server';

const handleI18n = createMiddleware({
  locales,
  defaultLocale,
  localeDetection: false,
  localePrefix: 'as-needed'
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass total para API
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 2. Bypass para archivos estáticos comunes y de sistema
  const isStaticFile = /\.(.*)$/.test(pathname);
  if (isStaticFile || pathname.startsWith('/_next') || pathname.startsWith('/_vercel')) {
    return NextResponse.next();
  }

  return handleI18n(request);
}

export const config = {
  // Matcher que excluye explícitamente lo que NO queremos procesar
  matcher: ['/((?!api|_next|_vercel|favicon\.ico|apple-icon\.png|sitemap\.xml|robots\.txt).*)']
};
