import { Redis } from '@upstash/redis';
import { logger } from '../../utils/logger';

class RedisCloudService {
  private client: Redis | null = null;

  getClient(): Redis {
    if (!this.client) {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!url || !token) {
        logger.warn('⚠️ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured');
        throw new Error('Redis URL and token required');
      }

      this.client = new Redis({
        url,
        token,
      });

      logger.info('✅ Redis Cloud (Upstash REST) initialized');
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
    await client.set("nonce:" + nonce, did, { ex: ttlSeconds });
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
    await client.set("challenge:" + did, challenge, { ex: ttlSeconds });
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
    // Upstash REST client doesn't need explicit disconnect
    this.client = null;
    logger.info('✅ Redis client disconnected');
  }
}

export const redisService = new RedisCloudService();
