import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'es', 'pt'],
  defaultLocale: 'es',
  localePrefix: 'always',
  localeDetection: true  // Aseguramos detección
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
