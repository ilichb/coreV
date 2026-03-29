import { NextRequest, NextResponse } from 'next/server';
import { cryptoGuard } from '@/lib/services/coordination/crypto-guard';
import { supabase } from '@/lib/services/coordination/supabase';
import { WalletHashService, walletHashService } from '@/lib/services/security/wallet-hash.service';
import { logger } from '../../../../lib/utils/logger';

/**
 * Tipos de opt-out disponibles
 */
type OptOutScope = 'individual' | 'dao-member' | 'dao-wide';

/**
 * Targets para cada scope
 */
interface IndividualTargets {
  milestones?: string[]; // IDs de milestones específicos
  all?: boolean; // Todos los milestones del usuario
}

interface DAOMemberTargets {
  daoAddress: string;
  milestones?: string[]; // IDs específicos de esa DAO
  all?: boolean; // Todos los milestones en esa DAO
}

interface DAOWideTargets {
  daoAddress: string;
}

/**
 * Request body para opt-out
 */
interface OptOutRequest {
  scope: OptOutScope;
  targets: IndividualTargets | DAOMemberTargets | DAOWideTargets;
  wallet: string;
  signature: string;
  message?: string;
  reason?: string;
}

/**
 * Endpoint para Opt-Out de procesamiento de datos (GDPR Art. 21, CCPA)
 * 
 * Scopes:
 * - individual: Usuario individual opta-out de todo o milestones específicos
 * - dao-member: Miembro de DAO opta-out de actividad en esa DAO
 * - dao-wide: DAO entera opta-out de procesamiento de datos
 * 
 * POST /api/atlas/opt-out
 * Body: { scope, targets, wallet, signature, message?, reason? }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: OptOutRequest = await request.json();
    const { scope, targets, wallet, signature, message, reason } = body;

    // Validar campos requeridos
    if (!scope || !targets || !wallet || !signature) {
      return NextResponse.json(
        { 
          error: 'Campos requeridos: scope, targets, wallet y signature',
          code: 'ANDR-PRIV-010' 
        }, 
        { status: 400 }
      );
    }

    // Validar formato de wallet
    if (!WalletHashService.isValidWalletAddress(wallet)) {
      return NextResponse.json(
        { 
          error: 'Formato de wallet inválido',
          code: 'ANDR-PRIV-011',
          acceptedFormats: ['0x... (Ethereum address)', 'did:... (DID)']
        }, 
        { status: 400 }
      );
    }

    // Validar scope y targets
    const validationError = validateScopeAndTargets(scope, targets);
    if (validationError) {
      return NextResponse.json(
        { error: validationError, code: 'ANDR-PRIV-012' },
        { status: 400 }
      );
    }

    // Mensaje por defecto para firma
    const signMessage = message || `Andromeda Core - Opt-Out (${scope}) - ${Date.now()}`;

    // Verificar firma (misma lógica que /forget)
    const signatureValid = await verifySignature(wallet, signature, signMessage);
    if (!signatureValid.isValid) {
      return NextResponse.json(
        { 
          error: 'Firma inválida o no autenticada',
          code: 'ANDR-PRIV-013',
          details: signatureValid.error 
        }, 
        { status: 401 }
      );
    }

    // Hashear la wallet para privacidad
    const hashResult = walletHashService.hashWallet(wallet);
    const walletHash = hashResult.walletHash;

    // Aplicar opt-out según scope
    let applicationResult;
    switch (scope) {
      case 'individual':
        applicationResult = await applyIndividualOptOut(wallet, walletHash, targets as IndividualTargets, reason);
        break;
      case 'dao-member':
        applicationResult = await applyDAOMemberOptOut(wallet, walletHash, targets as DAOMemberTargets, reason);
        break;
      case 'dao-wide':
        applicationResult = await applyDAOWideOptOut(wallet, walletHash, targets as DAOWideTargets, reason);
        break;
      default:
        return NextResponse.json(
          { error: 'Scope no válido', code: 'ANDR-PRIV-014' },
          { status: 400 }
        );
    }

    // Registrar en logs de auditoría
    const { error: auditError } = await supabase
      .from('privacy_audit_logs')
      .insert({
        wallet,
        walletHash,
        action: `OPT_OUT_${scope.toUpperCase()}`,
        scope,
        targets: JSON.stringify(targets),
        signature: signature.substring(0, 32) + '...',
        reason: reason || null,
        requestOrigin: request.headers.get('origin') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });

    if (auditError) {
      logger.warn('Error registrando en audit log:', auditError);
    }

    // En producción, registrar en Vara Network
    let txHash = null;
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar con Vara Network para registro inmutable
      // txHash = await registerOptOutOnChain(wallet, scope, targets, walletHash);
    }

    return NextResponse.json({
      success: true,
      message: `Opt-Out (${scope}) aplicado exitosamente`,
      details: {
        scope,
        walletHash,
        applied: applicationResult,
        auditLogged: !auditError,
        txHash,
        note: getOptOutNote(scope, targets)
      },
      legal: {
        gdpr: scope === 'individual' ? 'Artículo 21 - Derecho de oposición' : 'Artículo 7 - Consentimiento',
        ccpa: 'Sección 1798.120 - Derecho a optar por no participar',
        effect: getLegalEffect(scope),
        retention: 'Los datos permanecen cifrados para cumplimiento legal y análisis agregados',
        contact: 'legal@andromedacore.org para consultas o reversión'
      }
    });

  } catch (error: any) {
    logger.error('Error en endpoint /api/atlas/opt-out:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      code: 'ANDR-PRIV-500',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      note: 'Contacte a soporte@andromedacore.org si el error persiste'
    }, { status: 500 });
  }
}

/**
 * Validar scope y targets
 */
function validateScopeAndTargets(scope: OptOutScope, targets: any): string | null {
  switch (scope) {
    case 'individual':
      if (!targets.milestones && !targets.all) {
        return 'Individual scope requiere milestones array o all=true';
      }
      if (targets.milestones && !Array.isArray(targets.milestones)) {
        return 'milestones debe ser un array de IDs';
      }
      break;
    
    case 'dao-member':
      if (!targets.daoAddress) {
        return 'dao-member scope requiere daoAddress';
      }
      if (!targets.milestones && !targets.all) {
        return 'dao-member scope requiere milestones array o all=true';
      }
      if (targets.milestones && !Array.isArray(targets.milestones)) {
        return 'milestones debe ser un array de IDs';
      }
      break;
    
    case 'dao-wide':
      if (!targets.daoAddress) {
        return 'dao-wide scope requiere daoAddress';
      }
      break;
    
    default:
      return `Scope no válido: ${scope}`;
  }
  return null;
}

/**
 * Verificar firma (reutilizable)
 */
async function verifySignature(wallet: string, signature: string, message: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    if (wallet.startsWith('did:')) {
      const didParts = wallet.split(':');
      if (didParts.length < 3) {
        return { isValid: false, error: 'Formato DID inválido' };
      }

      const chain = didParts[2];
      if (chain === 'sol') {
        const result = await cryptoGuard.verifyEd25519(wallet, signature, message);
        return { isValid: result.isValid, error: result.error };
      } else {
        const domain = {
          name: 'Andromeda Core Privacy',
          version: '1',
          chainId: 1,
          verifyingContract: '0x0000000000000000000000000000000000000000'
        };
        
        const dummyScorecard = {
          metadata: {
            version: '1.0',
            created: new Date().toISOString(),
            authorDid: wallet
          },
          "A. Problema": {},
          "B. Límites": {},
          "C. Especificación Técnica": {},
          "D. Esfuerzo": {}
        };
        
        const result = await cryptoGuard.verifyEIP712(wallet, signature, dummyScorecard as any, domain);
        return { isValid: result.isValid, error: result.error };
      }
    } else {
      const { ethers } = await import('ethers');
      const recovered = ethers.verifyMessage(message, signature);
      return { 
        isValid: recovered.toLowerCase() === wallet.toLowerCase(),
        error: recovered.toLowerCase() !== wallet.toLowerCase() ? 'Wallet no coincide con firma' : undefined
      };
    }
  } catch (error: any) {
    return { isValid: false, error: error.message };
  }
}

/**
 * Aplicar opt-out individual
 */
async function applyIndividualOptOut(
  wallet: string, 
  walletHash: string, 
  targets: IndividualTargets,
  reason?: string
): Promise<any> {
  const results = [];
  
  // 1. Marcar perfil como opt-out
  const { error: profileError } = await supabase
    .from('builder_profiles')
    .update({ 
      optOut: true,
      optOutAt: new Date().toISOString(),
      optOutReason: reason || 'USER_REQUEST',
      walletHash
    })
    .eq('wallet', wallet.toLowerCase());

  results.push({
    action: 'PROFILE_OPT_OUT',
    success: !profileError,
    error: profileError?.message
  });

  // 2. Marcar milestones específicos o todos
  if (targets.all) {
    // Todos los milestones del usuario
    const { error: milestonesError } = await supabase
      .from('atlas_milestones')
      .update({ 
        privacy_visibility: 'RESTRICTED',
        optOutApplied: true,
        updatedAt: new Date().toISOString()
      })
      .eq('action.metadata.builderDid', wallet);

    results.push({
      action: 'ALL_MILESTONES_RESTRICTED',
      success: !milestonesError,
      count: 'all',
      error: milestonesError?.message
    });
  } else if (targets.milestones && targets.milestones.length > 0) {
    // Milestones específicos
    const { error: milestonesError } = await supabase
      .from('atlas_milestones')
      .update({ 
        privacy_visibility: 'RESTRICTED',
        optOutApplied: true,
        updatedAt: new Date().toISOString()
      })
      .in('atlasId', targets.milestones);

    results.push({
      action: 'SPECIFIC_MILESTONES_RESTRICTED',
      success: !milestonesError,
      count: targets.milestones.length,
      error: milestonesError?.message
    });
  }

  return results;
}

/**
 * Aplicar opt-out para miembro de DAO
 */
async function applyDAOMemberOptOut(
  wallet: string,
  walletHash: string,
  targets: DAOMemberTargets,
  reason?: string
): Promise<any> {
  const { daoAddress } = targets;
  const results = [];
  
  // 1. Registrar relación DAO-member opt-out
  const { error: relationError } = await supabase
    .from('dao_member_opt_outs')
    .insert({
      daoAddress: daoAddress.toLowerCase(),
      memberWallet: wallet.toLowerCase(),
      memberWalletHash: walletHash,
      optedOutAt: new Date().toISOString(),
      reason: reason || 'DAO_MEMBER_REQUEST'
    });

  results.push({
    action: 'DAO_MEMBER_OPT_OUT_REGISTERED',
    success: !relationError,
    daoAddress,
    error: relationError?.message
  });

  // 2. Marcar milestones específicos de esa DAO
  let query = supabase
    .from('atlas_milestones')
    .update({ 
      privacy_visibility: 'RESTRICTED',
      daoOptOutApplied: true,
      updatedAt: new Date().toISOString()
    })
    .eq('action.metadata.builderDid', wallet);

  // Filtrar por DAO si está en metadata
  query = query.eq('action.metadata.daoAddress', daoAddress);

  if (targets.all) {
    // Todos los milestones en esa DAO
    const { error: milestonesError } = await query;
    results.push({
      action: 'ALL_DAO_MILESTONES_RESTRICTED',
      success: !milestonesError,
      daoAddress,
      error: milestonesError?.message
    });
  } else if (targets.milestones && targets.milestones.length > 0) {
    // Milestones específicos
    const { error: milestonesError } = await query.in('atlasId', targets.milestones);
    results.push({
      action: 'SPECIFIC_DAO_MILESTONES_RESTRICTED',
      success: !milestonesError,
      daoAddress,
      count: targets.milestones.length,
      error: milestonesError?.message
    });
  }

  return results;
}

/**
 * Aplicar opt-out para DAO completa
 */
async function applyDAOWideOptOut(
  wallet: string,
  walletHash: string,
  targets: DAOWideTargets,
  reason?: string
): Promise<any> {
  const { daoAddress } = targets;
  const results = [];
  
  // 1. Registrar DAO-wide opt-out (requiere verificación de múltiples firmas en producción)
  const { error: daoOptOutError } = await supabase
    .from('dao_opt_outs')
    .insert({
      daoAddress: daoAddress.toLowerCase(),
      requestedBy: wallet.toLowerCase(),
      requestedByHash: walletHash,
      optedOutAt: new Date().toISOString(),
      status: 'PENDING', // Requiere verificación de múltiples firmas
      reason: reason || 'DAO_WIDE_REQUEST'
    });

  results.push({
    action: 'DAO_WIDE_OPT_OUT_REGISTERED',
    success: !daoOptOutError,
    daoAddress,
    status: 'PENDING_VERIFICATION',
    error: daoOptOutError?.message
  });

  // 2. En modo desarrollo, aplicar inmediatamente
  if (process.env.NODE_ENV === 'development') {
    const { error: milestonesError } = await supabase
      .from('atlas_milestones')
      .update({ 
        privacy_visibility: 'RESTRICTED',
        daoWideOptOutApplied: true,
        updatedAt: new Date().toISOString()
      })
      .eq('action.metadata.daoAddress', daoAddress);

    results.push({
      action: 'DAO_MILESTONES_RESTRICTED',
      success: !milestonesError,
      daoAddress,
      note: 'Applied immediately in development mode',
      error: milestonesError?.message
    });
  }

  return results;
}

/**
 * Obtener nota informativa según scope
 */
function getOptOutNote(scope: OptOutScope, targets: any): string {
  switch (scope) {
    case 'individual':
      if (targets.all) {
        return 'Todos tus milestones han sido restringidos. Tu perfil no aparecerá en rankings públicos.';
      } else {
        return `Milestones específicos (${targets.milestones?.length || 0}) han sido restringidos.`;
      }
    
    case 'dao-member':
      return `Tu actividad en la DAO ${targets.daoAddress.substring(0, 10)}... ha sido restringida.`;
    
    case 'dao-wide':
      return `Opt-out de DAO registrado. Requiere verificación de múltiples firmas para activación completa.`;
    
    default:
      return 'Opt-out aplicado.';
  }
}

/**
 * Obtener efecto legal según scope
 */
function getLegalEffect(scope: OptOutScope): string {
  switch (scope) {
    case 'individual':
      return 'Exclusión de rankings públicos y búsquedas. Datos preservados para análisis agregados.';
    
    case 'dao-member':
      return 'Exclusión de actividad específica en DAO. Relación DAO-member preservada para auditoría.';
    
    case 'dao-wide':
      return 'Suspensión de procesamiento de datos de DAO completa. Requiere consenso DAO.';
    
    default:
      return 'Efecto legal aplicado según normativa.';
  }
}

/**
 * GET endpoint para información sobre opt-out
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/atlas/opt-out',
    method: 'POST',
    description: 'Opt-Out de procesamiento de datos (GDPR Art. 21, CCPA)',
    scopes: {
      individual: {
        description: 'Usuario individual opta-out de todo o milestones específicos',
        targets: {
          milestones: 'Array de milestone IDs a restringir',
          all: 'true para restringir todos los milestones'
        },
        effect: 'Perfil oculto en rankings, milestones restringidos'
      },
      'dao-member': {
        description: 'Miembro de DAO opta-out de actividad en DAO específica',
        targets: {
          daoAddress: 'Dirección de la DAO',
          milestones: 'Array de milestone IDs en esa DAO',
          all: 'true para toda actividad en la DAO'
        },
        effect: 'Actividad en DAO restringida, perfil general preservado'
      },
      'dao-wide': {
        description: 'DAO completa opta-out de procesamiento de datos',
        targets: {
          daoAddress: 'Dirección de la DAO'
        },
        effect: 'Requiere múltiples firmas, suspende procesamiento de datos de la DAO'
      }
    },
    requirements: {
      wallet: 'Dirección Ethereum (0x...) o DID (did:...)',
      signature: 'Firma EIP-712 (EVM) o Ed25519 (Solana)',
      scope: 'Tipo de opt-out (individual, dao-member, dao-wide)',
      targets: 'Objetivos específicos según scope'
    },
    legal: {
      gdpr: {
        individual: 'Artículo 21 - Derecho de oposición',
        'dao-member': 'Artículo 7 - Consentimiento retirado',
        'dao-wide': 'Artículo 6(1)(a) - Base legal por consentimiento'
      },
      ccpa: 'Sección 1798.120 - Derecho a optar por no participar',
      exceptions: 'Datos necesarios para cumplimiento legal, investigación histórica, análisis agregados'
    },
    contact: 'legal@andromedacore.org',
    documentation: 'https://docs.andromedacore.org/privacy/opt-out'
  });
}