'use client';

import { useState, useEffect, useCallback } from 'react';
import { scorecardAPI } from '@/lib/config/api';
import { logger } from '../../../lib/utils/logger';

export interface Scorecard {
  id: string;
  cid: string;
  version: string;
  timestamp: number;
  proposer: string;
  status: string;
  content_hash: string;
  problem: any;
  boundaries: any;
  technical_spec: any;
  effort: any;
  clarity_delta: any;
  system_score: any;
  signature: any;
  payment_tx: any;
  created_at: string;
  updated_at: string;
}

export interface UseScorecardsOptions {
  autoLoad?: boolean;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useScorecards(options: UseScorecardsOptions = {}) {
  const { autoLoad = true, status, limit = 50, offset = 0 } = options;
  
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState({
    total: 0,
    validated: 0,
    rejected: 0,
    draft: 0,
    averageScore: 0
  });

  const loadScorecards = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await scorecardAPI.getAll({
        status,
        limit,
        offset
      });
      
      if (result.success) {
        setScorecards(result.scorecards || []);
        setTotal(result.count || 0);
        
        // Calcular métricas básicas
        const validated = (result.scorecards || []).filter(
          (sc: Scorecard) => sc.status === 'validated'
        ).length;
        
        const rejected = (result.scorecards || []).filter(
          (sc: Scorecard) => sc.status === 'rejected'
        ).length;
        
        const draft = (result.scorecards || []).filter(
          (sc: Scorecard) => sc.status === 'draft'
        ).length;
        
        const totalScores = (result.scorecards || []).reduce(
          (sum: number, sc: Scorecard) => sum + (sc.system_score?.overall || 0), 0
        );
        
        const averageScore = (result.scorecards || []).length > 0
          ? totalScores / (result.scorecards || []).length
          : 0;
        
        setMetrics({
          total: result.scorecards?.length || 0,
          validated,
          rejected,
          draft,
          averageScore: Math.round(averageScore * 10) / 10
        });
      } else {
        setError(result.error || 'Error loading scorecards');
      }
      
    } catch (err: any) {
      setError(err.message || 'Error loading scorecards');
      logger.error('Error loading scorecards:', err);
    } finally {
      setLoading(false);
    }
  }, [status, limit, offset]);

  const createScorecard = useCallback(async (scorecardData: any) => {
    setLoading(true);
    
    try {
      const result = await scorecardAPI.create(scorecardData);
      
      if (result.success) {
        // Recargar la lista
        await loadScorecards();
        return {
          success: true,
          scorecard: result.scorecard,
          validation: result.validation
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
      
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error creating scorecard'
      };
    } finally {
      setLoading(false);
    }
  }, [loadScorecards]);

  // Carga automática
  useEffect(() => {
    if (autoLoad) {
      loadScorecards();
    }
  }, [autoLoad, loadScorecards]);

  return {
    // Estado
    scorecards,
    loading,
    error,
    total,
    metrics,
    
    // Acciones
    loadScorecards,
    createScorecard,
    
    // Utilidades
    refetch: loadScorecards,
    clearError: () => setError(null),
    
    // Paginación
    hasMore: scorecards.length < total,
    loadMore: () => {
      if (scorecards.length < total) {
        // Implementar paginación
      }
    }
  };
}
