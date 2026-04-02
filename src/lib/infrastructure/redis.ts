import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { ConfigService } from '@/lib/services/infrastructure/config.service';

export class RedisService {
  private client: Redis | null = null;
  private store = new Map<string, any>();
  private useInMemory: boolean = false;

  constructor() {
    const config = ConfigService.get();
    const url = config.redis.url;

    if (!url) {
      this.useInMemory = true;
      logger.info('⚠️ Redis configuration missing, using in-memory fallback');
    } else {
      try {
        this.client = new Redis(url);
        
        this.client.on('error', (err) => {
          logger.error('❌ Redis error, switching to in-memory fallback', err);
          this.useInMemory = true;
        });

        logger.info('✅ Redis initialized');
      } catch (err) {
        logger.error('❌ Failed to initialize Redis, using in-memory fallback', err);
        this.useInMemory = true;
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useInMemory) return this.store.get(key) || null;
    return this.client!.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (this.useInMemory) {
      this.store.set(key, value);
      return true;
    }
    if (ttl) {
      await this.client!.set(key, value, 'EX', ttl);
    } else {
      await this.client!.set(key, value);
    }
    return true;
  }

  async del(key: string): Promise<boolean> {
    if (this.useInMemory) return this.store.delete(key);
    await this.client!.del(key);
    return true;
  }

  async incr(key: string): Promise<number> {
    if (this.useInMemory) {
      let v = (this.store.get(key) || 0) + 1;
      this.store.set(key, v);
      return v;
    }
    return this.client!.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (this.useInMemory) return true;
    await this.client!.expire(key, seconds);
    return true;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (this.useInMemory) {
      let obj = this.store.get(key) || {};
      obj[field] = value;
      this.store.set(key, obj);
      return 1;
    }
    return this.client!.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.useInMemory) {
      let obj = this.store.get(key);
      return obj ? obj[field] || null : null;
    }
    return this.client!.hget(key, field);
  }

  async healthCheck(): Promise<boolean> {
    if (this.useInMemory) return true;
    try {
      const res = await this.client!.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  async checkRateLimit(key: string, max: number, windowSeconds: number): Promise<{ allowed: boolean; resetAfter: number }> {
    const count = await this.incr(key);
    if (count === 1) {
      await this.expire(key, windowSeconds);
    }
    return {
      allowed: count <= max,
      resetAfter: windowSeconds
    };
  }
  async setChallenge(did: string, challenge: string, ttlSeconds: number = 300): Promise<void> {
    await this.set('challenge:' + did, challenge, ttlSeconds);
  }
  async getChallenge(did: string): Promise<string | null> {
    return this.get('challenge:' + did);
  }
  async deleteChallenge(did: string): Promise<void> {
    await this.del('challenge:' + did);
  }
  async setNonce(nonce: string, did: string, ttlSeconds: number = 300): Promise<void> {
    await this.set('nonce:' + nonce, did, ttlSeconds);
  }
  async getNonce(nonce: string): Promise<string | null> {
    return this.get('nonce:' + nonce);
  }
  async deleteNonce(nonce: string): Promise<void> {
    await this.del('nonce:' + nonce);
  }
  getClient() { return this; }
}
export const redisService = new RedisService();
