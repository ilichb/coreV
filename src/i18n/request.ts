import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './locales';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  
  // Si el locale no es válido, usar el predeterminado en lugar de lanzar error
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
    timeZone: 'America/Caracas'
  };
});
