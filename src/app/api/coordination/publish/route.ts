/**
 * Andromeda Core - Publish Endpoint (Fase 4 - Con Registry Integration)
 * Flow: Challenge → Signature Verification → IPFS → Registry Validation → Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateForSubmission } from '../../../../lib/coordination/validators/functional-validator';
import { uploadScorecardToIPFS } from '../../../../lib/services/coordination/ipfs-adapter';
import { saveFinalScorecard, scorecardExists, markNonceUsed, checkNonce } from '../../../../lib/services/coordination/supabase';
import { cryptoGuard } from '../../../../lib/services/coordination/crypto-guard';
import { registryService } from '../../../../lib/services/coordination/registry';
import { varaAdapter } from "@/lib/services/coordination/vara-adapter";
import { redisService } from '../../../../lib/services/coordination/redis-upstash';
import { Scorecard, parseDid } from '../../../../types/coordination/scorecard';
import { logger } from '../../../../lib/utils/logger';
import { achievementWebhookService } from '../../../../lib/services/notifications/achievement-webhook.service';
import { avipViemAdapter } from '../../../../lib/services/coordination/avip-viem-adapter';

// Configuración EIP-712 para Ethereum y cadenas EVM
const EIP712_DOMAIN = {
  name: process.env.NEXT_PUBLIC_EIP712_DOMAIN_NAME || 'Andromeda Coordination Layer',
  version: process.env.NEXT_PUBLIC_EIP712_VERSION || '1',
  chainId: parseInt(process.env.NEXT_PUBLIC_EIP712_CHAIN_ID || '1'),
  verifyingContract: process.env.NEXT_PUBLIC_EIP712_VERIFYING_CONTRACT || '0x0000000000000000000000000000000000000000'
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';

  logger.info('Publish request received', { clientIp });

  try {
    // 1. Rate Limiting con Redis
    const rateLimitKey = `rate_limit:publish:${clientIp}`;
    const rateLimit = await redisService.checkRateLimit(rateLimitKey, 5, 60);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Maximum 5 requests per minute allowed`,
          retryAfter: rateLimit.resetAfter
        },
        { status: 429 }
      );
    }

    // 2. Parse request
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const { scorecard, proponentDid, signature, nonce, chain = 'eth', telegramUsername, email } = body;

    if (!scorecard || !proponentDid) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'scorecard and proponentDid are required',
          required: ['scorecard', 'proponentDid'],
          optional: ['signature', 'nonce', 'chain']
        },
        { status: 400 }
      );
    }

    logger.debug('Processing scorecard for publication', { proponentDid, chain });

    // 3. Validar estructura del DID
    let didParts;
    try {
      didParts = parseDid(proponentDid);
      logger.info('DID parsed successfully', { chain: didParts.chain, addressPrefix: didParts.address.substring(0, 10) });
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'Invalid DID format',
          message: error.message,
          expectedFormat: 'did:andromeda:{chain}:{address}',
          example: 'did:andromeda:eth:0x1234...'
        },
        { status: 400 }
      );
    }

    // 4. Verificar firma (Fase 4 crítica)
    let signatureData = null;
    if (signature && nonce) {
      logger.info('Verifying cryptographic signature', { chain: didParts.chain });

      // 4.1 Verificar que el nonce no haya sido usado
      const nonceUsed = await checkNonce(nonce, proponentDid);
      if (nonceUsed) {
        return NextResponse.json(
          {
            error: 'Nonce already used',
            message: 'This nonce has already been used. Generate a new challenge.',
            code: 'ANDR-NONCE-001'
          },
          { status: 400 }
        );
      }

      // 4.2 Verificar la firma según el chain
      try {
        let signatureResult;
        if (didParts.chain === 'sol') {
          // Ed25519 para Solana
          const message = JSON.stringify({
            did: proponentDid,
            nonce,
            timestamp: new Date().toISOString()
          });

          signatureResult = await cryptoGuard.verifyEd25519(
            proponentDid,
            signature,
            message
          );
        } else {
          // EIP-712 para EVM chains (eth, pol, avax)
          signatureResult = await cryptoGuard.verifyEIP712(
            proponentDid,
            signature,
            scorecard as Scorecard,
            EIP712_DOMAIN
          );
        }

        if (!signatureResult.isValid) {
          return NextResponse.json(
            {
              error: 'Invalid signature',
              message: signatureResult.error || 'Signature verification failed',
              code: 'ANDR-SIG-001'
            },
            { status: 401 }
          );
        }

        logger.info('Signature verified successfully', { recovered: signatureResult.recoveredAddress || didParts.address });

        // 4.3 Preparar datos de firma para el registry
        signatureData = {
          signerDid: proponentDid,
          signature,
          chain: didParts.chain,
          nonce,
          signatureType: didParts.chain === 'sol' ? 'Ed25519' : 'EIP-712' as 'EIP-712' | 'Ed25519' | 'none'
        };

        // 4.4 Marcar nonce como usado
        await markNonceUsed(nonce, proponentDid);

      } catch (error: any) {
        return NextResponse.json(
          {
            error: 'Signature verification failed',
            message: error.message,
            code: 'ANDR-SIG-002'
          },
          { status: 400 }
        );
      }
    } else {
      logger.info('⚠️  No signature provided - proceeding without verification');
    }

    // 5. Validar scorecard
    let validationResult;
    try {
      validationResult = validateForSubmission(scorecard);
      logger.info(`✅ Scorecard validated: Clarity Delta = ${validationResult.clarityDelta}`);
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: error.message,
          details: 'Scorecard does not meet Andromeda Core standards',
          statusCode: 400
        },
        { status: 400 }
      );
    }

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Scorecard validation did not pass',
          details: validationResult.errors,
          warnings: validationResult.warnings,
          clarityDelta: validationResult.clarityDelta,
          statusCode: 400
        },
        { status: 400 }
      );
    }

    // 6. Upload to IPFS
    let ipfsResult;
    try {
      ipfsResult = await uploadScorecardToIPFS(scorecard as Scorecard, 3);

      logger.info(`📦 Uploaded to IPFS: ${ipfsResult.cid}`);
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'IPFS upload failed',
          message: error.message,
          details: 'Failed to persist scorecard to decentralized storage',
          suggestion: 'Check Pinata configuration and network connectivity'
        },
        { status: 502 }
      );
    }

    // 7. Check for duplicates in scorecards table
    try {
      const exists = await scorecardExists(ipfsResult.cid);
      if (exists) {
        return NextResponse.json(
          {
            error: 'Duplicate scorecard',
            message: `Scorecard with CID ${ipfsResult.cid} already exists`,
            cid: ipfsResult.cid,
            status: 'already_published'
          },
          { status: 409 }
        );
      }
    } catch (error: any) {
      logger.warn('⚠️ Error checking for duplicates:', error.message);
    }

    // 8. REGISTRY INTEGRATION - Validar con invariantes del Core
    logger.info('⚙️ Validating with Andromeda Core invariants...');
    let registryResult;
    try {
      registryResult = await registryService.publishScorecard(
        scorecard,
        ipfsResult.cid,
        signatureData || undefined
      );

      if (!registryResult.success) {
        return NextResponse.json(
          {
            error: 'Registry validation failed',
            message: registryResult.error || 'Scorecard rejected by Andromeda Core invariants',
            validationResult: registryResult.validationResult,
            warnings: registryResult.warnings,
            code: 'ANDR-IFC-001'
          },
          { status: 400 }
        );
      }

      logger.info(`✅ Registry validation passed: ${registryResult.registryEntry?.canonical_hash}`);
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'Registry service error',
          message: error.message,
          details: 'Failed to validate with Andromeda Core invariants',
          code: 'ANDR-REG-001'
        },
        { status: 500 }
      );
    }

    // 9. Save to Supabase (scorecards table) - SIN registryValidation
    let dbRecord: any;
    try {
      // Crear objeto de datos sin registryValidation
      const scorecardData = {
        proponentDid,
        content: scorecard as Scorecard,
        clarityDelta: validationResult.clarityDelta,
        ipfsCid: ipfsResult.cid,
        canonicalHash: registryResult.registryEntry?.canonical_hash || cryptoGuard.generateCanonicalHash(scorecard as Scorecard),
        signature: signature || undefined,
        signerDid: proponentDid,
        chain: didParts.chain,
        nonce: nonce || undefined,
        signatureType: (signature ? (didParts.chain === 'sol' ? 'Ed25519' : 'EIP-712') : 'none') as 'EIP-712' | 'Ed25519' | 'none',
        status: "validated"
      };

      dbRecord = await saveFinalScorecard(scorecardData);

      logger.info(`💾 Saved to database: ${dbRecord.id}`);

      // 9.1 Save notification preferences if provided
      if (telegramUsername || email) {
        try {
          await achievementWebhookService.upsertNotificationPreferences(proponentDid, {
            telegramUsername,
            email,
            preferences: { batchConfirmed: true, milestoneAchieved: true, scoreThreshold: 0 }
          });
          logger.info(`📱 Notification preferences updated for ${proponentDid}`);
        } catch (prefError: any) {
          logger.warn('⚠️ Failed to save notification preferences:', prefError.message);
        }
      }

      // 10. Vara Network submission (opcional, no bloqueante)
      if (process.env.VARA_ENABLED === "true") {
        logger.info("🌐 Submitting to Vara Network...");
        varaAdapter.initialize().then(async (initialized) => {
          if (initialized) {
            const varaResult = await varaAdapter.submitScorecard(
              registryResult.registryEntry?.canonical_hash || cryptoGuard.generateCanonicalHash(scorecard as Scorecard),
              ipfsResult.cid,
              proponentDid
            );
            if (varaResult.success) {
              logger.info(`✅ Vara tx: ${varaResult.txHash}`);

              // Trigger success notification
              achievementWebhookService.notifyGenericSuccess(
                "🚀 Scorecard Anchored to Vara",
                `Proposal ${scorecard.metadata?.proposal_id || dbRecord.id} has been anchored to Vara Network.\nCID: ${ipfsResult.cid}\nHash: ${registryResult.registryEntry?.canonical_hash}`,
                proponentDid
              ).catch(e => logger.error("Notification fail", e));
            } else {
              logger.warn("⚠️ Vara submission failed:", varaResult.error);
            }
          }
        }).catch(err => {
          logger.warn("⚠️ Vara initialization failed:", err);
        });
      }

      // 11. AVIP v2.0 Submission (Batching, no bloqueante)
      if (process.env.AVIP_ENABLED === "true") {
        avipViemAdapter.submitScorecard(scorecard).catch(err => {
          logger.warn("⚠️ AVIP submission enqueuing failed:", err);
        });
      }
    } catch (error: any) {
      // Attempt to clean up IPFS pin if DB save fails
      try {
        logger.warn(`🧹 Cleaning up IPFS pin after DB failure: ${ipfsResult.cid}`);
        // TODO: Implement unpin if needed
      } catch (cleanupError) {
        logger.error('Failed to cleanup IPFS pin:', cleanupError);
      }

      return NextResponse.json(
        {
          error: 'Database persistence failed',
          message: error.message,
          details: 'Scorecard validated by registry but database insertion failed',
          ipfsCid: ipfsResult.cid,
          ipfsUrl: ipfsResult.url,
          registryHash: registryResult.registryEntry?.canonical_hash,
          suggestion: 'Manual intervention required: CID exists on IPFS and passed registry validation but not in scorecards table'
        },
        { status: 500 }
      );
    }

    // 10. Success response
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      message: signature ? 'Scorecard published, signed, and validated by Andromeda Core' : 'Scorecard published and validated by Andromeda Core',
      phase: 'Fase 4 - Cryptographic Signatures + Registry Validation',
      data: {
        id: dbRecord.id,
        cid: ipfsResult.cid,
        canonicalHash: registryResult.registryEntry?.canonical_hash,
        registryEntryId: registryResult.registryEntry?.scorecard_id,
        did: proponentDid,
        clarityDelta: validationResult.clarityDelta,
        signature: signature ? {
          type: didParts.chain === 'sol' ? 'Ed25519' : 'EIP-712',
          verified: true,
          signer: proponentDid
        } : null,
        validation: {
          schema: validationResult.isValid,
          invariants: registryResult.validationResult?.status === 'VALID' ? 'PASSED' : 'REJECTED',
          warnings: [...(validationResult.warnings || []), ...(registryResult.warnings || [])]
        },
        urls: {
          ipfs: ipfsResult.url,
          ipfsGateway: `${process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud'}/ipfs/${ipfsResult.cid}`,
          explorer: `https://ipfs.io/ipfs/${ipfsResult.cid}`,
          database: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/scorecards?id=eq.${dbRecord.id}`,
          registry: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/registry_entries?scorecard_id=eq.${ipfsResult.cid}`
        },
        timestamps: {
          validated: dbRecord.validated_at,
          created: dbRecord.created_at,
          processingMs: processingTime
        },
        status: 'immutable',
        vara: process.env.VARA_ENABLED === "true" ? {
          enabled: true,
          submitted: true,
          status: "pending"
        } : { enabled: false },
        avip: process.env.AVIP_ENABLED === "true" ? {
          enabled: true,
          integration: "v2.0-batching",
          status: "enqueued",
          network: process.env.AVIP_NETWORK || "hardhat"
        } : { enabled: false },
        warning: 'This scorecard is now permanently stored on IPFS and validated by Andromeda Core invariants'
      }
    };

    logger.info(`🎉 Scorecard published and validated in ${processingTime}ms: ${ipfsResult.cid}`);

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    // Unexpected error
    logger.error('💥 Unexpected error in publish endpoint:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during scorecard publication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        correlationId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Provide endpoint documentation
  return NextResponse.json({
    endpoint: '/api/coordination/publish',
    method: 'POST',
    phase: 'Fase 4 - Cryptographic Signatures + Registry Validation',
    description: 'Publish a validated Andromeda Scorecard with cryptographic signatures and Core invariant validation',
    flow: 'Challenge → Signature Verification → IPFS Upload → Registry Validation → Database Storage',
    validationLayers: {
      1: 'Schema validation (structure and clarity)',
      2: 'Cryptographic signature (EIP-712 or Ed25519)',
      3: 'Andromeda Core invariants (deterministic validation)'
    },
    signatureSupport: {
      'EIP-712': ['eth', 'pol', 'avax', 'arbitrum', 'optimism'],
      'Ed25519': ['sol'],
      'none': 'Anonymous submissions allowed'
    },
    requiredFields: {
      scorecard: 'Complete Scorecard object (sections A, B, C, D)',
      proponentDid: 'DID in format: did:andromeda:{chain}:{address}'
    },
    optionalFields: {
      signature: 'Cryptographic signature (EIP-712 or Ed25519)',
      nonce: 'Challenge nonce for signature verification',
      chain: 'Blockchain identifier (eth, sol, pol, avax)'
    },
    response: {
      success: {
        status: 201,
        includes: ['cid', 'canonicalHash', 'registryEntryId', 'signature', 'validation', 'urls', 'timestamps']
      },
      errors: {
        400: 'Validation failed, invalid DID, nonce already used, or invariant violation',
        401: 'Invalid signature',
        409: 'Duplicate scorecard',
        429: 'Rate limit exceeded',
        500: 'Internal server error',
        502: 'IPFS service unavailable'
      }
    },
    note: 'Once published, scorecards are immutable, validated by Core invariants, and permanently stored on IPFS'
  });
}
