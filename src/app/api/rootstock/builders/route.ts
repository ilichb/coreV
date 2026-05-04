import { NextRequest, NextResponse } from 'next/server';
import { rootstockConnector } from '@/lib/connectors/rootstock-connector';
import { builderIngestionService } from '@/lib/services/atlas/builder-ingestion.service';
import { logger } from '../../../../lib/utils/logger';
import { getRootstockBuilderMeta } from '@/data/rootstock-builders-registry';

const TALLY_API_KEY = process.env.TALLY_API_KEY || '***REMOVED***';


// Helper to handle BigInt serialization in JSON responses
function jsonResponse(data: any, status = 200) {
    try {
        const body = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );
        return new NextResponse(body, {
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        logger.error('Serialization Error in builders API:', err);
        return NextResponse.json({ error: 'Internal serialization error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (address && !process.env.THEGRAPH_API_KEY) {
        logger.warn('⚠️ THEGRAPH_API_KEY is missing in current environment. Results might be limited or fail.');
    }

    if (!address) {
        try {
            const TIMEOUT_MS = 12000;
            const buildersPromise = rootstockConnector.fetchAllBuilders();
            const timeoutPromise = new Promise<any[]>((_, reject) =>
                setTimeout(() => reject(new Error('fetchAllBuilders timeout')), TIMEOUT_MS)
            );
            const builders = await Promise.race([buildersPromise, timeoutPromise]).catch(() => {
                logger.warn('⏱️ fetchAllBuilders timed out — returning pinned fallback');
                return [
                    { id: '0x1da45683bd3ccd6f8308050d0d99c1ee7f761e5f', name: 'Wesatoshis Labs', category: 'Infrastructure', backerTotalAllocation: '0', accumulatedTime: '0', builderDid: 'did:andromeda:rootstock:0x1da45683bd3ccd6f8308050d0d99c1ee7f761e5f' },
                    { id: '0x1d1114666d0f21e479c122c138a527dfbc0f2d00', name: 'OpenOcean', category: 'DeFi', backerTotalAllocation: '0', accumulatedTime: '0', builderDid: 'did:andromeda:rootstock:0x1d1114666d0f21e479c122c138a527dfbc0f2d00' },
                    { id: '0x9763146dd94e0e6fd96ca88839e88ebda34a7f94', name: 'Tropykus', category: 'DeFi', backerTotalAllocation: '0', accumulatedTime: '0', builderDid: 'did:andromeda:rootstock:0x9763146dd94e0e6fd96ca88839e88ebda34a7f94' }
                ];
            });
            // Enrich with metadata
            const enrichedBuilders = await Promise.all(builders.map(async (b: any) => {
                try {
                    const registryMeta = getRootstockBuilderMeta(b.id);
                    const meta = await rootstockConnector.getMetadata(b.id);
                    return {
                        ...b,
                        builderDid: `did:andromeda:rootstock:${b.id}`,
                        name: registryMeta?.name || meta.name || b.name,
                        category: registryMeta?.category || meta.category || b.category,
                        ecosystem: 'rootstock',
                        impactScore: Math.min(Math.floor(parseFloat(b.accumulatedTime || b.backerTotalAllocation || '0') * 0.1) + 50, 99)
                    };
                } catch (e) {
                    const registryMeta = getRootstockBuilderMeta(b.id);
                    return {
                        ...b,
                        name: registryMeta?.name || b.name,
                        category: registryMeta?.category || b.category
                    };
                }
            }));

            // Proactively synchronize with ATLAS
            builderIngestionService.syncRootstockBuilders(enrichedBuilders).catch(err =>
                logger.error('Error in background builder sync:', err)
            );

            return jsonResponse({ success: true, builders: enrichedBuilders });
        } catch (error: any) {
            logger.error('Error fetching all Rootstock builders:', error);
            return jsonResponse({ error: error.message }, 500);
        }
    }

    try {
        const trimmedAddress = address.trim();
        logger.info(`Fetching scorecard for builder: ${trimmedAddress}`);

        const scorecard = await rootstockConnector.getBuilderScorecard(trimmedAddress);

        if (!scorecard) {
            return jsonResponse({ error: 'Builder not found or error fetching data' }, 404);
        }

        return jsonResponse(scorecard);
    } catch (error: any) {
        logger.error(`Fatal error in builder enrichment for ${address}:`, error);
        return jsonResponse(
            { error: error.message || 'Internal server error during data enrichment' },
            500
        );
    }
}


