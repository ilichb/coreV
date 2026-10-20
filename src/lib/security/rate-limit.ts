/**
 * Rate limiting por ventana fija, en memoria del proceso.
 *
 * Por qué no `redisService.checkRateLimit`:
 *   1. su fallback en memoria nunca expira los contadores (`expire` es no-op),
 *      así que una IP que agota la cuota queda bloqueada por tiempo de vida
 *      del proceso en lugar de por la ventana;
 *   2. si el cliente Redis falla en vuelo, `incr` rechaza la promesa y
 *      tumba el endpoint.
 *
 * LIMITACIÓN CONOCIDA (documentada en la auditoría): en Vercel cada
 * instancia/snapshot tiene su propio Map, así que la cuota efectiva es
 * "por instancia". Es una mitigación de abuso, no un guarantee distribuido.
 * Para un límite exacto haría falta un store compartido (Redis/Upstash)
 * accesible desde el runtime serverless.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 50_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Segundos hasta que la ventana se libera (0 si ya está liberada). */
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // Poda de buckets vencidos para que el Map no crezca sin límite.
  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/**
 * IP del cliente detrás del proxy de Vercel/Next.
 * `x-forwarded-for` llega del trusted proxy; se toma la primera entrada.
 */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip') ?? 'unknown';
}

/** Solo para tests: limpia el estado del limitador. */
export function __resetRateLimits(): void {
  buckets.clear();
}
