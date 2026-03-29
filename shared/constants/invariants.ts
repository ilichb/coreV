/**
 * Constantes invariantes compartidas entre sistemas Andromeda
 * Fase 1.2: Desacoplamiento físico
 */

// Umbrales de validación
export const CLARITY_THRESHOLD = 0.75;
export const COMPLETENESS_THRESHOLD = 0.8;
export const VERIFICATION_THRESHOLD = 0.9;

// Puertos de sistema
export const PORTS = {
  LANDING: 3000,
  CORE: 4000,
  AEGIS: 8080, // Ejemplo, ajustar según configuración real
} as const;

// Rutas base
export const ROUTES = {
  LANDING_BASE: '/',
  CORE_BASE: '/core',
  ACCESS_GATEWAY: '/access',
  BITACORA: '/bitacora',
  TELEGRAM_WEBHOOK: '/api/telegram/webhook',
} as const;

// Categorías de bitácora
export const BITACORA_CATEGORIES = [
  'SISTEMA',
  'ATLAS',
  'COORDINACION',
  'FILOSOFIA',
  'IMPORTANTE',
] as const;

// Estados de proyecto
export const PROJECT_STATUSES = [
  'Operativo',
  'En Desarrollo',
  'Investigación',
  'Pausado',
] as const;

// Idiomas soportados
export const SUPPORTED_LOCALES = ['es', 'en', 'pt'] as const;

// Configuración de tiempo
export const TIME_CONFIG = {
  CACHE_TTL: 300, // 5 minutos en segundos
  SYNC_INTERVAL: 3600, // 1 hora en segundos
  NOTIFICATION_RETENTION_DAYS: 90, // 90 días
} as const;

// Nombres de colecciones MongoDB
export const COLLECTIONS = {
  BITACORA: 'bitacora',
  ECOSYSTEM: 'ecosistema',
  USERS: 'usuarios',
} as const;

// Configuración de límites
export const LIMITS = {
  BITACORA_FEED: 20,
  ECOSYSTEM_PROJECTS: 10,
  SEARCH_RESULTS: 50,
} as const;