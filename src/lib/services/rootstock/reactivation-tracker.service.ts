import { fesStorage } from './fes-storage.service';
import { inactiveHolderService } from './inactive-holder.service';
import { logger } from '@/lib/utils/logger';

const REACTIVATION_BLOCK_DELTA = 10;

export interface CheckResult {
  wallet: string;
  cohort: string;
  previousBlock: number | null;
  currentBlock: number;
  checkpoint: number | null;
  delta: number | null;
  reactivated: boolean;
  error?: string;
}

class ReactivationTrackerService {
  async checkOne(wallet: string): Promise<CheckResult> {
    const lower = wallet.toLowerCase();
    const participant = await fesStorage.getParticipant(lower);

    if (!participant) {
      return {
        wallet: lower,
        cohort: 'unknown',
        previousBlock: null,
        currentBlock: 0,
        checkpoint: null,
        delta: null,
        reactivated: false,
        error: 'Participant not found in FES experiment',
      };
    }

    try {
      const holder = await inactiveHolderService.getHolderActivity(lower);
      if (!holder) {
        return {
          wallet: lower,
          cohort: participant.cohort,
          previousBlock: participant.last_block_current,
          currentBlock: 0,
          checkpoint: participant.last_block_checkpoint,
          delta: null,
          reactivated: false,
          error: 'No staking history found for wallet',
        };
      }

      const backer = await this.fetchBackerLastBlock(lower);
      if (backer === null) {
        return {
          wallet: lower,
          cohort: participant.cohort,
          previousBlock: participant.last_block_current,
          currentBlock: 0,
          checkpoint: participant.last_block_checkpoint,
          delta: null,
          reactivated: false,
          error: 'Failed to query subgraph',
        };
      }

      const currentBlock = parseInt(backer, 10);
      const checkpoint = participant.last_block_checkpoint;
      const delta = checkpoint !== null ? currentBlock - checkpoint : null;
      const reactivated = checkpoint !== null && currentBlock >= checkpoint + REACTIVATION_BLOCK_DELTA;

      await fesStorage.updateParticipantField(lower, {
        last_block_current: currentBlock,
        last_checked_at: new Date().toISOString(),
      });

      await fesStorage.recordEvent({
        wallet: lower,
        event_type: 'status_check',
        payload: {
          last_block_current: currentBlock,
          last_block_checkpoint: checkpoint,
          delta,
          reactivated,
        },
      });

      if (reactivated && !participant.reactivated) {
        const now = new Date().toISOString();
        await fesStorage.updateParticipantField(lower, {
          reactivated: true,
          reactivated_at: now,
        });

        await fesStorage.recordEvent({
          wallet: lower,
          event_type: 'reactivated',
          payload: {
            last_block_current: currentBlock,
            last_block_checkpoint: checkpoint,
            delta,
            days_since_message: checkpoint
              ? Math.floor((Date.now() - new Date(participant.message_sent_at || now).getTime()) / 86400000)
              : null,
          },
        });

        logger.info(`FES reactivation detected: ${lower} (block ${checkpoint} → ${currentBlock}, delta ${delta})`);
      }

      return {
        wallet: lower,
        cohort: participant.cohort,
        previousBlock: participant.last_block_current,
        currentBlock,
        checkpoint,
        delta,
        reactivated,
      };
    } catch (error: any) {
      logger.error(`FES checkOne failed for ${lower}:`, error);
      return {
        wallet: lower,
        cohort: participant.cohort,
        previousBlock: participant.last_block_current,
        currentBlock: 0,
        checkpoint: participant.last_block_checkpoint,
        delta: null,
        reactivated: false,
        error: error.message,
      };
    }
  }

  async checkAll(): Promise<CheckResult[]> {
    const participants = await fesStorage.listParticipants();
    if (participants.length === 0) return [];

    const results: CheckResult[] = [];
    for (const p of participants) {
      const result = await this.checkOne(p.wallet);
      results.push(result);
    }
    return results;
  }

  private async fetchBackerLastBlock(wallet: string): Promise<string | null> {
    const query = `{
      backerStakingHistories(where: { id: "${wallet}" }) {
        lastBlockNumber
      }
    }`;

    const subgraphUrl = process.env.THEGRAPH_API_KEY
      ? `https://gateway.thegraph.com/api/${process.env.THEGRAPH_API_KEY}/subgraphs/id/${process.env.REWARDS_SUBGRAPH_ID || '7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA'}`
      : '';

    if (!subgraphUrl) return null;

    try {
      const response = await fetch(subgraphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return null;
      const json = await response.json();
      const histories = json?.data?.backerStakingHistories;
      return histories && histories.length > 0 ? histories[0].lastBlockNumber : null;
    } catch {
      return null;
    }
  }
}

export const reactivationTracker = new ReactivationTrackerService();
