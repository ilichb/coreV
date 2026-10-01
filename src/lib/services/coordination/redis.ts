import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let client: Redis | null = null;
let useInMemory = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectPromise: Promise<void> | null = null;

/**
 * Cache in-memory de respaldo.
 * Guarda `expiresAt` porque el Map no aplica TTL solo: sin esto, una entrada
 * cacheada durante un corte de Redis sobrevive indefinidamente y el proceso
 * sigue sirviendo datos viejos creyendo que están frescos.
 */
const store = new Map<string, { value: string; expiresAt: number | null }>();
const STORE_SWEEP_THRESHOLD = 1000;

function storeGet(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function storeSet(key: string, value: string, ttlSeconds?: number): void {
  store.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
  // Barrido perezoso para que el Map no crezca sin limite en procesos largos.
  if (store.size > STORE_SWEEP_THRESHOLD) {
    const now = Date.now();
    for (const [k, e] of store) {
      if (e.expiresAt !== null && e.expiresAt <= now) store.delete(k);
    }
  }
}

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

    // Se guarda la promesa para que las operaciones puedan esperar a que la
    // conexion este lista. Sin esto, con lazyConnect el primer comando sale
    // antes de que ioredis conecte y falla con "Stream isn't writeable".
    connectPromise = client.connect().then(
      () => { connectPromise = null; },
      (err: any) => {
        connectPromise = null;
        console.error(`[Redis] Initial connection failed: ${err.message}, using in-memory fallback`);
        useInMemory = true;
        scheduleReconnect();
      }
    );

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

/** Helper aparte para que TS no estreche el tipo de `status` entre llamadas. */
function isReady(c: Redis): boolean {
  return (c as { status: string }).status === 'ready';
}

/**
 * Devuelve un cliente listo para usar, esperando la conexion si esta en curso.
 * Evita el falso negativo de healthCheck(): sin esto, la primera llamada
 * dispara connect() y consulta antes de que el socket este listo.
 */
async function readyClient(): Promise<Redis | null> {
  const c = getClient();
  if (!c) return null;
  if (isReady(c)) return c;
  if (connectPromise) {
    try { await connectPromise; } catch { /* el catch ya lo logueó */ }
  }
  if (useInMemory) return null;
  return isReady(c) ? c : null;
}

export const redisService = {
  async get(key: string): Promise<string | null> {
    const c = await readyClient();
    if (!c) return storeGet(key);
    try {
      return await c.get(key);
    } catch (err: any) {
      console.error(`[Redis] GET error for key "${key}": ${err.message}`);
      return storeGet(key);
    }
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const c = await readyClient();
    if (!c) {
      storeSet(key, value, ttlSeconds);
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
      storeSet(key, value, ttlSeconds);
    }
  },

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; resetAfter?: number }> {
    const current = await this.get(key);
    const count = current ? parseInt(current) : 0;
    if (count >= limit) {
      const c = await readyClient();
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
    const c = await readyClient();
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
