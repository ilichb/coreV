import { NextRequest, NextResponse } from 'next/server';
import { marketplaceService, MarketProduct } from '@/lib/services/payments/market';
import { mongoDBClient } from '@/lib/infrastructure/mongodb';
import { logger } from '../../../../lib/utils/logger';

/**
 * ATLAS Data Market API Endpoint
 * Provee acceso a datos premium tras verificar el micro-pago X402 vía Headers.
 * 
 * Headers requeridos:
 * - X-X402-Payment-Id: El Transaction ID de Algorand
 * - X-X402-Product: El tipo de producto (ATLAS_PREMIUM_SEARCH, ATLAS_BULK_EXPORT)
 */
export async function GET(request: NextRequest) {
  try {
    const txId = request.headers.get('X-X402-Payment-Id');
    const product = request.headers.get('X-X402-Product') as MarketProduct;

    if (!txId || !product) {
      return NextResponse.json({
        success: false,
        error: 'X402 Payment Credentials Required',
        details: 'Missing X-X402-Payment-Id or X-X402-Product headers'
      }, { status: 402 });
    }

    // 1. Validar el pago en la blockchain de Algorand
    const isAuthorized = await marketplaceService.verifyApiAccess(txId, product);

    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized Access',
        details: 'Payment verification failed or product mismatch'
      }, { status: 403 });
    }

    // 2. Ejecutar consulta de "Alta Fidelidad"
    await mongoDBClient.connect();
    const collection = mongoDBClient.getMilestonesCollection();
    
    // Para esta demo/v1, devolvemos los últimos hitos con información completa
    const results = await collection
      .find({ status: 'IMMUTABLE' })
      .sort({ 'metadata.createdAt': -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      marketContext: {
        product,
        status: 'AUTHORIZED',
        txId,
        network: 'Algorand'
      },
      data: results.map(doc => ({
        ...doc,
        _marketNote: 'Verified high-fidelity data unlocked via X402'
      }))
    });

  } catch (error: any) {
    logger.error('Market API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Data Market Engine Failure',
      details: error.message
    }, { status: 500 });
  }
}
