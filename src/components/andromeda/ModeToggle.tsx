'use client';

import { useMode } from './modes/useMode';
import { useState, useEffect } from 'react';

export default function ModeToggle() {
  const { mode, toggleMode } = useMode();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      right: isMobile ? '12px' : '16px',
      top: isMobile ? '20px' : '50%',
      transform: isMobile ? 'none' : 'translateY(-50%)',
      zIndex: 9999,
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: isMobile ? '4px' : '16px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? '2px' : '8px',
        }}>
          <button
            onClick={toggleMode}
            style={{
              width: isMobile ? '40px' : '48px',
              height: isMobile ? '40px' : '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(31, 41, 55, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(55, 65, 81, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
            onMouseOver={(e) => {
              if (!isMobile) {
                e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.9)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseOut={(e) => {
              if (!isMobile) {
                e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
            aria-label={`Cambiar modo. Modo actual: ${mode === 'andromeda' ? 'Andromeda' : 'Desarrollo'}`}
          >
            {/* Ícono - Cambia según modo */}
            <div style={{ width: isMobile ? '20px' : '24px', height: isMobile ? '20px' : '24px' }}>
              {mode === 'andromeda' ? (
                // Ícono para modo Andromeda - CARITA SONRIENTE
                <svg 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    color: '#60a5fa',
                    transition: 'color 0.3s'
                  }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              ) : (
                // Ícono para modo Desarrollo (terminal/código)
                <svg 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    color: '#34d399',
                    transition: 'color 0.3s'
                  }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
              )}
            </div>
            
            {/* Anillo indicador */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '50%',
              border: `2px solid ${mode === 'andromeda' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`,
              transition: 'border-color 0.3s',
            }} />
          </button>
          
          {/* Indicador de modo actual - OCULTO EN MÓVIL */}
          {!isMobile && (
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(17, 24, 39, 0.9)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(55, 65, 81, 0.5)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}>
              <span style={{ 
                color: mode === 'andromeda' ? '#60a5fa' : '#34d399',
                fontWeight: 'bold',
              }}>
                {mode === 'andromeda' ? 'ANDROMEDA' : 'DEV'}
              </span>
            </div>
          )}
        </div>
        
        {/* Línea decorativa - SOLO DESKTOP */}
        {!isMobile && (
          <div style={{
            height: '64px',
            width: '1px',
            background: 'linear-gradient(to bottom, rgba(55, 65, 81, 0.5), transparent)',
          }} />
        )}
      </div>
    </div>
  );
}
