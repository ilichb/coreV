/**
 * FES Attribution Monitor Service
 *
 * Consulta eventos Staked en el contrato de staking de Rootstock
 * y cruza con los walletHash registrados en MongoDB (vistas de /preview)
 * para atribuir stakes al experimento FES.
 *
 * Flujo:
 * 1. Obtener todos los walletHash que vieron /preview desde MongoDB
 * 2. Consultar eventos Staked recientes en el contrato de staking (vía RPC)
 * 3. Cruzar: si una wallet que vio /preview aparece en Staked, es una atribución
 * 4. Registrar la atribución en Supabase (fes_events) y MongoDB
 *
 * Schema en MongoDB (colección: fes_attributions):
 * {
 *   walletHash: string,
 *   cohort: string,
 *   txHash: string,
 *   blockNumber: number,
 *   amount: string,        // RIF stakeado
 *   viewedAt: Date,        // Cuándo vio /preview
 *   stakedAt: Date,        // Cuándo hizo stake
 *   daysToStake: number,   // Días entre vista y stake
 *   detectedAt: Date       // Cuándo se detectó la atribución
 * }
 */

import { mongoDBClient } from '@/lib/infrastructure/mongodb';
import { rpcBalancer } from '@/lib/infrastructure/clients/rpc-balancer';
import { fesStorage } from '@/lib/services/rootstock/fes-storage.service';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';
import { logger } from '@/lib/utils/logger';
import { Db, Collection } from 'mongodb';

// Contrato de staking de Rootstock Collective
const STAKING_CONTRACT = process.env.STAKING_CONTRACT_ADDRESS || '0x9Fb7cB8C6A1bEe5C8f3c1b2E5f6a7b8c9d0e1f2a';

// Event signature: Staked(address indexed user, uint256 amount, uint256 lockDays)
const STAKED_EVENT_SIG = '0x5c2c7e4b9c5e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a';

export interface FESAttribution {
    walletHash: string;
    cohort: string;
    txHash: string;
    blockNumber: number;
    amount: string;
    viewedAt: Date;
    stakedAt: Date;
    daysToStake: number;
    detectedAt: Date;
}

export interface AttributionSummary {
    totalAttributions: number;
    byCohort: Record<string, number>;
    totalVolumeRIF: number;
    volumeByCohort: Record<string, number>;
    avgDaysToStake: number | null;
    lastCheckedBlock: number;
    checkedAt: string;
}

class FESAttributionMonitorService {
    private readonly ATTRIBUTIONS_COLLECTION = 'fes_attributions';
    private readonly VIEWS_COLLECTION = 'fes_views';
    private readonly CHECKPOINT_KEY = 'fes:attribution:lastCheckedBlock';
    private db: Db | null = null;

    /**
     * Obtiene la conexión a MongoDB (lazy)
     */
    private async getDb(): Promise<Db> {
        if (!this.db) {
            await mongoDBClient.connect();
            this.db = mongoDBClient.getDb();
        }
        return this.db;
    }

    /**
     * Obtiene la colección de atribuciones
     */
    private async getAttributionsCollection(): Promise<Collection<FESAttribution>> {
        const db = await this.getDb();
        return db.collection<FESAttribution>(this.ATTRIBUTIONS_COLLECTION);
    }

    /**
     * Obtiene la colección de vistas
     */
    private async getViewsCollection(): Promise<Collection> {
        const db = await this.getDb();
        return db.collection(this.VIEWS_COLLECTION);
    }

    /**
     * Ejecuta el ciclo completo de monitoreo de atribución
     */
    async runCheck(): Promise<{
        newAttributions: number;
        totalAttributions: number;
        summary: AttributionSummary;
    }> {
        try {
            // 1. Obtener el último bloque verificado
            const lastCheckedBlock = await this.getLastCheckedBlock();
            const currentBlockHex = await rpcBalancer.call<string>({ method: 'eth_blockNumber', params: [] });
            const currentBlock = parseInt(currentBlockHex, 16);

            if (currentBlock <= lastCheckedBlock) {
                logger.info(`[FES Attribution] No new blocks since last check (${lastCheckedBlock})`);
                const summary = await this.getSummary();
                return { newAttributions: 0, totalAttributions: summary.totalAttributions, summary };
            }

            // 2. Obtener todas las wallets que vieron /preview (con walletHash)
            const viewsCollection = await this.getViewsCollection();
            const viewers = await viewsCollection
                .find({})
                .project({ walletHash: 1, cohort: 1, timestamp: 1 })
                .toArray();

            if (viewers.length === 0) {
                logger.info('[FES Attribution] No viewers found, skipping check');
                await this.saveLastCheckedBlock(currentBlock);
                const summary = await this.getSummary();
                return { newAttributions: 0, totalAttributions: 0, summary };
            }

            // 3. Consultar eventos Staked desde el último bloque verificado
            const fromBlock = lastCheckedBlock > 0 ? lastCheckedBlock + 1 : currentBlock - 10000; // Últimos ~2 días si es primera vez
            const stakedEvents = await this.fetchStakedEvents(fromBlock, currentBlock);

            logger.info(`[FES Attribution] Found ${stakedEvents.length} Staked events between blocks ${fromBlock}-${currentBlock}`);

            // 4. Cruzar eventos Staked con viewers
            const attributionsCollection = await this.getAttributionsCollection();
            let newAttributions = 0;

            for (const event of stakedEvents) {
                const walletHash = walletHashService.hashWallet(event.user).walletHash;

                // Verificar si esta wallet vio /preview
                const viewer = viewers.find(v => v.walletHash === walletHash);
                if (!viewer) continue;

                // Verificar si ya registramos esta atribución
                const existing = await attributionsCollection.findOne({ txHash: event.txHash });
                if (existing) continue;

                // Calcular días entre vista y stake
                const viewedAt = new Date(viewer.timestamp);
                const stakedAt = new Date(parseInt(event.blockTimestamp, 16) * 1000);
                const daysToStake = Math.round((stakedAt.getTime() - viewedAt.getTime()) / 86400000);

                // Registrar atribución en MongoDB
                const attribution: FESAttribution = {
                    walletHash,
                    cohort: viewer.cohort,
                    txHash: event.txHash,
                    blockNumber: event.blockNumber,
                    amount: event.amount,
                    viewedAt,
                    stakedAt,
                    daysToStake,
                    detectedAt: new Date(),
                };

                await attributionsCollection.insertOne(attribution);

                // Registrar evento en Supabase
                await fesStorage.recordEvent({
                    wallet: event.user.toLowerCase(),
                    event_type: 'attributed_stake',
                    payload: {
                        txHash: event.txHash,
                        blockNumber: event.blockNumber,
                        amount: event.amount,
                        cohort: viewer.cohort,
                        daysToStake,
                        viewedAt: viewedAt.toISOString(),
                    },
                });

                newAttributions++;
                logger.info(`[FES Attribution] ✅ New attribution: ${walletHash.slice(0, 16)}... (${event.amount} RIF, cohort ${viewer.cohort})`);
            }

            // 5. Guardar checkpoint
            await this.saveLastCheckedBlock(currentBlock);

            const summary = await this.getSummary();
            logger.info(`[FES Attribution] Check complete: ${newAttributions} new attributions, ${summary.totalAttributions} total`);

            return { newAttributions, totalAttributions: summary.totalAttributions, summary };
        } catch (error: any) {
            logger.error('[FES Attribution] Run check failed:', error);
            const summary = await this.getSummary();
            return { newAttributions: 0, totalAttributions: summary.totalAttributions, summary };
        }
    }

    /**
     * Consulta eventos Staked en el contrato de staking vía RPC
     */
    private async fetchStakedEvents(fromBlock: number, toBlock: number): Promise<Array<{
        user: string;
        amount: string;
        blockNumber: number;
        blockTimestamp: string;
        txHash: string;
    }>> {
        try {
            const logs = await rpcBalancer.call<Array<{
                address: string;
                blockNumber: string;
                blockHash: string;
                transactionHash: string;
                data: string;
                topics: string[];
            }>>({
                method: 'eth_getLogs',
                params: [{
                    address: STAKING_CONTRACT,
                    fromBlock: `0x${fromBlock.toString(16)}`,
                    toBlock: `0x${toBlock.toString(16)}`,
                    topics: [STAKED_EVENT_SIG],
                }],
                timeout: 30000,
            });

            if (!logs || !Array.isArray(logs)) return [];

            // Obtener timestamps de los bloques (en batch)
            const uniqueBlocks = [...new Set(logs.map(l => parseInt(l.blockNumber, 16)))];
            const blockTimestamps = await this.batchGetBlockTimestamps(uniqueBlocks);

            return logs.map(log => {
                const blockNum = parseInt(log.blockNumber, 16);
                // Decodificar event: topics[1] = user (address), data = amount (uint256)
                const user = `0x${log.topics[1].substring(26)}`; // Últimos 40 chars = address
                const amount = BigInt(log.data).toString();

                return {
                    user: user.toLowerCase(),
                    amount,
                    blockNumber: blockNum,
                    blockTimestamp: blockTimestamps.get(blockNum) || '0',
                    txHash: log.transactionHash,
                };
            });
        } catch (error: any) {
            logger.error('[FES Attribution] Failed to fetch Staked events:', error);
            return [];
        }
    }

    /**
     * Obtiene timestamps de bloques en batch
     */
    private async batchGetBlockTimestamps(blocks: number[]): Promise<Map<number, string>> {
        const result = new Map<number, string>();

        const BATCH_SIZE = 20;
        for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
            const batch = blocks.slice(i, i + BATCH_SIZE);
            const responses = await Promise.allSettled(
                batch.map(async block => {
                    const hex = `0x${block.toString(16)}`;
                    const blockData = await rpcBalancer.call<any>({
                        method: 'eth_getBlockByNumber',
                        params: [hex, false],
                        timeout: 10000,
                    });
                    return { block, timestamp: blockData?.timestamp || '0x0' };
                })
            );

            for (const res of responses) {
                if (res.status === 'fulfilled') {
                    result.set(res.value.block, res.value.timestamp);
                }
            }
        }

        return result;
    }

    /**
     * Obtiene el último bloque verificado desde Redis
     */
    private async getLastCheckedBlock(): Promise<number> {
        try {
            const { redisService } = await import('@/lib/services/coordination/redis');
            const cached = await redisService.get(this.CHECKPOINT_KEY);
            return cached ? parseInt(cached, 10) : 0;
        } catch {
            return 0;
        }
    }

    /**
     * Guarda el último bloque verificado en Redis
     */
    private async saveLastCheckedBlock(block: number): Promise<void> {
        try {
            const { redisService } = await import('@/lib/services/coordination/redis');
            await redisService.set(this.CHECKPOINT_KEY, block.toString(), 86400);
        } catch (error: any) {
            logger.error('[FES Attribution] Failed to save checkpoint:', error);
        }
    }

    /**
     * Obtiene resumen de atribuciones
     */
    async getSummary(): Promise<AttributionSummary> {
        try {
            const collection = await this.getAttributionsCollection();

            const totalAttributions = await collection.countDocuments();

            // Por cohorte
            const cohortAgg = await collection.aggregate([
                { $group: { _id: '$cohort', count: { $sum: 1 }, volume: { $sum: { $toDouble: '$amount' } } } },
            ]).toArray();

            const byCohort: Record<string, number> = {};
            const volumeByCohort: Record<string, number> = {};
            let totalVolumeRIF = 0;

            for (const row of cohortAgg) {
                byCohort[row._id] = row.count;
                const volume = parseFloat(row.volume) / 1e18;
                volumeByCohort[row._id] = volume;
                totalVolumeRIF += volume;
            }

            // Promedio de días para stake
            const daysAgg = await collection.aggregate([
                { $group: { _id: null, avgDays: { $avg: '$daysToStake' } } },
            ]).toArray();
            const avgDaysToStake = daysAgg.length > 0 ? Math.round(daysAgg[0].avgDays * 10) / 10 : null;

            const lastCheckedBlock = await this.getLastCheckedBlock();

            return {
                totalAttributions,
                byCohort,
                totalVolumeRIF: Math.round(totalVolumeRIF * 100) / 100,
                volumeByCohort: Object.fromEntries(
                    Object.entries(volumeByCohort).map(([k, v]) => [k, Math.round(v * 100) / 100])
                ),
                avgDaysToStake,
                lastCheckedBlock,
                checkedAt: new Date().toISOString(),
            };
        } catch (error: any) {
            logger.error('[FES Attribution] Failed to get summary:', error);
            return {
                totalAttributions: 0,
                byCohort: {},
                totalVolumeRIF: 0,
                volumeByCohort: {},
                avgDaysToStake: null,
                lastCheckedBlock: 0,
                checkedAt: new Date().toISOString(),
            };
        }
    }

    /**
     * Obtiene todas las atribuciones registradas
     */
    async getAttributions(limit = 100): Promise<FESAttribution[]> {
        try {
            const collection = await this.getAttributionsCollection();
            return await collection
                .find({})
                .sort({ detectedAt: -1 })
                .limit(limit)
                .toArray() as FESAttribution[];
        } catch (error: any) {
            logger.error('[FES Attribution] Failed to get attributions:', error);
            return [];
        }
    }
}

export const fesAttributionMonitor = new FESAttributionMonitorService();
