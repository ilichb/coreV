'use client';

import { ReactNode, useState } from 'react';
import { HudSidebar } from './HudSidebar';
import { Menu, X } from 'lucide-react';
import ModeToggle from './ModeToggle';
import { useMode } from './modes/useMode';

export function AndromedaLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { mode } = useMode();

  // En modo Desarrollo, no mostrar sidebar
  if (mode === 'developer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-950">
        <ModeToggle />
        {children}
      </div>
    );
  }

  // Modo Andromeda normal
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-950">
      {/* Botón hamburguesa - SOLO mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-black/70 backdrop-blur-sm border border-gray-700 rounded-lg"
      >
        {sidebarOpen ? (
          <X className="w-5 h-5 text-gray-300" />
        ) : (
          <Menu className="w-5 h-5 text-gray-300" />
        )}
      </button>

      {/* Layout principal - Sidebar FIJADO, contenido con scroll */}
      <div className="flex min-h-screen">
        {/* Sidebar - FIJADO (sticky) en desktop, DEBAJO DEL HEADER con z-index apropiado */}
        <div className={`
          ${sidebarOpen ? 'fixed inset-0 z-40' : 'hidden'}
          lg:block lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:z-20
          w-80 flex-shrink-0
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <HudSidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/70 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Contenido principal - SCROLL INDEPENDIENTE */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <ModeToggle />
          {children}
        </div>
      </div>
    </div>
  );
}
