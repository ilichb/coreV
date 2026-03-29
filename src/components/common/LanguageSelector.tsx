'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import { locales } from '@/i18n/locales';

export default function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname() || '';

  const changeLanguage = async (locale: string) => {
    // Extraer el path sin el locale actual
    const pathWithoutLocale = pathname.replace(/^\/(es|en|pt)/, '');
    const newPath = `/${locale}${pathWithoutLocale || ''}`;
    
    // Forzar navegación completa y recargar mensajes
    router.push(newPath);
    
    // Opcional: refrescar para asegurar carga de nuevos mensajes
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  const getCurrentLocale = () => {
    const match = pathname.match(/^\/(es|en|pt)/);
    return match ? match[1] : 'es';
  };

  const currentLocale = getCurrentLocale();

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 bg-black/40 border border-reactor-cyan/20 rounded-[2px] hover:bg-reactor-cyan/10 hover:border-reactor-cyan/40 transition-all">
        <Globe className="w-4 h-4 text-reactor-cyan" />
        <span className="text-[10px] font-mono-display font-bold text-gray-300 uppercase tracking-widest">
          {currentLocale.toUpperCase()}
        </span>
      </button>
      
      <div className="absolute top-full left-0 mt-1 w-32 bg-black/90 border border-reactor-cyan/20 rounded-[2px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {locales.map((locale) => (
          <button
            key={locale}
            onClick={() => changeLanguage(locale)}
            className={`w-full text-left px-4 py-2 text-[10px] font-mono-display font-bold uppercase tracking-widest transition-all
              ${currentLocale === locale 
                ? 'text-reactor-cyan bg-reactor-cyan/10' 
                : 'text-gray-400 hover:text-reactor-cyan hover:bg-reactor-cyan/5'
              }`}
          >
            {locale === 'es' ? 'ESPAÑOL' : locale === 'en' ? 'ENGLISH' : 'PORTUGUÊS'}
          </button>
        ))}
      </div>
    </div>
  );
}