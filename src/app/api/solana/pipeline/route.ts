import { NextResponse } from 'next/server';
import { solanaIngestionService } from '@/lib/services/coordination/solana-ingestion.service';
import { avipViemAdapter } from '@/lib/services/coordination/avip-viem-adapter';
import { solanaClient } from '@/lib/clients/solana-client';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const [solanaStatus, avipHealth, ingestStats] = await Promise.allSettled([
      solanaClient.getStatus(),
      avipViemAdapter.healthCheck(),
      Promise.resolve(solanaIngestionService.getStats()),
    ]);

    const solana = solanaStatus.status === 'fulfilled' ? solanaStatus.value : null;
    const avip   = avipHealth.status   === 'fulfilled' ? avipHealth.value   : null;
    const ingest = ingestStats.status  === 'fulfilled' ? ingestStats.value  : null;

    let dlqCount = 0;
    try {
      const dlqPath = path.join(process.cwd(), 'data/avip-dlq.json');
      if (fs.existsSync(dlqPath)) {
        dlqCount = JSON.parse(fs.readFileSync(dlqPath, 'utf8')).length;
      }
    } catch {}

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      nodes: {
        solana: {
          label: 'Solana Devnet',
          status: solana?.status === 'ok' ? 'active' : 'error',
          slot: solana?.slot ?? null,
          balance: solana?.balance_sol ?? null,
          program: 'FBYJTCxPU6PsGLwasEV8YemKsKaMgSkEfPKrudpLbhYx',
        },
        yellowstone: {
          label: 'Yellowstone gRPC',
          status: ingest?.running ? 'active' : 'idle',
          processed: ingest?.processed ?? 0,
          errors: ingest?.errors ?? 0,
          endpoint: 'sol-devnet-yellowstone-grpc.rpcfast.com:443',
        },
        avip: {
          label: 'AVIP Engine',
          status: avip?.healthy ? 'active' : 'degraded',
          queueSize: avip?.queueSize ?? 0,
          dlqSize: dlqCount,
          network: 'arbitrum-sepolia',
          contract: '0xf1db80d21d8596fE1571cAe2Da0b1Be089c8cA0C',
        },
        arbitrum: {
          label: 'Arbitrum Sepolia',
          status: avip?.healthy ? 'active' : 'pending',
          contract: '0xf1db80d21d8596fE1571cAe2Da0b1Be089c8cA0C',
          chainId: 421614,
        },
        atlas: {
          label: 'ATLAS Index',
          status: 'active',
          milestones: ingest?.processed ?? 0,
          network: 'mongodb',
        },
      },
      flow: [
        { from: 'solana',      to: 'yellowstone', active: ingest?.running ?? false },
        { from: 'yellowstone', to: 'avip',        active: (ingest?.processed ?? 0) > 0 },
        { from: 'avip',        to: 'arbitrum',    active: avip?.healthy ?? false },
        { from: 'avip',        to: 'atlas',       active: (ingest?.processed ?? 0) > 0 },
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
