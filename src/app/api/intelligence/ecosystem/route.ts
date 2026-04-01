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

  try {
    const { mongoDBClient } = await import('@/lib/infrastructure/mongodb');
    await mongoDBClient.connect();
    const collection = mongoDBClient.getMilestonesCollection();

    // Aggregation pipeline to get real ecosystem stats
    const stats = await collection.aggregate([
      // CORREGIDO: usar action.metadata.ecosystem (campo real en Atlas)
      { $match: { 'action.metadata.ecosystem': ecosystem } },
      { 
        $group: {
          _id: '$action.metadata.ecosystem',
          total_proposals: { $sum: 1 },
          active_builders: { $addToSet: '$action.metadata.builderDid' },
          total_trust_score: { $sum: '$metadata.trustScore' },
          verified_count: { 
            $sum: { $cond: [{ $eq: ['$status', 'VERIFIED'] }, 1, 0] } 
          }
        }
      },
      {
        $project: {
          ecosystem: '$_id',
          stats: {
            total_proposals: '$total_proposals',
            active_builders: { $size: '$active_builders' },
            total_evaluations: '$total_proposals', // Representative for now
            average_impact: { 
              $cond: [
                { $gt: ['$total_proposals', 0] },
                { $divide: ['$total_trust_score', '$total_proposals'] },
                0
              ]
            },
            approval_rate: {
              $cond: [
                { $gt: ['$total_proposals', 0] },
                { $multiply: [{ $divide: ['$verified_count', '$total_proposals'] }, 100] },
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    if (stats.length === 0) {
      // If no data yet, return empty stats instead of mock
      return NextResponse.json({
        ecosystem,
        stats: {
          total_proposals: 0,
          active_builders: 0,
          total_evaluations: 0,
          average_clarity: 0,
          approval_rate: 0
        },
        note: 'Ecosystem synchronization in progress'
      });
    }

    return NextResponse.json(stats[0]);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch ecosystem stats', details: error.message },
      { status: 500 }
    );
  }
}
