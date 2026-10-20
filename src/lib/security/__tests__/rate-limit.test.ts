import { rateLimit, clientIp, __resetRateLimits } from '../rate-limit';

beforeEach(() => __resetRateLimits());

describe('rateLimit (ventana fija)', () => {
  it('permite hasta el límite y rechaza el siguiente intento', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('k1', 5, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit('k1', 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('las claves son independientes (una IP bloqueada no bloquea a otra)', () => {
    for (let i = 0; i < 3; i++) rateLimit('ip-a', 2, 60_000);
    expect(rateLimit('ip-a', 2, 60_000).allowed).toBe(false);
    expect(rateLimit('ip-b', 2, 60_000).allowed).toBe(true);
  });

  it('la ventana expira y libera la cuota (regresión: el fallback en memoria de redisService nunca expiraba)', () => {
    jest.useFakeTimers();
    try {
      for (let i = 0; i < 3; i++) rateLimit('k2', 2, 1_000);
      expect(rateLimit('k2', 2, 1_000).allowed).toBe(false);

      jest.advanceTimersByTime(1_500);
      expect(rateLimit('k2', 2, 1_000).allowed).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('clientIp', () => {
  it('toma la primera IP de x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' });
    expect(clientIp(h)).toBe('1.2.3.4');
  });

  it('cae a x-real-ip y luego a unknown', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
