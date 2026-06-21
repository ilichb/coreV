import { NextRequest, NextResponse } from 'next/server';
import { fesStorage, type Cohort } from '@/lib/services/rootstock/fes-storage.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cohort = searchParams.get('cohort') as Cohort | null;
    const reactivatedParam = searchParams.get('reactivated');
    const reactivated = reactivatedParam !== null
      ? reactivatedParam === 'true'
      : undefined;

    const participants = await fesStorage.listParticipants(
      cohort || undefined,
      reactivated
    );

    return NextResponse.json({
      total: participants.length,
      participants: participants.map(p => ({
        wallet: p.wallet,
        cohort: p.cohort,
        message_variant: p.message_variant,
        balance: p.balance_at_detection,
        daysInactiveAtDetection: p.days_inactive_at_detection,
        messageSentAt: p.message_sent_at,
        messageLanguage: p.message_language,
        reactivated: p.reactivated,
        reactivatedAt: p.reactivated_at,
        lastBlockCurrent: p.last_block_current,
        lastBlockCheckpoint: p.last_block_checkpoint,
        daysToReactivate: p.reactivated && p.message_sent_at && p.reactivated_at
          ? Math.floor(
              (new Date(p.reactivated_at).getTime() - new Date(p.message_sent_at).getTime()) / 86400000
            )
          : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to list participants', detail: error.message },
      { status: 500 }
    );
  }
}
