import { createClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';

// Removed dotenv require to avoid Turbopack ChunkLoadError.

// Usar variables de entorno o valores por defecto para evitar fallos catastróficos en tests
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '***REMOVED***';

// Debug: mostrar qué URL se está usando (solo en desarrollo)
if (supabaseUrl.includes('placeholder') && typeof window === 'undefined') {
  logger.warn('⚠️ Supabase usando URL placeholder. Verifica NEXT_PUBLIC_SUPABASE_URL en .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

/**
 * Verifica si un nonce ya ha sido usado por un DID
 */
export async function checkNonce(nonce: string, proponentDid: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('nonces')
      .select('*')
      .eq('nonce', nonce)
      .eq('proponent_did', proponentDid)
      .maybeSingle();

    if (error) {
      logger.warn('Error verificando nonce:', error);
      return false;
    }

    return !!data; // Si existe, ya fue usado
  } catch (error) {
    logger.error('Error en checkNonce:', error);
    return false;
  }
}

/**
 * Marca un nonce como usado
 */
export async function markNonceUsed(nonce: string, proponentDid: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('nonces')
      .insert({
        nonce,
        proponent_did: proponentDid,
        used_at: new Date().toISOString()
      });

    if (error) {
      logger.error('Error marcando nonce como usado:', error);
    }
  } catch (error) {
    logger.error('Error en markNonceUsed:', error);
  }
}

/**
 * Verifica si un scorecard ya existe por su CID de IPFS
 */
export async function scorecardExists(ipfsCid: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('scorecards')
      .select('id')
      .eq('ipfs_cid', ipfsCid)
      .maybeSingle();

    if (error) {
      logger.warn('Error verificando scorecard:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('Error en scorecardExists:', error);
    return false;
  }
}

/**
 * Guarda un scorecard final en la base de datos
 */
export async function saveFinalScorecard(scorecardData: any): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('scorecards')
      .insert({
        proponent_did: scorecardData.proponentDid,
        content: scorecardData.content,
        clarity_delta: scorecardData.clarityDelta,
        ipfs_cid: scorecardData.ipfsCid,
        canonical_hash: scorecardData.canonicalHash,
        signature: scorecardData.signature || null,
        signer_did: scorecardData.signerDid || scorecardData.proponentDid,
        chain: scorecardData.chain || 'eth',
        nonce: scorecardData.nonce || null,
        signature_type: scorecardData.signatureType || 'none',
        status: scorecardData.status || 'validated',
        validated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Error guardando scorecard:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error en saveFinalScorecard:', error);
    throw error;
  }
}
