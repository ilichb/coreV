import type { Queue, Worker, Job } from 'bullmq';
import { Queue as BullQueue, Worker as BullWorker } from 'bullmq';
import IORedis from 'ioredis';
import { ecosystemIngestionService } from './ecosystem-ingestion.service';
import { logger } from '../../../utils/logger';

export const SyncJobType = {
  FULL_SYNC: 'full-sync',
  ECOSYSTEM_SYNC: 'ecosystem-sync',
  HEALTH_CHECK: 'health-check'
} as const;

export type SyncJobType = typeof SyncJobType[keyof typeof SyncJobType];

export interface SyncJobData {
  type: SyncJobType;
  ecosystem?: string;
  fromBlock?: number;
  toBlock?: number;
  priority?: 'low' | 'normal' | 'high';
  proposalId?: string; // For idempotency
  force?: boolean;
}

export interface SyncJobResult {
  success: boolean;
  ecosystem?: string;
  decisionsFetched?: number;
  decisionsRegistered?: number;
  error?: string;
  durationMs: number;
  timestamp: number;
  jobId?: string;
}

const QUEUE_NAME = 'cross-dao-sync';
const SYNC_INTERVAL = parseInt(process.env.DATA_SYNC_INTERVAL || '300000');

// Helper to extract Redis constructor
function getRedisConstructor() {
  if (typeof IORedis === 'function') return IORedis;
  if ((IORedis as any).Redis) return (IORedis as any).Redis;
  if ((IORedis as any).default) return (IORedis as any).default;
  return IORedis;
}

const Redis = getRedisConstructor();

class SyncQueueService {
  private queue: any = null;
  private worker: any = null;
  private connection: any = null;
  private isInitialized = false;
  private jobCache: Map<string, string> = new Map(); // For idempotency

  constructor() { }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('📡 Connecting to Redis for Sync Queue...');
      const host = process.env.REDIS_TCP_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_TCP_PORT || '6379');

      // TCP Redis connection for BullMQ
      this.connection = new Redis({
        host,
        port,
        password: process.env.REDIS_TCP_PASSWORD,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 10000,
        retryStrategy: (times: number) => {
          if (times > 10) {
            logger.error(`❌ Redis connection failed after ${times} attempts. Check if Redis is running at ${host}:${port}`);
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.connection.on('error', (err: any) => {
        logger.error('❌ Redis connection error:', err.message);
      });

      this.queue = new BullQueue(QUEUE_NAME, {
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: 100, // Reduced from 1000 to save memory/space
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000 // Increased delay for stability
          }
        }
      });

      this.worker = new BullWorker(
        QUEUE_NAME,
        async (job: Job<SyncJobData, SyncJobResult>) => {
          logger.info(`🎯 [JOB:${job.id}] Processing ${job.data.type}`);
          const startTime = Date.now();
          try {
            let result: SyncJobResult;
            switch (job.data.type) {
              case SyncJobType.FULL_SYNC:
                result = await this.processFullSync(job);
                break;
              case SyncJobType.ECOSYSTEM_SYNC:
                result = await this.processEcosystemSync(job);
                break;
              case SyncJobType.HEALTH_CHECK:
                result = await this.processHealthCheck(job);
                break;
              default:
                throw new Error(`Unknown job type: ${job.data.type}`);
            }
            return {
              ...result,
              jobId: job.id,
              durationMs: Date.now() - startTime,
              timestamp: Date.now()
            };
          } catch (error: any) {
            logger.error(`❌ [JOB:${job.id}] Failed:`, error.message);
            return {
              success: false,
              error: error.message,
              durationMs: Date.now() - startTime,
              timestamp: Date.now()
            };
          }
        },
        {
          connection: this.connection,
          concurrency: parseInt(process.env.MAX_CONCURRENT_SYNCS || '3')
        }
      );

      this.setupWorkerEvents();

      // Ensure clean state for recurring jobs
      try {
        await this.queue.obliterate({ force: true }).catch(() => { });
      } catch (e) { }

      await this.scheduleRecurrentJobs();

      this.isInitialized = true;
      logger.info(`✅ Sync Queue Service initialized (Redis: ${host}:${port})`);
    } catch (error: any) {
      logger.error('❌ Failed to initialize SyncQueueService:', error.message);
      throw error;
    }
  }

  // ... (rest of the class methods adjusted for nullable queue/worker)

  private async processFullSync(job: Job<SyncJobData, SyncJobResult>): Promise<SyncJobResult> {
    logger.info('🔄 Starting full sync of all ecosystems...');
    const results = await ecosystemIngestionService.syncAll();
    const totalDecisions = results.reduce((sum, r) => sum + (r.decisions || 0), 0);
    const totalRegistered = results.reduce((sum, r) => sum + (r.registered || 0), 0);
    const failedEcosystems = results.filter(r => !r.success).map(r => r.ecosystem);
    return {
      success: failedEcosystems.length === 0,
      decisionsFetched: totalDecisions,
      decisionsRegistered: totalRegistered,
      error: failedEcosystems.length > 0 ? `Failed ecosystems: ${failedEcosystems.join(', ')}` : undefined,
      durationMs: 0,
      timestamp: Date.now()
    };
  }

  private async processEcosystemSync(job: Job<SyncJobData, SyncJobResult>): Promise<SyncJobResult> {
    if (!job.data.ecosystem) throw new Error('Ecosystem required');
    logger.info(`🔄 Syncing ${job.data.ecosystem} ecosystem...`);
    const result = await ecosystemIngestionService.syncEcosystem(job.data.ecosystem);
    if (job.id) this.jobCache.set(job.id, Date.now().toString());
    return {
      success: result.success,
      ecosystem: result.ecosystem,
      decisionsFetched: result.decisions,
      decisionsRegistered: result.registered,
      error: result.error,
      durationMs: 0,
      timestamp: Date.now()
    };
  }

  private async processHealthCheck(job: Job<SyncJobData, SyncJobResult>): Promise<SyncJobResult> {
    logger.info('🏥 Running health check...');
    const ecosystems = ecosystemIngestionService.getAvailableEcosystems();
    const counts = await this.queue?.getJobCounts() || { completed: 0 };
    return {
      success: true,
      decisionsFetched: ecosystems.length,
      decisionsRegistered: counts.completed || 0,
      durationMs: 0,
      timestamp: Date.now()
    };
  }

  private setupWorkerEvents(): void {
    this.worker?.on('completed', (job: Job<SyncJobData, SyncJobResult>) => {
      logger.info(`✅ Job ${job.id} completed in ${job.returnvalue?.durationMs}ms`);
    });
    this.worker?.on('failed', (job: Job<SyncJobData, SyncJobResult> | undefined, error: Error) => {
      logger.error(`❌ Job ${job?.id || 'unknown'} failed:`, error.message);
    });
  }

  private async scheduleRecurrentJobs(): Promise<void> {
    if (!this.queue) return;
    await this.queue.add(
      'recurrent-full-sync',
      { type: SyncJobType.FULL_SYNC, priority: 'normal' },
      { repeat: { every: SYNC_INTERVAL, immediately: true } }
    );
    await this.queue.add(
      'recurrent-health-check',
      { type: SyncJobType.HEALTH_CHECK },
      { repeat: { every: 3600000, immediately: false } }
    );
    logger.info(`⏰ Scheduled: full-sync every ${SYNC_INTERVAL / 1000}s, health-check every 1h`);
  }

  async triggerFullSync(): Promise<string> {
    if (!this.queue) throw new Error('Queue not initialized');
    const job = await this.queue.add('manual-full-sync', { type: SyncJobType.FULL_SYNC, priority: 'high' });
    return job.id!;
  }

  async triggerEcosystemSync(ecosystem: string, proposalId?: string): Promise<string> {
    if (!this.queue) throw new Error('Queue not initialized');
    const jobId = proposalId ? `${ecosystem}-${proposalId}` : `sync-${ecosystem}-${Date.now()}`;
    const job = await this.queue.add(`sync-${ecosystem}`, { type: SyncJobType.ECOSYSTEM_SYNC, ecosystem, proposalId, priority: 'normal' }, { jobId });
    return job.id!;
  }

  async getJobStatus(jobId: string): Promise<any> {
    if (!this.queue) return null;
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    return { id: job.id, type: job.data.type, state, progress: job.progress, result: job.returnvalue, failedReason: job.failedReason, timestamp: job.timestamp, processedOn: job.processedOn, finishedOn: job.finishedOn };
  }

  async getQueueStats(): Promise<any> {
    if (!this.queue) return { error: 'Queue not initialized' };
    const counts = await this.queue.getJobCounts();
    return { queue: QUEUE_NAME, counts, workers: 1, isPaused: await this.queue.isPaused() };
  }

  async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down Sync Queue Service...');
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
    this.isInitialized = false;
  }
}

export const syncQueueService = new SyncQueueService();
