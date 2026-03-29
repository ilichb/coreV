import { useState, useEffect } from 'react';
import { panels, PanelConfig } from '@/lib/panelRegistry';
import { HudState } from './types';
import * as LucideIcons from 'lucide-react';

interface HudItemProps {
  label: string;
  description?: string;
  state: 'active' | 'seen' | 'pending';
  onClick: () => void;
  iconName?: string;
}

const HudItem = ({ label, description, state, onClick, iconName }: HudItemProps) => {
  const renderIcon = () => {
    if (iconName && LucideIcons[iconName as keyof typeof LucideIcons]) {
      const LucideIcon = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
      return <LucideIcon className="w-4 h-4 mt-0.5" />;
    }
    return <span className="font-mono text-sm mt-0.5">◎</span>;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${state === 'active'
          ? 'bg-blue-500/20 border border-blue-500/30 text-white'
          : state === 'seen'
            ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            : 'bg-transparent text-gray-500 hover:text-gray-400'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${state === 'active' ? 'bg-blue-500/20' : 'bg-gray-800/50'
          }`}>
          {renderIcon()}
        </div>
        <div className="flex-1">
          <div className={`font-medium ${state === 'active' ? 'text-white' : 'text-gray-300'
            }`}>
            {label}
          </div>
          {description && (
            <div className="text-xs text-gray-500 mt-1">{description}</div>
          )}
        </div>
        {state === 'active' && (
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        )}
      </div>
    </button>
  );
};

interface HudSidebarProps {
  onClose?: () => void;
}

export function HudSidebar({ onClose }: HudSidebarProps) {
  const [activePanel, setActivePanel] = useState('navegacion');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      panels.forEach((panel: PanelConfig) => {
        const element = document.getElementById(panel.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActivePanel(panel.id);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePanelClick = (panelId: string) => {
    const element = document.getElementById(panelId);
    if (element) {
      window.scrollTo({
        top: element.offsetTop,
        behavior: 'smooth'
      });
      setActivePanel(panelId);

      if (onClose) {
        onClose();
      }
    }
  };

  const getPanelState = (panelId: string): HudState => {
    if (panelId === activePanel) return 'active';

    const panelIndex = panels.findIndex(p => p.id === panelId);
    const activeIndex = panels.findIndex(p => p.id === activePanel);

    return panelIndex < activeIndex ? 'seen' : 'pending';
  };

  return (
    <div className="h-full bg-black/40 backdrop-blur-sm border-r border-gray-800 flex flex-col">
      {/* Encabezado */}
      <div className="p-6 border-b border-gray-800 flex-shrink-0">
        <div className="text-sm text-gray-500 font-mono mb-2">CENTRO DE MANDO</div>
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          ANDROMEDA
        </div>
        <div className="text-sm text-gray-400 mt-1">Ecosistema Web3</div>
      </div>

      {/* Navegación */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-sm text-gray-500 font-mono mb-4">PANELES</div>
        <nav className="space-y-2">
          {panels.map((panel: PanelConfig) => (
            <HudItem
              key={panel.id}
              label={panel.label}
              description={panel.description}
              state={getPanelState(panel.id)}
              onClick={() => handlePanelClick(panel.id)}
              iconName={panel.icon}
            />
          ))}
        </nav>
      </div>

      {/* Pie */}
      <div className="p-6 border-t border-gray-800 text-xs text-gray-500 flex-shrink-0">
        <div className="flex justify-between mb-1">
          <span>STATUS:</span>
          <span className="text-green-400">OPERATIVO</span>
        </div>
        <div className="flex justify-between">
          <span>MODO:</span>
          <span className="text-blue-300">CENTRO DE MANDO</span>
        </div>
      </div>
    </div>
  );
}
