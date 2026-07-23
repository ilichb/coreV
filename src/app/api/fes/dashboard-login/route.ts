import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Rate limiting: Map<IP, { count: number; lastAttempt: number }>
const rateLimitMap = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { count: 1, firstAttempt: now });
    return true;
  }

  // Ventana expirada → reset
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstAttempt: now });
    return true;
  }

  // Dentro de la ventana
  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting ───────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts' },
        { status: 429 }
      );
    }

    // ── Validar body ────────────────────────────────────────────────────────
    const body = await request.json().catch(() => null);
    if (!body || typeof body.password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    const { password } = body;
    const expected = process.env.FES_DASHBOARD_PASSWORD || '';

    if (!expected) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // ── Comparar contraseña ──────────────────────────────────────────────────
    if (password !== expected) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // ── Generar UUID de sesión y establecer cookie ───────────────────────────
    const sessionId = crypto.randomUUID();

    const isProduction = process.env.NODE_ENV === 'production';

    const cookieStore = await cookies();
    cookieStore.set('fes_dashboard_session', sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 28800, // 8 horas
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}