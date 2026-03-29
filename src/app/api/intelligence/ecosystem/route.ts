import { NextRequest, NextResponse } from 'next/server';
import { ecosystemIngestionService } from '@/lib/services/coordination/connectors/ecosystem-ingestion.service';
import { rootstockConnector } from '@/lib/connectors/rootstock-connector';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ecosystem = searchParams.get('name');
  const action = searchParams.get('action');

  // Si se solicita una sincronización directa (para pruebas)
  if (action === 'sync' && ecosystem) {
    try {
      const result = await ecosystemIngestionService.syncEcosystem(ecosystem);
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  if (!ecosystem) {
    return NextResponse.json({
      availableEcosystems: ['rootstock', 'optimism', 'arbitrum', 'polkadot', 'solana'],
      count: 5,
      enabled: ['rootstock'],
      note: 'Only Rootstock connector is currently implemented'
    });
  }

  // Datos simulados por ecosistema
  const mockData: Record<string, any> = {
    rootstock: {
      ecosystem: 'rootstock',
      stats: {
        total_proposals: (await rootstockConnector.fetchRecentDecisions()).length + (await rootstockConnector.fetchSubgraphProposals()).length,
        active_builders: 64, // Fallback for now, could be improved with subgraph counting
        total_evaluations: 1500,
        average_clarity: 72,
        approval_rate: 64
      },
      recent_projects: [],
      top_builders: []
    },
    optimism: {
      ecosystem: 'optimism',
      stats: {
        total_proposals: 198,
        active_builders: 58,
        total_evaluations: 1200,
        average_clarity: 68,
        approval_rate: 58
      }
    },
    arbitrum: {
      ecosystem: 'arbitrum',
      stats: {
        total_proposals: 89,
        active_builders: 52,
        total_evaluations: 800,
        average_clarity: 65,
        approval_rate: 52
      }
    }
  };

  const data = mockData[ecosystem];
  if (!data) {
    return NextResponse.json(
      { error: `Ecosystem ${ecosystem} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
