import { NextRequest, NextResponse } from 'next/server';
import { rootstockConnector } from '@/lib/connectors/rootstock-connector';
import { builderIngestionService } from '@/lib/services/atlas/builder-ingestion.service';
import { logger } from '../../../../lib/utils/logger';

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

    if (!address) {
        try {
            const builders = await rootstockConnector.fetchAllBuilders();
            // Enrich with metadata
            const enrichedBuilders = await Promise.all(builders.map(async (b: any) => {
                try {
                    const meta = await rootstockConnector.getMetadata(b.id);
                    return {
                        ...b,
                        builderDid: `did:andromeda:rootstock:${b.id}`,
                        name: meta.name,
                        category: meta.category,
                        impactScore: Math.min(Math.floor(parseFloat(b.backerTotalAllocation || '0') * 0.1) + 65, 99)
                    };
                } catch (e) {
                    return b; // Fallback to raw builder if metadata fails
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

