import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function GET() {
    try {
        const solanaRpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        
        // Verificación rápida de la conexión al RPC de Solana
        const response = await fetch(solanaRpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getHealth'
            })
        });

        if (!response.ok) {
            throw new Error(`RPC responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json({
            status: 'healthy',
            network: 'solana',
            rpcStatus: data.result || 'unknown',
            timestamp: new Date().toISOString(),
            features: {
                dids: 'did:andromeda:sol:<pubkey>',
                signatures: 'Ed25519'
            }
        }, { status: 200 });

    } catch (error: any) {
        logger.error('Solana Health Check failed', error);
        return NextResponse.json({
            status: 'degraded',
            network: 'solana',
            error: error.message,
            timestamp: new Date().toISOString(),
            features: {
                dids: 'did:andromeda:sol:<pubkey>',
                signatures: 'Ed25519'
            }
        }, { status: 503 });
    }
}
