import { NextRequest, NextResponse } from 'next/server';
import { rootstockConnector } from '@/lib/connectors/rootstock-connector';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
        // Combinamos datos de Snapshot (votos/decisiones) y Subgraph (eventos técnicos)
        const [snapshotProposals, subgraphEvents] = await Promise.all([
            rootstockConnector.fetchRecentDecisions(limit),
            rootstockConnector.fetchSubgraphProposals(limit)
        ]);

        // Transformamos snapshotProposals al formato esperado por el componente
        const formattedSnapshot = snapshotProposals.map(p => ({
            id: p.proposalId,
            title: p.title,
            implementation: p.tags.join(', '),
            blockNumber: 'Snapshot',
            blockTimestamp: (new Date(p.timestamp).getTime() / 1000).toString(),
            status: p.status
        }));

        return NextResponse.json({ 
            proposals: [...formattedSnapshot, ...subgraphEvents] 
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
