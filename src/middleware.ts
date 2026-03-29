import createMiddleware from 'next-intl/middleware';
import {locales, defaultLocale} from './i18n/locales';

export default createMiddleware({
  // A list of all locales that are supported
  locales,
  
  // Used when no locale matches
  defaultLocale,
  
  // Locale detection configuration - ENABLED to detect browser language
  localeDetection: true,
  
  // Always include locale prefix to avoid hydration mismatches
  localePrefix: 'always'
});

export const config = {
  // Match all pathnames except API routes, static files, etc.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
