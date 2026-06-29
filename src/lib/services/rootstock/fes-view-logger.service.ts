/**
 * FES View Logger Service
 *
 * Registra cada consulta a /preview en MongoDB y publica
 * resúmenes diarios a IPFS vía Pinata.
 *
 * Schema en MongoDB (colección: fes_views):
 * {
 *   walletHash: string,      // SHA-256 con sal (nunca la address cruda)
 *   cohort: 'A' | 'B' | 'VIP',
 *   messageVariant: 'control' | 'treatment' | 'vip',
 *   balance: number,
 *   daysInactive: number,
 *   projectedYield: number,
 *   timestamp: Date,
 *   date: string              // YYYY-MM-DD para agregación diaria
 * }
 *
 * Publicación diaria a IPFS:
 * {
 *   date: string,
 *   totalViews: number,
 *   viewsByCohort: { A: number, B: number, VIP: number },
 *   views: Array<{ walletHash, cohort, timestamp }>
 * }
 */

import { mongoDBClient } from '@/lib/infrastructure/mongodb';
import { pinata } from '@/lib/services/storage/pinata';
import { logger } from '@/lib/utils/logger';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';
import { Collection, Db } from 'mongodb';

export interface FESViewLog {
    walletHash: string;
    cohort: string;
    messageVariant: string;
    balance: number;
    daysInactive: number;
    projectedYield: number;
    timestamp: Date;
    date: string; // YYYY-MM-DD
}

export interface DailyIPFSReport {
    date: string;
    totalViews: number;
    viewsByCohort: Record<string, number>;
    viewsByVariant: Record<string, number>;
    totalBalanceInactive: number;
    avgDaysInactive: number;
    views: Array<{
        walletHash: string;
        cohort: string;
        timestamp: string;
    }>;
    generatedAt: string;
    version: string;
}

class FESViewLoggerService {
    private readonly COLLECTION = 'fes_views';
    private readonly DAILY_REPORTS_COLLECTION = 'fes_daily_reports';
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
     * Obtiene la colección de vistas
     */
    private async getCollection(): Promise<Collection<FESViewLog>> {
        const db = await this.getDb();
        return db.collection<FESViewLog>(this.COLLECTION);
    }

    /**
     * Registra una vista de /preview en MongoDB
     */
    async logView(params: {
        wallet: string;
        cohort: string;
        messageVariant: string;
        balance: number;
        daysInactive: number;
        projectedYield: number;
    }): Promise<void> {
        try {
            const walletHash = walletHashService.hashWallet(params.wallet).walletHash;
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

            const viewLog: FESViewLog = {
                walletHash,
                cohort: params.cohort,
                messageVariant: params.messageVariant,
                balance: params.balance,
                daysInactive: params.daysInactive,
                projectedYield: params.projectedYield,
                timestamp: now,
                date: dateStr,
            };

            const collection = await this.getCollection();
            await collection.insertOne(viewLog);

            logger.info(`[FES View Logger] View logged for ${walletHash.slice(0, 16)}... (cohort: ${params.cohort})`);
        } catch (error: any) {
            // No lanzar error — el logging no debe bloquear la respuesta al usuario
            logger.error('[FES View Logger] Failed to log view:', error);
        }
    }

    /**
     * Obtiene el resumen diario de vistas
     */
    async getDailySummary(date?: string): Promise<DailyIPFSReport | null> {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const collection = await this.getCollection();

            const views = await collection
                .find({ date: targetDate })
                .project({ walletHash: 1, cohort: 1, messageVariant: 1, balance: 1, daysInactive: 1, timestamp: 1 })
                .toArray();

            if (views.length === 0) return null;

            const viewsByCohort: Record<string, number> = {};
            const viewsByVariant: Record<string, number> = {};
            let totalBalance = 0;
            let totalDays = 0;

            for (const v of views) {
                viewsByCohort[v.cohort] = (viewsByCohort[v.cohort] || 0) + 1;
                viewsByVariant[v.messageVariant] = (viewsByVariant[v.messageVariant] || 0) + 1;
                totalBalance += v.balance || 0;
                totalDays += v.daysInactive || 0;
            }

            return {
                date: targetDate,
                totalViews: views.length,
                viewsByCohort,
                viewsByVariant,
                totalBalanceInactive: totalBalance,
                avgDaysInactive: views.length > 0 ? Math.round(totalDays / views.length) : 0,
                views: views.map(v => ({
                    walletHash: v.walletHash,
                    cohort: v.cohort,
                    timestamp: v.timestamp.toISOString(),
                })),
                generatedAt: new Date().toISOString(),
                version: 'fes-view-report-v1',
            };
        } catch (error: any) {
            logger.error('[FES View Logger] Failed to get daily summary:', error);
            return null;
        }
    }

    /**
     * Publica el resumen diario a IPFS vía Pinata
     * Retorna el CID de IPFS o null si falla
     */
    async publishDailyReportToIPFS(date?: string): Promise<{ cid: string; url: string } | null> {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const summary = await this.getDailySummary(targetDate);

            if (!summary) {
                logger.info(`[FES View Logger] No views for ${targetDate}, skipping IPFS publish`);
                return null;
            }

            const result = await pinata.pinJSON(summary, {
                name: `fes-views-${targetDate}.json`,
            });

            // Guardar referencia del reporte en MongoDB
            const db = await this.getDb();
            await db.collection(this.DAILY_REPORTS_COLLECTION).insertOne({
                date: targetDate,
                cid: result.IpfsHash,
                url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
                totalViews: summary.totalViews,
                publishedAt: new Date(),
            });

            logger.info(`[FES View Logger] Daily report published to IPFS: ${result.IpfsHash}`);

            return {
                cid: result.IpfsHash,
                url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
            };
        } catch (error: any) {
            logger.error('[FES View Logger] Failed to publish daily report to IPFS:', error);
            return null;
        }
    }

    /**
     * Obtiene el historial de reportes diarios publicados
     */
    async getPublishedReports(limit = 30): Promise<Array<{
        date: string;
        cid: string;
        url: string;
        totalViews: number;
        publishedAt: Date;
    }>> {
        try {
            const db = await this.getDb();
            const reports = await db
                .collection(this.DAILY_REPORTS_COLLECTION)
                .find({})
                .sort({ date: -1 })
                .limit(limit)
                .toArray();

            return reports.map(r => ({
                date: r.date,
                cid: r.cid,
                url: r.url,
                totalViews: r.totalViews,
                publishedAt: r.publishedAt,
            }));
        } catch (error: any) {
            logger.error('[FES View Logger] Failed to get published reports:', error);
            return [];
        }
    }

    /**
     * Obtiene estadísticas agregadas de todas las vistas
     */
    async getAggregatedStats(): Promise<{
        totalViews: number;
        uniqueWallets: number;
        viewsByCohort: Record<string, number>;
        viewsByDate: Record<string, number>;
        lastPublishedReport: string | null;
    }> {
        try {
            const collection = await this.getCollection();

            const totalViews = await collection.countDocuments();
            const uniqueWallets = (await collection.distinct('walletHash')).length;

            // Views por cohorte
            const cohortAgg = await collection.aggregate([
                { $group: { _id: '$cohort', count: { $sum: 1 } } },
            ]).toArray();
            const viewsByCohort: Record<string, number> = {};
            for (const row of cohortAgg) {
                viewsByCohort[row._id] = row.count;
            }

            // Views por fecha
            const dateAgg = await collection.aggregate([
                { $group: { _id: '$date', count: { $sum: 1 } } },
                { $sort: { _id: -1 } },
                { $limit: 30 },
            ]).toArray();
            const viewsByDate: Record<string, number> = {};
            for (const row of dateAgg) {
                viewsByDate[row._id] = row.count;
            }

            // Último reporte publicado
            const db = await this.getDb();
            const lastReport = await db
                .collection(this.DAILY_REPORTS_COLLECTION)
                .findOne({}, { sort: { date: -1 } });

            return {
                totalViews,
                uniqueWallets,
                viewsByCohort,
                viewsByDate,
                lastPublishedReport: lastReport?.url || null,
            };
        } catch (error: any) {
            logger.error('[FES View Logger] Failed to get aggregated stats:', error);
            return {
                totalViews: 0,
                uniqueWallets: 0,
                viewsByCohort: {},
                viewsByDate: {},
                lastPublishedReport: null,
            };
        }
    }
}

export const fesViewLogger = new FESViewLoggerService();
