'use client';
import { usePathname, useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const languages = { es: 'ES', en: 'EN', pt: 'PT' };
  const languageNames = { es: 'Español', en: 'English', pt: 'Português' };
  const changeLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 border border-reactor-cyan/30 bg-black/80 backdrop-blur-sm text-reactor-cyan font-mono text-xs tracking-wider hover:border-reactor-cyan transition-all">
        <Globe className="w-4 h-4" />
        <span>{languages[currentLocale as keyof typeof languages] || 'ES'}</span>
        <span className="text-reactor-cyan/50 ml-1">▼</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 border border-reactor-cyan/30 bg-black/90 backdrop-blur-sm z-50">
            {Object.entries(languages).map(([locale, code]) => (
              <button key={locale} onClick={() => changeLanguage(locale)} className={`w-full text-left px-4 py-2 font-mono text-sm ${currentLocale === locale ? 'bg-reactor-cyan/10 text-reactor-cyan border-l-2 border-reactor-cyan' : 'text-gray-400 hover:bg-reactor-cyan/5 hover:text-reactor-cyan'}`}>
                <span className="font-bold mr-2">{code}</span>
                <span className="text-xs opacity-70">{languageNames[locale as keyof typeof languageNames]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
