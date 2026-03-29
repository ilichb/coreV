// Debug version
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';

logger.info('=== DEBUG SUPABASE ===');
logger.info('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
logger.info('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
logger.info('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
logger.info('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');

// Continuar con lógica normal...
