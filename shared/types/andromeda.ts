/**
 * Tipos compartidos entre Andromeda Computer (Landing) y Andromeda Core Platform
 * Fase 1.2: Desacoplamiento físico - Estructura base
 */

export interface ScorecardMetadata {
  version: string;
  created: string;
  authorDid: string;
  updatedAt?: string;
}

export interface BitacoraNotification {
  id: string;
  fecha: Date;
  contenido: string;
  categoria: 'SISTEMA' | 'ATLAS' | 'COORDINACION' | 'FILOSOFIA' | 'IMPORTANTE';
  visible: boolean;
  telegram_message_id?: number;
  telegram_user_id?: number;
  metadata?: {
    hashtags: string[];
    mentioned_terms: string[];
  };
}

export interface EcosystemProject {
  id: string;
  nombre: string;
  url: string;
  estado: 'Operativo' | 'En Desarrollo' | 'Investigación' | 'Pausado';
  descripcion: string;
  sectores: string[];
  rol_andromeda: string[];
  impacto: string[];
}

export interface PanelConfig {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  orden: number;
  visible: boolean;
}

export interface LocaleConfig {
  code: 'es' | 'en' | 'pt';
  nombre: string;
  flag: string;
}

export interface SystemStatus {
  landing: boolean;
  core: boolean;
  aegis: boolean;
  mongodb: boolean;
  redis: boolean;
  uptime: number;
  lastSync: Date;
}

// Constantes de branding compartidas
export const BRAND_TERMS = [
  'ANDROMEDA',
  'ATLAS',
  'AVIP',
  'Sentinel',
  'Aegis'
] as const;

export type BrandTerm = typeof BRAND_TERMS[number];