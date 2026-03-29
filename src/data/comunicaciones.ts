/**
 * SISTEMA DE BITÁCORA Y COMUNICACIONES
 * 
 * Registro de eventos del sistema:
 * - Actividad de Construye (proyectos validados)
 * - Actividad de Validaciones Estratégicas (perfiles)
 * - Notificaciones oficiales del sistema
 */

import type { BitacoraEvent, Notification, Gallery, Video } from './types'

// ============================================
// CONTENIDO PRINCIPAL
// ============================================

export const comunicacionesContent = {
  title: "Bitácora del Sistema",
  subtitle: "Registro de actividad y trazabilidad completa.",
  tagline: "Todo evento aquí mostrado es real y verificable.",
  
  tabs: [
    {
      id: "construye",
      title: "Actividad Construye",
      description: "Proyectos analizados y validados",
      icon: "wrench"
    },
    {
      id: "validaciones",
      title: "Actividad Validaciones",
      description: "Perfiles estratégicos evaluados",
      icon: "users"
    },
    {
      id: "sistema",
      title: "Notificaciones Sistema",
      description: "Anuncios y eventos oficiales",
      icon: "bell"
    }
  ],
  
  footer: "Esta bitácora mantiene trazabilidad completa de actividades del sistema. Todo contenido aquí mostrado es verificable y actualizado periódicamente."
}

// ============================================
// EVENTOS DE BITÁCORA
// ============================================

export const bitacoraEvents: BitacoraEvent[] = [
  // EVENTOS DE CONSTRUYE (Proyectos validados)
  {
    id: "construye-001",
    timestamp: "2024-12-28T10:30:00Z",
    type: "construye",
    category: "proyecto",
    title: "Proyecto de Movilidad Sostenible",
    description: "Sistema de rastreo de emisiones para flotas de vehículos eléctricos. Puntaje: 75/100",
    result: "aprobado",
    score: 75,
    metadata: {
      projectName: "EcoFleet Tracker",
      sector: "Movilidad",
      impact: "Reducción de 40% emisiones CO2"
    },
    visible: true
  },
  {
    id: "construye-002",
    timestamp: "2024-12-27T16:45:00Z",
    type: "construye",
    category: "proyecto",
    title: "Plataforma de Tokenización de Carbono",
    description: "Proyecto no cumplió con criterios de viabilidad técnica. Puntaje: 45/100",
    result: "rechazado",
    score: 45,
    metadata: {
      projectName: "CarbonChain",
      sector: "Blockchain",
      razon: "Falta de equipo técnico comprometido"
    },
    visible: true
  },
  {
    id: "construye-003",
    timestamp: "2024-12-26T14:20:00Z",
    type: "construye",
    category: "proyecto",
    title: "Sistema de Trazabilidad para Agricultura",
    description: "Plataforma para certificación de productos orgánicos. Puntaje: 82/100",
    result: "aprobado",
    score: 82,
    metadata: {
      projectName: "AgriChain Pro",
      sector: "Agricultura",
      impact: "Trazabilidad completa de 500+ productos"
    },
    visible: true
  },

  // EVENTOS DE VALIDACIONES ESTRATÉGICAS (Perfiles)
  {
    id: "validacion-inv-001",
    timestamp: "2024-12-28T09:15:00Z",
    type: "validacion",
    category: "inversionista",
    title: "Inversionista completó validación",
    description: "Fondo de inversión especializado en tecnología sostenible. Interés en proyectos de impacto ambiental.",
    result: "completado",
    metadata: {
      profileType: "investor",
      sector: "Tecnología Sostenible",
      ticket: "$50K - $500K"
    },
    visible: true
  },
  {
    id: "validacion-ally-001",
    timestamp: "2024-12-27T11:30:00Z",
    type: "validacion",
    category: "aliado",
    title: "Aliado estratégico registrado",
    description: "Empresa de consultoría en transformación digital. Experiencia en implementación de blockchain.",
    result: "completado",
    metadata: {
      profileType: "ally",
      sector: "Consultoría",
      expertise: "Blockchain, Smart Contracts"
    },
    visible: true
  },
  {
    id: "validacion-talent-001",
    timestamp: "2024-12-26T15:45:00Z",
    type: "validacion",
    category: "colaborador",
    title: "Colaborador técnico evaluado",
    description: "Desarrollador Full Stack con 5 años de experiencia en Web3. Especializado en React y Solidity.",
    result: "completado",
    metadata: {
      profileType: "talent",
      skills: "React, Next.js, Solidity, TypeScript",
      availability: "Tiempo completo"
    },
    visible: true
  },
  {
    id: "validacion-inst-001",
    timestamp: "2024-12-25T10:00:00Z",
    type: "validacion",
    category: "institucion",
    title: "Institución académica validada",
    description: "Universidad con programa de investigación en blockchain y sostenibilidad. Interés en colaboración académica.",
    result: "completado",
    metadata: {
      profileType: "institution",
      tipo: "Universidad",
      area: "Investigación Blockchain"
    },
    visible: true
  },

  // EVENTOS OFICIALES DEL SISTEMA
  {
    id: "sistema-001",
    timestamp: "2024-12-24T08:00:00Z",
    type: "sistema",
    category: "lanzamiento",
    title: "Gaia Ecotrack v3.2 Lanzado",
    description: "Nueva versión con mejoras en precisión de cálculo de huella de carbono y dashboard mejorado.",
    result: "completado",
    metadata: {
      version: "3.2.0",
      features: "Cálculo de Scope 3, Dashboard Analytics, API REST"
    },
    visible: true
  },
  {
    id: "sistema-002",
    timestamp: "2024-12-20T14:30:00Z",
    type: "sistema",
    category: "evento",
    title: "Equipo en Web3 Summit Bogotá 2024",
    description: "Participación en evento de blockchain más importante de Colombia. Presentación sobre soluciones de impacto.",
    result: "completado",
    metadata: {
      eventLocation: "Bogotá, Colombia",
      eventName: "Web3 Summit Bogotá 2024",
      fecha: "20-21 Diciembre 2024"
    },
    visible: true
  },
  {
    id: "sistema-003",
    timestamp: "2024-12-15T16:00:00Z",
    type: "sistema",
    category: "oficial",
    title: "Nuevo Módulo DAO Activado",
    description: "Sistema de gobernanza descentralizada ahora disponible para miembros del ecosistema.",
    result: "completado",
    metadata: {
      modulo: "DAO",
      features: "Propuestas, Votaciones, Treasury"
    },
    visible: true
  }
]

// ============================================
// NOTIFICACIONES DEL SISTEMA (Legacy - mantener por compatibilidad)
// ============================================

export const notifications: Notification[] = [
  {
    id: "notif-001",
    title: "Sistema Operativo",
    message: "Todos los módulos funcionando correctamente. Última actualización: 28 Dic 2024.",
    type: "success",
    date: "2024-12-28",
    visible: true
  },
  {
    id: "notif-002",
    title: "Mantenimiento Programado",
    message: "El sistema entrará en mantenimiento el 30 Dic de 02:00 - 04:00 AM UTC.",
    type: "info",
    date: "2024-12-28",
    visible: true
  }
]

// ============================================
// GALERÍAS VISUALES
// ============================================

export const galleries: Gallery[] = [
  {
    id: "gallery-001",
    title: "Web3 Summit Bogotá 2024",
    description: "Participación en el evento de blockchain más importante de Colombia.",
    images: [
      "/gallery/evento-web3-bogota-2024/inauguracion.jpg",
      "/gallery/evento-web3-bogota-2024/charla-principal.jpg"
    ],
    date: "2024-12-20",
    visible: true
  },
  {
    id: "gallery-002",
    title: "Lanzamiento Gaia Ecotrack v3",
    description: "Celebración del lanzamiento de la nueva versión con el equipo.",
    images: [
      "/gallery/lanzamiento-gaia-v3/presentacion-oficial.jpg",
      "/gallery/lanzamiento-gaia-v3/equipo-celebrando.jpg"
    ],
    date: "2024-12-15",
    visible: true
  }
]

// ============================================
// ARCHIVO DE VIDEOS
// ============================================

export const videos: Video[] = [
  // Preparado para contenido futuro
  // {
  //   id: "video-001",
  //   title: "Presentación Gaia Ecotrack v3",
  //   description: "Demo completo de las nuevas funcionalidades",
  //   url: "https://youtube.com/...",
  //   thumbnail: "/videos/thumbnails/gaia-v3.jpg",
  //   duration: "8:45",
  //   date: "2024-12-15",
  //   visible: true
  // }
]

// ============================================
// HELPERS PARA BITÁCORA
// ============================================

// Filtrar eventos por tipo
export function getEventsByType(type: 'construye' | 'validacion' | 'sistema') {
  return bitacoraEvents.filter(event => event.type === type && event.visible)
}

// Filtrar eventos por categoría
export function getEventsByCategory(category: string) {
  return bitacoraEvents.filter(event => event.category === category && event.visible)
}

// Ordenar eventos por fecha (más recientes primero)
export function getSortedEvents() {
  return [...bitacoraEvents]
    .filter(event => event.visible)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// Obtener estadísticas
export function getBitacoraStats() {
  const events = bitacoraEvents.filter(e => e.visible)
  
  return {
    total: events.length,
    construye: {
      total: events.filter(e => e.type === 'construye').length,
      aprobados: events.filter(e => e.type === 'construye' && e.result === 'aprobado').length,
      rechazados: events.filter(e => e.type === 'construye' && e.result === 'rechazado').length
    },
    validaciones: {
      total: events.filter(e => e.type === 'validacion').length,
      inversionistas: events.filter(e => e.category === 'inversionista').length,
      aliados: events.filter(e => e.category === 'aliado').length,
      colaboradores: events.filter(e => e.category === 'colaborador').length,
      instituciones: events.filter(e => e.category === 'institucion').length
    },
    sistema: events.filter(e => e.type === 'sistema').length
  }
}

export default comunicacionesContent
