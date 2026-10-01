/**
 * Supabase Admin Client (service role, server-only)
 *
 * IMPORTANTE: este módulo usa SUPABASE_SERVICE_ROLE_KEY, que bypasea RLS.
 * Solo debe importarse desde Route Handlers, services de servidor o scripts.
 * NUNCA desde un componente cliente ('use client') ni desde middleware.
 *
 * Por qué existe aparte de `supabase.ts`:
 *   - `supabase.ts` usa NEXT_PUBLIC_ANON_KEY, que respeta RLS. Las lecturas
 *     funcionan, pero los INSERT fallan con 42501. Ese cliente se mantiene
 *     igual para no cambiar el comportamiento de los endpoints de Atlas.
 *   - Este cliente es exclusive para el camino de escritura del FES.
 *
 * Preflight: valida que el service role key pertenezca al MIS proyecto que
 * la URL configurada. Un key de otro proyecto devuelve "Invalid API key" de
 * forma opaca, que es exactamente la falla que nos mordió antes.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';

if (typeof window !== 'undefined') {
  throw new Error(
    '[supabase-admin] Importado en contexto cliente. El service role key no puede exponerse al browser.'
  );
}

function extractProjectRef(url: string): string | null {
  const m = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\./i);
  return m ? m[1] : null;
}

/** Decodifica el payload de un JWT sin verificar firma (solo para diagnóstico). */
function decodeJwtClaims(jwt: string): Record<string, any> | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function resolveSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) throw new Error('[supabase-admin] NEXT_PUBLIC_SUPABASE_URL no definida.');
  return url;
}

function resolveServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      '[supabase-admin] SUPABASE_SERVICE_ROLE_KEY no definida. Regenerala en el panel de Supabase (Project Settings → API).'
    );
  }

  const urlRef = extractProjectRef(resolveSupabaseUrl());
  const claims = decodeJwtClaims(key);

  // Los keys nuevos estilo sb_secret_ no son JWT: no se pueden verificar por ref.
  if (claims?.ref && urlRef && claims.ref !== urlRef) {
    throw new Error(
      `[supabase-admin] El service role key pertenece al proyecto "${claims.ref}" ` +
      `pero la URL configurada apunta a "${urlRef}". ` +
      `Supabase responderá "Invalid API key". Regenerá la key en el proyecto ${urlRef}.`
    );
  }

  if (claims?.exp && claims.exp * 1000 < Date.now()) {
    throw new Error('[supabase-admin] El service role key está expirado. Regenerala.');
  }

  return key;
}

let cached: SupabaseClient | null = null;
let cachedKey: string | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();

  if (cached && cachedKey === key) return cached;

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });
  cachedKey = key;

  logger.info('[supabase-admin] Cliente service role inicializado', { projectRef: extractProjectRef(url) });
  return cached;
}

/**
 * Ejecuta una operación de escritura y normaliza el error.
 * Los errores de PostgREST son poco descriptivos por defecto; acá se anotan
 * el código y el mensaje real para que no se pierdan en un log genérico.
 *
 * No se valida `data`: un upsert/update sin `.select()` devuelve `null` en
 * caso de éxito, así que verificarlo acá produciría falsos positivos.
 * Los callers que necesitan la fila usan `.select()` y la chequean ellos.
 */
export async function adminWrite<T = unknown>(
  operation: string,
  fn: (client: SupabaseClient) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T> {
  const client = getSupabaseAdmin();
  const { data, error } = await fn(client);

  if (error) {
    const e = error as { code?: string; message?: string; hint?: string };
    const detail = `${e.code ?? 'NO_CODE'}: ${e.message ?? 'sin mensaje'}` +
      (e.hint ? ` (hint: ${e.hint})` : '');
    throw new Error(`[supabase-admin] ${operation} falló → ${detail}`);
  }

  return data as T;
}
