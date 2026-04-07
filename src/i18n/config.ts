import {getRequestConfig} from 'next-intl/server';
import {locales, defaultLocale} from './locales';

export default getRequestConfig(async ({locale}) => {
  // Validamos el locale y aseguramos que TypeScript lo vea como string no-nula
  const currentLocale = locale && locales.includes(locale as any) 
    ? locale 
    : defaultLocale;

  return {
    messages: (await import(`../locales/${currentLocale}.json`)).default,
    timeZone: 'America/Caracas',
    locale: currentLocale as string
  };
});
