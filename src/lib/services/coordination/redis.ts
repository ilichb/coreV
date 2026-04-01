import { redisService } from '../../infrastructure/redis';

export interface Challenge {
  nonce: string;
  did: string;
  expiresAt: number;
}

export { redisService };
