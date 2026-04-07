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

// No exportamos config.matcher para que el middleware se ejecute en todas las rutas
// y la exclusión de /api se maneje internamente.
