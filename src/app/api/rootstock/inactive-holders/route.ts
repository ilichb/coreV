/**
 * GET /api/rootstock/inactive-holders
 *
 * Identifies RIF holders inactive in staking based on Rewards Subgraph data.
 *
 * DATA SOURCE: Rewards Subgraph (backerStakingHistories)
 *   - Stakers with accumulatedTime > 0 are evaluated
 *   - RIF balance checked via eth_call to RIF Token contract
 *   - Block numbers converted to timestamps via RSK RPC eth_getBlockByNumber
 *
 * INACTIVITY DEFINITION (MVP v1):
 *   1. RIF token balance > 500 RIF
 *   2. No staking activity for > 30 days
 *   3. Last staking activity predates June 1, 2026
 *
 * KNOWN LIMITATION: Only detects wallets that have participated in staking
 * at least once. Pure RIF holders (no staking history) are not included.
 * Future phases will incorporate governance, Snapshot, and RIF Transfer data.
 *
 * Query params:
 *   - address (optional): Get activity for a specific wallet
 *
 * Response: { count, holders, metadata }
 */

import { NextRequest, NextResponse } from 'next/server';
import { inactiveHolderService } from '@/lib/services/rootstock/inactive-holder.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  try {
    if (address) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return NextResponse.json(
          { error: 'Invalid address format. Expected 0x-prefixed 40-char hex string.' },
          { status: 400 }
        );
      }

      const activity = await inactiveHolderService.getHolderActivity(address);
      if (!activity) {
        return NextResponse.json(
          { error: 'No staking activity found for this address. The wallet may have never staked or is not tracked by the Rewards Subgraph.' },
          { status: 404 }
        );
      }

      return NextResponse.json(activity);
    }

    const result = await inactiveHolderService.findInactiveHolders();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch inactive holders', detail: error.message },
      { status: 500 }
    );
  }
}
