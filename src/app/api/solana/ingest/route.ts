import { NextResponse } from 'next/server';
import { solanaIngestionService } from '../../../../lib/services/coordination/solana-ingestion.service';
import { logger } from '../../../../lib/utils/logger';

export async function GET() {
  return NextResponse.json({ status: 'ok', ...solanaIngestionService.getStats() });
}

export async function POST() {
  try {
    await solanaIngestionService.start();
    return NextResponse.json({ status: 'started', ...solanaIngestionService.getStats() });
  } catch (err: any) {
    logger.error(`❌ /api/solana/ingest POST: ${err.message}`);
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  await solanaIngestionService.stop();
  return NextResponse.json({ status: 'stopped' });
}
