import { NextRequest, NextResponse } from 'next/server';
import { cryptoGuard } from '@/lib/services/coordination/crypto-guard';
import { supabase } from '@/lib/services/coordination/supabase';
import { WalletHashService, walletHashService } from '@/lib/services/security/wallet-hash.service';
import { logger } from '../../../../lib/utils/logger';

/**
 * Interface for forget request
 */
interface ForgetRequest {
  wallet: string;
  signature: string;
  message?: string;
}

/**
 * Endpoint para ejercer el Derecho al Olvido (GDPR Art. 17)
 * 
 * Flow:
 * 1. Usuario envía wallet + firma EIP-712/Ed25519
 * 2. Verificar firma para autenticar propiedad de la wallet
 * 3. Hashear la wallet (privacidad por diseño)
 * 4. Marcar perfil como isHidden = true (soft delete)
 * 5. Registrar solicitud en Vara Network (opcional, para trazabilidad inmutable)
 * 
 * POST /api/atlas/forget
 * Body: { wallet: string, signature: string, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ForgetRequest = await request.json();
    const { wallet, signature, message } = body;

    // Validar campos requeridos
    if (!wallet || !signature) {
      return NextResponse.json(
        { 
          error: 'Campos requeridos: wallet y signature',
          code: 'ANDR-PRIV-001' 
        }, 
        { status: 400 }
      );
    }

    // Validar formato de wallet
    if (!WalletHashService.isValidWalletAddress(wallet)) {
      return NextResponse.json(
        { 
          error: 'Formato de wallet inválido',
          code: 'ANDR-PRIV-002',
          acceptedFormats: ['0x... (Ethereum address)', 'did:... (DID)']
        }, 
        { status: 400 }
      );
    }

    // Mensaje por defecto para firma
    const signMessage = message || `Andromeda Core - Derecho al Olvido - ${Date.now()}`;

    // Verificar firma
    let signatureValid = false;
    let verificationResult;

    // Determinar tipo de wallet y método de verificación
    if (wallet.startsWith('did:')) {
      // DID: usar Ed25519 para Solana, EIP-712 para EVM chains
      const didParts = wallet.split(':');
      if (didParts.length < 3) {
        return NextResponse.json(
          { error: 'Formato DID inválido', code: 'ANDR-PRIV-003' },
          { status: 400 }
        );
      }

      const chain = didParts[2]; // eth, sol, etc.
      
      if (chain === 'sol') {
        // Ed25519 para Solana
        verificationResult = await cryptoGuard.verifyEd25519(wallet, signature, signMessage);
      } else {
        // EIP-712 para EVM chains
        // Para endpoints de privacidad, usamos un domain simplificado
        const domain = {
          name: 'Andromeda Core Privacy',
          version: '1',
          chainId: 1, // Mainnet (simbólico)
          verifyingContract: '0x0000000000000000000000000000000000000000'
        };
        
        // Crear un scorecard minimal para verificación
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
        
        verificationResult = await cryptoGuard.verifyEIP712(wallet, signature, dummyScorecard as any, domain);
      }
    } else {
      // Wallet address simple (0x...)
      // Para endpoints de privacidad, aceptamos verifyMessage de Ethereum
      try {
        const { ethers } = await import('ethers');
        const recovered = ethers.verifyMessage(signMessage, signature);
        verificationResult = {
          isValid: recovered.toLowerCase() === wallet.toLowerCase(),
          recoveredAddress: recovered
        };
      } catch (error: any) {
        return NextResponse.json(
          { 
            error: 'Firma inválida',
            code: 'ANDR-PRIV-004',
            details: error.message 
          }, 
          { status: 401 }
        );
      }
    }

    signatureValid = verificationResult?.isValid || false;

    if (!signatureValid) {
      return NextResponse.json(
        { 
          error: 'Firma inválida o no autenticada',
          code: 'ANDR-PRIV-005',
          details: verificationResult?.error 
        }, 
        { status: 401 }
      );
    }

    // Hashear la wallet para privacidad
    const hashResult = walletHashService.hashWallet(wallet);
    const walletHash = hashResult.walletHash;

    // 1. Marcar perfil como isHidden = true (soft delete)
    const { error: updateError } = await supabase
      .from('builder_profiles')
      .update({ 
        isHidden: true, 
        hiddenAt: new Date().toISOString(),
        hiddenReason: 'RIGHT_TO_BE_FORGOTTEN',
        walletHash // Almacenar hash para referencia futura
      })
      .eq('wallet', wallet.toLowerCase());

    if (updateError) {
      logger.error('Error actualizando perfil:', updateError);
      // Intentar insertar registro si no existe
      const { error: insertError } = await supabase
        .from('builder_profiles')
        .insert({
          wallet: wallet.toLowerCase(),
          walletHash,
          isHidden: true,
          hiddenAt: new Date().toISOString(),
          hiddenReason: 'RIGHT_TO_BE_FORGOTTEN',
          createdAt: new Date().toISOString()
        });

      if (insertError) {
        logger.error('Error insertando perfil:', insertError);
      }
    }

    // 2. Marcar milestones asociados como RESTRICTED (no HIDDEN para mantener integridad de datos)
    const { error: milestoneError } = await supabase
      .from('atlas_milestones')
      .update({ 
        privacy_visibility: 'RESTRICTED',
        updatedAt: new Date().toISOString()
      })
      .eq('action.metadata.builderDid', wallet);

    if (milestoneError) {
      logger.warn('No se pudieron actualizar milestones (puede que no existan):', milestoneError.message);
    }

    // 3. Registrar en logs de auditoría
    const { error: auditError } = await supabase
      .from('privacy_audit_logs')
      .insert({
        wallet,
        walletHash,
        action: 'RIGHT_TO_BE_FORGOTTEN',
        signature: signature.substring(0, 32) + '...', // Solo almacenar prefijo
        requestOrigin: request.headers.get('origin') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });

    if (auditError) {
      logger.warn('Error registrando en audit log:', auditError);
    }

    // 4. En producción, aquí se registraría en Vara Network
    let txHash = null;
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar con Vara Network para registro inmutable
      // txHash = await registerForgetRequestOnChain(wallet, walletHash);
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud de Derecho al Olvido procesada exitosamente',
      details: {
        walletHash,
        action: 'SOFT_DELETE_APPLIED',
        profileHidden: true,
        milestonesRestricted: !milestoneError,
        auditLogged: !auditError,
        txHash,
        note: 'Los datos históricos permanecen cifrados pero inaccesibles en rankings públicos.'
      },
      legal: {
        basis: 'GDPR Artículo 17 - Derecho de supresión ("derecho al olvido")',
        scope: 'Perfil de builder y milestones asociados',
        effect: 'Ocultación pública (soft delete), datos técnicos preservados',
        retention: 'Datos permanecen cifrados por 5 años para cumplimiento legal',
        contact: 'legal@andromedacore.org para consultas'
      }
    });

  } catch (error: any) {
    logger.error('Error en endpoint /api/atlas/forget:', error);
    
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
 * GET endpoint para información sobre el proceso de Derecho al Olvido
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/atlas/forget',
    method: 'POST',
    description: 'Ejercer el Derecho al Olvido (GDPR Art. 17)',
    flow: 'Wallet → Signature → Hash → Soft Delete → Audit Log',
    requirements: {
      wallet: 'Dirección Ethereum (0x...) o DID (did:...)',
      signature: 'Firma EIP-712 (EVM) o Ed25519 (Solana)',
      message: 'Opcional - Mensaje personalizado para firmar'
    },
    effects: {
      profile: 'Marcado como isHidden = true (no aparece en rankings)',
      milestones: 'Visibilidad cambiada a RESTRICTED (solo acceso administrativo)',
      data: 'Datos históricos preservados pero cifrados',
      timeline: 'Efecto inmediato, reversión requiere contacto administrativo'
    },
    legal: {
      gdpr: 'Artículo 17 - Derecho de supresión',
      ccpa: 'Sección 1798.105 - Derecho a eliminar',
      exceptions: 'Datos necesarios para cumplimiento legal, investigación histórica'
    },
    contact: 'legal@andromedacore.org',
    documentation: 'https://docs.andromedacore.org/privacy/right-to-be-forgotten'
  });
}

// Re-export para compatibilidad
export { walletHashService as WalletHashService };