/**
 * YieldProjectionService
 *
 * Calcula rendimiento proyectado para holders inactivos basado en:
 * - Balance de RIF del holder
 * - Días de inactividad
 * - APR histórica del staking pool (desde Rewards Subgraph o default conservador)
 *
 * También recomienda builders activos del registry para personalizar el mensaje Treatment (B).
 */

import { rootstockConnector } from '@/lib/connectors/rootstock-connector';
import { getRootstockBuilderMeta } from '@/data/rootstock-builders-registry';
import { redisService } from '@/lib/services/coordination/redis';

const DEFAULT_APR = 12; // 12% APR conservador si no se puede calcular
const CACHE_TTL = 3600; // 1 hora

export interface YieldProjection {
    balance: number;
    daysInactive: number;
    projectedYieldRIF: number;
    aprUsed: number;
    recommendedBuilders: Array<{
        name: string;
        category: string;
        address: string;
    }>;
}

class YieldProjectionService {
    /**
     * Calcula la proyección de rendimiento para un holder inactivo
     */
    async calculate(balance: number, daysInactive: number): Promise<YieldProjection> {
        const apr = await this.getEffectiveAPR();
        const projectedYieldRIF = balance * (apr / 100) * (daysInactive / 365);
        const builders = await this.getRecommendedBuilders();

        return {
            balance,
            daysInactive,
            projectedYieldRIF: Math.round(projectedYieldRIF * 100) / 100,
            aprUsed: apr,
            recommendedBuilders: builders.slice(0, 3),
        };
    }

    /**
     * Obtiene la APR efectiva del pool de staking
     * Fuente: Rewards Subgraph → calcula rewards totales / total staked
     * Fallback: 12% conservador
     */
    private async getEffectiveAPR(): Promise<number> {
        const cacheKey = 'rootstock:fes:effective-apr';

        try {
            const cached = await redisService.get(cacheKey);
            if (cached) return parseFloat(cached);
        } catch {
            // Redis no disponible, continuar
        }

        try {
            // Intentar calcular APR desde el subgraph
            // Query: obtener backers con accumulatedTime para estimar rewards
            const subgraphUrl = process.env.THEGRAPH_API_KEY
                ? `https://gateway.thegraph.com/api/${process.env.THEGRAPH_API_KEY}/subgraphs/id/7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA`
                : '';

            if (subgraphUrl) {
                const query = `{
          backerStakingHistories(
            first: 100,
            orderBy: backerTotalAllocation,
            orderDirection: desc,
            where: { accumulatedTime_gt: "0" }
          ) {
            id
            backerTotalAllocation
            accumulatedTime
          }
        }`;

                const response = await fetch(subgraphUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                    signal: AbortSignal.timeout(10000),
                });

                const json = await response.json();
                const histories = json?.data?.backerStakingHistories || [];

                if (histories.length > 0) {
                    // APR estimada = (total accumulatedTime / total allocation) * factor de escala
                    // En Rootstock Collective, accumulatedTime representa tiempo acumulado en segundos
                    // backerTotalAllocation es el monto stakeado
                    let totalRewards = 0;
                    let totalStaked = 0;

                    for (const h of histories) {
                        const allocation = parseFloat(h.backerTotalAllocation || '0');
                        const time = parseFloat(h.accumulatedTime || '0');
                        if (allocation > 0 && time > 0) {
                            // rewards ≈ allocation * (time / secondsInYear) * rewardRate
                            // Simplificación: asumimos rewardRate ~15% del pool anual
                            totalRewards += allocation * (time / (365 * 24 * 3600)) * 0.15;
                            totalStaked += allocation;
                        }
                    }

                    if (totalStaked > 0) {
                        const apr = (totalRewards / totalStaked) * 100;
                        const clampedApr = Math.min(Math.max(apr, 5), 30); // Clamp entre 5% y 30%
                        await redisService.set(cacheKey, clampedApr.toString(), CACHE_TTL);
                        return Math.round(clampedApr * 100) / 100;
                    }
                }
            }
        } catch {
            // Fallback al default
        }

        return DEFAULT_APR;
    }

    /**
     * Obtiene builders recomendados del registry local
     * Prioriza los más recientemente aprobados o con mayor actividad
     */
    private async getRecommendedBuilders(): Promise<Array<{ name: string; category: string; address: string }>> {
        const cacheKey = 'rootstock:fes:recommended-builders';

        try {
            const cached = await redisService.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch {
            // Redis no disponible
        }

        try {
            // Intentar obtener builders activos del connector
            const builders = await rootstockConnector.fetchAllBuilders(20);
            const enriched = builders
                .filter((b: any) => b.name && b.name.length > 1)
                .map((b: any) => ({
                    name: b.name,
                    category: b.category || 'Infrastructure',
                    address: b.id,
                }));

            if (enriched.length > 0) {
                await redisService.set(cacheKey, JSON.stringify(enriched), CACHE_TTL);
                return enriched;
            }
        } catch {
            // Fallback al registry local
        }

        // Fallback: builders del registry local
        const { ROOTSTOCK_BUILDERS_REGISTRY } = await import('@/data/rootstock-builders-registry');
        const local = ROOTSTOCK_BUILDERS_REGISTRY.map(b => ({
            name: b.name,
            category: b.category,
            address: b.address,
        }));

        if (local.length > 0) {
            await redisService.set(cacheKey, JSON.stringify(local), CACHE_TTL);
        }

        return local;
    }
}

export const yieldProjectionService = new YieldProjectionService();
