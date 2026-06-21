import { NextRequest, NextResponse } from 'next/server';
import { reactivationTracker } from '@/lib/services/rootstock/reactivation-tracker.service';

export async function POST(request: NextRequest) {
  try {
    let body: { wallet?: string } = {};
    try {
      body = await request.json();
    } catch {
      // empty body → check all
    }

    const results = body.wallet
      ? [await reactivationTracker.checkOne(body.wallet)]
      : await reactivationTracker.checkAll();

    const reactivated = results.filter(r => r.reactivated);
    const errors = results.filter(r => r.error);

    return NextResponse.json({
      checked: results.length,
      reactivated: reactivated.length,
      reactivated_wallets: reactivated.map(r => r.wallet),
      errors: errors.map(e => ({ wallet: e.wallet, error: e.error })),
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Tracking cycle failed', detail: error.message },
      { status: 500 }
    );
  }
}
