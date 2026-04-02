import { createClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export interface ApiKeyValidation {
  valid: boolean;
  clientName?: string;
  plan?: string;
  error?: string;
  keyId?: string;
}

export async function validateApiKey(
  key: string,
  endpoint: string
): Promise<ApiKeyValidation> {
  if (!key || !key.startsWith('ac_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, client_name, plan, requests_per_month, requests_used, is_active, allowed_endpoints')
      .eq('key', key)
      .single();

    if (error || !data) {
      return { valid: false, error: 'API key not found' };
    }

    if (!data.is_active) {
      return { valid: false, error: 'API key is inactive' };
    }

    if (data.requests_used >= data.requests_per_month) {
      return { valid: false, error: `Monthly limit reached (${data.requests_per_month} requests)` };
    }

    if (!data.allowed_endpoints.some((e: string) => endpoint.startsWith(e))) {
      return { valid: false, error: `Endpoint not allowed for plan ${data.plan}` };
    }

    // Incrementar contador de uso
    await supabaseAdmin
      .from('api_keys')
      .update({ 
        requests_used: data.requests_used + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', data.id);

    return {
      valid: true,
      clientName: data.client_name,
      plan: data.plan,
      keyId: data.id
    };

  } catch (err: any) {
    logger.error('API key validation error', err);
    return { valid: false, error: 'Validation service error' };
  }
}
