import {getRequestConfig} from 'next-intl/server';
import {locales, defaultLocale} from './locales';

export default getRequestConfig(async ({locale}) => {
  // Ensure that the incoming `locale` parameter is valid
  const validatedLocale = locale || defaultLocale;
  
  if (!locales.includes(validatedLocale as any)) {
    // This will trigger the not-found page
    throw new Error(`Invalid locale: ${locale}`);
  }

  return {
    messages: (await import(`../locales/${validatedLocale}.json`)).default,
    timeZone: 'America/Caracas',
    locale: validatedLocale
  };
});
