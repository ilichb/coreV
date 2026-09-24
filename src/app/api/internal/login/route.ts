import { NextResponse } from 'next/server';
import {
  FES_AUTH_COOKIE,
  createAuthToken,
  verifyAdminPassword,
} from '@/lib/auth/fes-admin';

export async function POST(request: Request) {
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
