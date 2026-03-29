export const locales = ['es', 'en', 'pt'] as const;
export const defaultLocale: typeof locales[number] = 'es';

export type Locale = typeof locales[number];