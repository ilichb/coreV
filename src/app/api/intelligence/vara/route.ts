import { NextRequest, NextResponse } from 'next/server';
import { varaAdapter } from '@/lib/services/coordination/vara-adapter';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const daoId = searchParams.get('daoId');

  if (action === 'query-dao' && daoId) {
    try {
      // Inicializar adapter si es necesario
      await varaAdapter.initialize();
      
      // Simular datos de DAO ya que el método queryDAO no existe actualmente
      // En una implementación real, esto consultaría el contrato de Vara
      const mockDaoData = {
        dao: {
          project_count: 47,
          builder_count: 24,
          approval_rate: 64,
          average_clarity: 76,
          total_funding: "1.2M USD",
          last_sync: new Date().toISOString()
        },
        projects: Array.from({ length: 10 }, (_, i) => ({
          title: `Rootstock Proposal ${i + 1}`,
          dao_identifier: 'rootstock-dao',
          decision_metadata: {
            outcome: i % 2 === 0 ? 'APPROVED' : 'REJECTED',
            clarity_score: 70 + Math.floor(Math.random() * 20),
            votes_for: 100 + Math.floor(Math.random() * 200),
            votes_against: 20 + Math.floor(Math.random() * 50)
          },
          tags: ['governance', 'defi', 'infrastructure'].slice(0, 1 + Math.floor(Math.random() * 3)),
          submission_timestamp: Date.now() - (i * 86400000) // Hace i días
        })),
        builder_count: 24
      };

      return NextResponse.json(mockDaoData);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  if (action === 'status') {
    const status = varaAdapter.getStatus();
    return NextResponse.json(status);
  }

  // Acción por defecto: información de la API
  return NextResponse.json({
    message: 'Vara Network Integration API',
    availableActions: ['query-dao', 'status'],
    note: 'This API provides access to Vara Network data for client components'
  });
}