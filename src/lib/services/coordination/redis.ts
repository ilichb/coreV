import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let client: Redis | null = null;
let useInMemory = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const store = new Map<string, string>();

function getClient(): Redis | null {
  if (useInMemory) return null;

  if (client) return client;

  try {
    console.log(`[Redis] Connecting to ${redisUrl.replace(/:([^@]+)@/, ':***@')}...`);
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.error(`[Redis] Connection failed after ${times} attempts, falling back to in-memory cache`);
          useInMemory = true;
          scheduleReconnect();
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      connectTimeout: 5000,
      enableOfflineQueue: false,
    });

    client.on('error', (err: any) => {
      if (!useInMemory) {
        console.error(`[Redis] Connection error: ${err.message}`);
        useInMemory = true;
        scheduleReconnect();
      }
    });

    client.on('connect', () => {
      if (useInMemory) {
        console.log('[Redis] Reconnected successfully, switching back from in-memory cache');
      } else {
        console.log('[Redis] Connected successfully');
      }
      useInMemory = false;
    });

    client.connect().catch((err: any) => {
      console.error(`[Redis] Initial connection failed: ${err.message}, using in-memory fallback`);
      useInMemory = true;
      scheduleReconnect();
    });

    return client;
  } catch (err: any) {
    console.error(`[Redis] Failed to create client: ${err.message}, using in-memory fallback`);
    useInMemory = true;
    client = null;
    scheduleReconnect();
    return null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    console.log('[Redis] Attempting to reconnect...');
    client = null;
    useInMemory = false;
    getClient();
  }, 30000);
}

export const redisService = {
  async get(key: string): Promise<string | null> {
    const c = getClient();
    if (!c) {
      const val = store.get(key) || null;
      return val;
    }
    try {
      return await c.get(key);
    } catch (err: any) {
      console.error(`[Redis] GET error for key "${key}": ${err.message}`);
      return store.get(key) || null;
    }
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const c = getClient();
    if (!c) {
      store.set(key, value);
      return;
    }
    try {
      if (ttlSeconds) {
        await c.set(key, value, 'EX', ttlSeconds);
      } else {
        await c.set(key, value);
      }
    } catch (err: any) {
      console.error(`[Redis] SET error for key "${key}": ${err.message}`);
      store.set(key, value);
    }
  },

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; resetAfter?: number }> {
    const current = await this.get(key);
    const count = current ? parseInt(current) : 0;
    if (count >= limit) {
      const c = getClient();
      let ttl = windowSeconds;
      if (c) {
        try {
          ttl = await c.ttl(key);
        } catch { /* use default */ }
      }
      return { allowed: false, resetAfter: ttl > 0 ? ttl : windowSeconds };
    }
    await this.set(key, (count + 1).toString(), windowSeconds);
    return { allowed: true };
  },

  async healthCheck(): Promise<boolean> {
    const c = getClient();
    if (!c) return false;
    try {
      const res = await c.ping();
      return res === 'PONG';
    } catch (err: any) {
      console.error(`[Redis] Health check failed: ${err.message}`);
      return false;
    }
  },
};
