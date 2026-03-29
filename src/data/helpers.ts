/**
 * HELPERS Y UTILIDADES
 * 
 * Funciones reutilizables para manipular datos.
 * Facilita la transición a backend.
 */

import type { Project, ValidationResult, ValidationStage } from './types'
import { logger } from '../lib/utils/logger';

// ============================================
// PROYECTOS
// ============================================

export const filterProjects = {
  byStatus: (projects: Project[], status: Project['status']) => {
    return projects.filter(p => p.status === status && p.visible)
  },
  
  byVisibility: (projects: Project[], visible: boolean) => {
    return projects.filter(p => p.visible === visible)
  },
  
  bySector: (projects: Project[], sector: string) => {
    return projects.filter(p => p.sector.includes(sector) && p.visible)
  }
}

export const projectStats = (projects: Project[]) => {
  return {
    total: projects.length,
    active: projects.filter(p => p.status === 'ACTIVO').length,
    inDevelopment: projects.filter(p => p.status === 'EN_DESARROLLO').length,
    inResearch: projects.filter(p => p.status === 'INVESTIGACION').length,
    paused: projects.filter(p => p.status === 'PAUSADO').length,
    visible: projects.filter(p => p.visible).length
  }
}

// ============================================
// VALIDACIÓN
// ============================================

export const calculateValidationScore = (
  stages: ValidationStage[],
  stageScores: Record<number, number>
): ValidationResult => {
  const totalScore = Object.values(stageScores).reduce((sum, score) => sum + score, 0);
  const maxScore = stages.reduce((sum, stage) => sum + stage.maxScore, 0);
  const passed = totalScore >= (maxScore * 0.6); // 60% para aprobar
  
  return {
    totalScore,
    maxScore,
    passed,
    stageScores,
    completedAt: new Date().toISOString(),
    isValid: passed,
    errors: []
  };
}

export const getValidationProgress = (
  totalStages: number,
  completedStages: number
): number => {
  return (completedStages / totalStages) * 100;
}

// ============================================
// FECHAS
// ============================================

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export const isRecent = (date: string | Date, daysAgo: number = 30): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days <= daysAgo;
}

// ============================================
// VALIDACIÓN DE DATOS
// ============================================

export const validators = {
  email: (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  notEmpty: (value: string): boolean => {
    return value.trim().length > 0;
  }
}

// ============================================
// STORAGE (preparado para backend)
// ============================================

export const storage = {
  // Simulación de API calls (reemplazar con fetch real)
  async getProjects(): Promise<Project[]> {
    // En el futuro: return fetch('/api/projects').then(r => r.json())
    const { projects } = await import('./ecosistema');
    return projects;
  },
  
  async saveValidation(result: ValidationResult): Promise<boolean> {
    // En el futuro: return fetch('/api/validations', { method: 'POST', body: JSON.stringify(result) })
    logger.info('Validation saved:', result);
    return true;
  },
  
  async getConfig() {
    // En el futuro: return fetch('/api/config').then(r => r.json())
    const { siteConfig } = await import('./config');
    return siteConfig;
  }
}

// ============================================
// UTILIDADES GENERALES
// ============================================

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
