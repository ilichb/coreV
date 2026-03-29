export interface PanelConfig {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

// NUEVOS PANELES SEGÚN ARQUITECTURA DEFINITIVA (7)
export const panels: PanelConfig[] = [
  {
    id: 'navegacion',
    label: 'NAVEGACIÓN',
    description: 'System Boot / Control Overview',
    icon: 'Compass'
  },
  {
    id: 'ecosistema',
    label: 'ECOSISTEMA',
    description: 'Proyectos y acceso estratégico',
    icon: 'Globe'
  },
  {
    id: 'construye',
    label: 'CONSTRUYE',
    description: 'Sistema de validación para empresas',
    icon: 'Puzzle'
  },
  {
    id: 'dao',
    label: 'ANDROMEDA LAYER',
    description: 'Gobernanza inter-ecosistema',
    icon: 'Users'
  },
  {
    id: 'comunicaciones',
    label: 'COMUNICACIONES',
    description: 'Bitácora del sistema',
    icon: 'Megaphone'
  },
  {
    id: 'legal',
    label: 'LEGAL',
    description: 'Marco normativo y canal serio',
    icon: 'Scale'
  },
  {
    id: 'sistema',
    label: 'SYSTEM STATUS',
    description: 'Cierre y estado del sistema',
    icon: 'Cpu'
  },
];
