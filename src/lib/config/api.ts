import { logger } from '../utils/logger';
// API para scorecards
export const scorecardAPI = {
  getAll: async (options?: { status?: string; limit?: number; offset?: number }) => {
    try {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const response = await fetch(`/api/coordination/scorecards?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch scorecards');

      // Si la API devuelve el array directamente (como vimos en route.ts), lo envolvemos
      const scorecards = Array.isArray(data) ? data : (data.scorecards || []);
      const count = typeof data.count === 'number' ? data.count : scorecards.length;

      return {
        success: true,
        scorecards,
        count
      };
    } catch (error: any) {
      logger.error('Error in scorecardAPI.getAll:', error);
      return {
        success: false,
        scorecards: [],
        count: 0,
        error: error.message
      };
    }
  },

  create: async (scorecardData: any) => {
    try {
      const response = await fetch('/api/coordination/scorecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scorecardData)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to create scorecard');

      return {
        success: true,
        scorecard: data.scorecard,
        validation: data.validation,
        error: null
      };
    } catch (error: any) {
      logger.error('Error in scorecardAPI.create:', error);
      return {
        success: false,
        scorecard: null,
        validation: null,
        error: error.message
      };
    }
  }
};
