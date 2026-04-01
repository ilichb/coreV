import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@/lib/services/infrastructure/config.service';

// Lazy-initialized Supabase client to prevent build errors when env vars are missing
let _supabase: any = null;

export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    if (!_supabase) {
      const config = ConfigService.get();
      const url = config.supabase.url || 'https://placeholder.supabase.co';
      const key = config.supabase.serviceRole || config.supabase.anonKey || 'placeholder-key';
      
      _supabase = createClient(url, key, {
        auth: { persistSession: false },
        db: { schema: 'public' }
      });
    }
    return _supabase[prop];
  }
});
