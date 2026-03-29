/**
 * Test endpoint for real signature verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { cryptoGuard } from '../../../../lib/services/coordination/crypto-guard';
import { parseDid } from '../../../../types/coordination/scorecard';

const EIP712_DOMAIN = {
  name: 'Andromeda Test',
  version: '1',
  chainId: 1,
  verifyingContract: '0x0000000000000000000000000000000000000000'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signature, message, did } = body;
    
    if (!signature || !did) {
      return NextResponse.json(
        { error: 'signature and did are required' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();
    
    // Crear un scorecard de prueba COMPLETO (cumple interfaz Scorecard)
    const testScorecard = {
      "A. Problema": { clarity: 8, coherence: 7, completeness: 9, content: {} },
      "B. Límites": { clarity: 7, coherence: 8, completeness: 6, content: {} },
      "C. Especificación Técnica": { clarity: 9, coherence: 8, completeness: 8, content: {} },
      "D. Esfuerzo": { clarity: 8, coherence: 7, completeness: 7, content: {} },
      metadata: {
        version: '1.0.0',
        created: now,
        updated: now, // <-- CAMPO REQUERIDO AGREGADO
        authorDid: did
      }
    };
    
    // Verificar la firma
    const result = await cryptoGuard.verifyEIP712(did, signature, testScorecard, EIP712_DOMAIN);
    
    return NextResponse.json({
      success: true,
      verified: result.isValid,
      result,
      testData: {
        did,
        signature: signature.substring(0, 20) + '...',
        length: signature.length
      },
      note: 'For a real test, use a signature from MetaMask or another wallet'
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message,
        note: 'Make sure the signature is a valid 65-byte EIP-712 signature'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/coordination/test-signature',
    description: 'Test EIP-712 signature verification',
    exampleRequest: {
      did: 'did:andromeda:eth:0x742d35Cc6634C0532925a3b844Bc9e8B6f9e7b9b',
      signature: '0x... (65 bytes hex, 130 characters including 0x)',
      message: 'Optional message for Ed25519 signatures'
    },
    supportedChains: {
      EIP712: ['eth', 'pol', 'avax'],
      Ed25519: ['sol']
    }
  });
}
