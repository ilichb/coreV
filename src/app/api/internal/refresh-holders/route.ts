import { NextRequest, NextResponse } from 'next/server';
import { inactiveHolderService } from '@/lib/services/rootstock/inactive-holder.service';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await inactiveHolderService.refreshInactiveHoldersCache();
  return NextResponse.json({ ok: true, count: result.count });
}