'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppMode = 'andromeda' | 'developer';

interface ModeContextType {
  mode: AppMode;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('andromeda');

  useEffect(() => {
    // Cargar modo desde localStorage si existe
    const savedMode = localStorage.getItem('andromeda-mode') as AppMode;
    if (savedMode && (savedMode === 'andromeda' || savedMode === 'developer')) {
      setMode(savedMode);
    }
  }, []);

  const toggleMode = () => {
    const newMode = mode === 'andromeda' ? 'developer' : 'andromeda';
    setMode(newMode);
    localStorage.setItem('andromeda-mode', newMode);
    
    // Scroll al top cuando cambiamos de modo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useModeContext() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useModeContext debe usarse dentro de un ModeProvider');
  }
  return context;
}
