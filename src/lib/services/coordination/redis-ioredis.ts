import Redis from 'ioredis';
import { logger } from '../../utils/logger';

class RedisIoredisService {
    private client: Redis | null = null;

    getClient(): Redis {
        if (!this.client) {
            const url = process.env.REDIS_URL;
            const host = process.env.REDIS_HOST || 'localhost';
            const port = parseInt(process.env.REDIS_PORT || '6379');
            const password = process.env.REDIS_PASSWORD;

            if (url) {
                // Usar URL de conexión
                this.client = new Redis(url, {
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                });
            } else {
                // Usar configuración individual
                this.client = new Redis({
                    host,
                    port,
                    password,
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                });
            }

            logger.info('✅ Redis (ioredis) initialized');
        }

        return this.client;
    }

    async healthCheck(): Promise<boolean> {
        try {
            const client = this.getClient();
            const result = await client.ping();
            logger.info('✅ Redis health check: PONG');
            return result === 'PONG';
        } catch (error: any) {
            logger.error('❌ Redis health check failed:', error.message);
            return false;
        }
    }

    async checkRateLimit(
        key: string,
        max: number,
        windowSeconds: number
    ): Promise<{ allowed: boolean; resetAfter: number }> {
        try {
            const client = this.getClient();
            const count = await client.incr(key);

            if (count === 1) {
                await client.expire(key, windowSeconds);
            }

            return {
                allowed: count <= max,
                resetAfter: windowSeconds
            };
        } catch (error: any) {
            logger.error('❌ Rate limit check failed:', error.message);
            return { allowed: true, resetAfter: 0 };
        }
    }

    async setNonce(nonce: string, did: string, ttlSeconds: number = 300): Promise<void> {
        const client = this.getClient();
        await client.set("nonce:" + nonce, did, "EX", ttlSeconds);
    }

    async getNonce(nonce: string): Promise<string | null> {
        const client = this.getClient();
        return await client.get("nonce:" + nonce);
    }

    async deleteNonce(nonce: string): Promise<void> {
        const client = this.getClient();
        await client.del("nonce:" + nonce);
    }

    async setChallenge(did: string, challenge: string, ttlSeconds: number = 300): Promise<void> {
        const client = this.getClient();
        await client.set("challenge:" + did, challenge, "EX", ttlSeconds);
    }

    async getChallenge(did: string): Promise<string | null> {
        const client = this.getClient();
        return await client.get("challenge:" + did);
    }

    async deleteChallenge(did: string): Promise<void> {
        const client = this.getClient();
        await client.del("challenge:" + did);
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            logger.info('✅ Redis client disconnected');
        }
    }
}

export const redisIoredisService = new RedisIoredisService();