import { NextResponse } from 'next/server';
import {
  FES_AUTH_COOKIE,
  createAuthToken,
  verifyAdminPassword,
} from '@/lib/auth/fes-admin';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';

// 5 intentos cada 15 minutos por IP: suficiente para una persona que erra la
// contraseña, insuficiente para fuerza bruta. Ojo con la limitación conocida
// del limitador en memoria (ver src/lib/security/rate-limit.ts).
const RATE_LIMIT = { limit: 5, windowMs: 15 * 60_000 };

export async function POST(request: Request) {
  const limiter = rateLimit(`fes:login:${clientIp(request.headers)}`, RATE_LIMIT.limit, RATE_LIMIT.windowMs);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSec) } }
    );
  }

  if (!process.env.FES_ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'Server misconfigured. Set FES_ADMIN_PASSWORD.' },
      { status: 500 }
    );
  }

  let password = '';
  try {
    const body = await request.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(FES_AUTH_COOKIE, await createAuthToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}
