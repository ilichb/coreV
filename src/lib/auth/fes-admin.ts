// Edge-compatible (Middleware + Route Handlers). Sin imports de Node.

export const FES_AUTH_COOKIE = 'fes_admin_auth';
const TOKEN_CONTEXT = 'fes-admin-auth-v1';

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function expectedToken(password: string): Promise<string> {
  return hmacHex(password, TOKEN_CONTEXT);
}

export async function createAuthToken(): Promise<string> {
  return expectedToken(process.env.FES_ADMIN_PASSWORD || '');
}

export async function isValidAuthToken(
  token: string | undefined | null
): Promise<boolean> {
  const pwd = process.env.FES_ADMIN_PASSWORD;
  if (!token || !pwd) return false;
  try {
    return safeEqual(token, await expectedToken(pwd));
  } catch {
    return false;
  }
}

export function verifyAdminPassword(
  input: string | undefined | null
): boolean {
  const pwd = process.env.FES_ADMIN_PASSWORD;
  if (!input || !pwd) return false;
  return safeEqual(input, pwd);
}
