import { NextRequest, NextResponse } from 'next/server';
import { rootstockConnector } from '@/lib/connectors/rootstock-connector';
import { builderIngestionService } from '@/lib/services/atlas/builder-ingestion.service';
import { logger } from '../../../../lib/utils/logger';

const TALLY_API_KEY = process.env.TALLY_API_KEY || '***REMOVED***';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
        try {
            const builders = await rootstockConnector.fetchAllBuilders();
            // Enrich with metadata
            const enrichedBuilders = await Promise.all(builders.map(async (b: any) => {
                const meta = await rootstockConnector.getMetadata(b.id);
                return {
                    ...b,
                    builderDid: `did:andromeda:rootstock:${b.id}`,
                    name: meta.name,
                    category: meta.category,
                    impactScore: Math.min(Math.floor(parseFloat(b.backerTotalAllocation || '0') * 0.1) + 65, 99) // Dynamic score based on allocation
                };
            }));

            // Proactively synchronize with ATLAS
            builderIngestionService.syncRootstockBuilders(enrichedBuilders).catch(err =>
                logger.error('Error in background builder sync:', err)
            );

            return NextResponse.json({ success: true, builders: enrichedBuilders });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    try {
        const scorecard = await rootstockConnector.getBuilderScorecard(address.trim());
        if (!scorecard) {
            return NextResponse.json(
                { error: 'Builder not found or error fetching data' },
                { status: 404 }
            );
        }
        return NextResponse.json(scorecard);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
