import {getRequestConfig} from 'next-intl/server';
import {locales, defaultLocale} from './locales';

export default getRequestConfig(async ({locale}) => {
  // Si el locale es un archivo estático o inválido, usamos el default
  const validatedLocale = locales.includes(locale as any) 
    ? locale 
    : defaultLocale;

  return {
    messages: (await import(`../locales/${validatedLocale}.json`)).default,
    timeZone: 'America/Caracas',
    locale: validatedLocale
  };
});
