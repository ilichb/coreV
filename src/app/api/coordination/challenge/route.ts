/**
 * Challenge Endpoint (Fase 4)
 * Generates nonces for cryptographic signatures
 */

import { NextRequest, NextResponse } from 'next/server';
import { cryptoGuard } from '../../../../lib/services/coordination/crypto-guard';
import { redisService } from '../../../../lib/services/coordination/redis';
import { parseDid } from '../../../../types/coordination/scorecard';
import { logger } from '../../../../lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { did, purpose = 'scorecard_submission' } = body;
    
    if (!did) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'did is required' },
        { status: 400 }
      );
    }

    // Validar formato del DID
    try {
      parseDid(did);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Invalid DID format', message: error.message },
        { status: 400 }
      );
    }

    // Rate limiting por DID
    const rateLimitKey = `rate_limit:challenge:${did}`;
    const rateLimit = await redisService.checkRateLimit(rateLimitKey, 10, 60);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many challenge requests',
          retryAfter: rateLimit.resetAfter
        },
        { status: 429 }
      );
    }

    // Generar nonce único
    const nonce = cryptoGuard.generateNonce(did);
    
    // Almacenar challenge en Redis (5 minutos de expiración)
    await redisService.setChallenge(nonce, did, 300);
    
    const response = {
      success: true,
      challenge: {
        nonce,
        did,
        purpose,
        expiresIn: 300, // segundos
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        timestamp: new Date().toISOString()
      },
      signingInstructions: {
        ethereum: 'Sign this nonce with EIP-712 using your wallet',
        solana: 'Sign this nonce with Ed25519 using your wallet',
        message: `Andromeda Challenge: ${nonce}`
      }
    };

    logger.info(`🔐 Challenge generated for ${did}: ${nonce.substring(0, 16)}...`);
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error: any) {
    logger.error('Error generating challenge:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate challenge',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/coordination/challenge',
    method: 'POST',
    description: 'Generate a cryptographic challenge nonce for signature verification',
    flow: 'Request nonce → Sign with wallet → Submit with signature',
    body: {
      did: 'Required - DID in format: did:andromeda:{chain}:{address}',
      purpose: 'Optional - Purpose of the challenge (default: scorecard_submission)'
    },
    response: {
      challenge: {
        nonce: 'Unique cryptographic nonce',
        did: 'The DID this challenge is for',
        purpose: 'Challenge purpose',
        expiresIn: 'Seconds until expiration',
        expiresAt: 'ISO timestamp of expiration'
      },
      signingInstructions: 'Instructions for signing the nonce'
    },
    security: {
      rateLimit: '10 requests per minute per DID',
      expiration: 'Challenges expire after 5 minutes',
      nonceReuse: 'Each nonce can only be used once'
    },
    examples: {
      request: {
        did: 'did:andromeda:eth:0x742d35Cc6634C0532925a3b844Bc9e8B6f9e7b9b',
        purpose: 'scorecard_submission'
      }
    }
  });
}
