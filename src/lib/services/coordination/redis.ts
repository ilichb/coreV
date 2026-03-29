import { redisIoredisService } from './redis-ioredis';

export interface Challenge {
  nonce: string;
  did: string;
  expiresAt: number;
}

export { redisIoredisService as redisService };
