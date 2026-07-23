import Redis from 'ioredis';
import { logger } from '../../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 200, 1000);
  },
});

export const redisService = {
  async get(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch (err) {
      logger.error('Redis get error:', err);
      return null;
    }
  },
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await redis.set(key, value, 'EX', ttlSeconds);
      } else {
        await redis.set(key, value);
      }
    } catch (err) {
      logger.error('Redis set error:', err);
    }
  },
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; resetAfter?: number }> {
    const current = await this.get(key);
    const count = current ? parseInt(current) : 0;
    if (count >= limit) {
      const ttl = await redis.ttl(key);
      return { allowed: false, resetAfter: ttl > 0 ? ttl : windowSeconds };
    }
    await this.set(key, (count + 1).toString(), windowSeconds);
    return { allowed: true };
  },
  async healthCheck(): Promise<boolean> {
    try {
      const res = await redis.ping();
      return res === 'PONG';
    } catch (err) {
      logger.error('Redis health check error:', err);
      return false;
    }
  }
};

