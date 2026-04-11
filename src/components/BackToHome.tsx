'use client';
import { Link } from '@/i18n/routing';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';

export default function BackToHome() {
  const pathname = usePathname();
  // No mostrar en la landing page (cuando la ruta es exactamente /es, /en, /pt o /)
  const isHome = pathname === '/' || pathname === '/es' || pathname === '/en' || pathname === '/pt';
  if (isHome) return null;

  return (
    <Link
      href="/"
      className="fixed bottom-6 right-6 z-50 p-3 bg-black/80 border border-reactor-cyan/30 rounded-full backdrop-blur-md hover:bg-reactor-cyan/20 hover:border-reactor-cyan transition-all group shadow-lg"
      aria-label="Volver a la página principal"
    >
      <Home className="w-5 h-5 text-reactor-cyan group-hover:scale-110 transition-transform" />
    </Link>
  );
}
