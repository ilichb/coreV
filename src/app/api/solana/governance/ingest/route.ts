import { NextResponse } from 'next/server';
import { solanaIngestionService } from '@/lib/services/coordination/solana-ingestion.service';
import { logger } from '@/lib/utils/logger';

export async function POST() {
  try {
    logger.info('🏛️ Starting Solana governance ingestion...');
    const result = await solanaIngestionService.ingestGovernanceProposals();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'POST to trigger governance ingestion from BonkDAO and other Solana DAOs',
  });
}
