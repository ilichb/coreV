/**
 * Yellowstone gRPC Connector — Andromeda Core
 * Usa @grpc/grpc-js directamente (compatible con este entorno).
 * Solo lectura. No modifica ningún flujo existente.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { logger } from '../utils/logger';

const ANDROMEDA_PROGRAM_ID = 'FBYJTCxPU6PsGLwasEV8YemKsKaMgSkEfPKrudpLbhYx';
const PROTO_PATH = path.resolve(process.cwd(), 'src/lib/clients/proto/geyser.proto');

export type MilestoneTransactionHandler = (data: {
  signature: string;
  submitter: string;
  slot: bigint;
  timestamp: number;
}) => Promise<void>;

export class YellowstoneConnector {
  private client: any = null;
  private stream: any = null;
  private isRunning = false;
  private onMilestoneTx: MilestoneTransactionHandler;
  private host: string;
  private apiKey: string;

  constructor(onMilestoneTx: MilestoneTransactionHandler) {
    this.host = (process.env.SOLANA_GRPC_URL || 'https://sol-devnet-yellowstone-grpc.rpcfast.com:443')
      .replace(/^https?:\/\//, '');
    this.apiKey = process.env.SOLANA_GRPC_API_KEY || '';
    this.onMilestoneTx = onMilestoneTx;
    logger.info(`🔌 YellowstoneConnector: Configured → ${this.host}`);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      const packageDef = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const proto = grpc.loadPackageDefinition(packageDef) as any;
      const GeyserService = proto?.geyser?.Geyser;

      if (!GeyserService) throw new Error('Geyser service not found in proto');

      const metadata = new grpc.Metadata();
      metadata.set('x-token', this.apiKey);

      const creds = grpc.credentials.createSsl();
      this.client = new GeyserService(this.host, creds);

      await new Promise<void>((resolve, reject) => {
        this.client.waitForReady(Date.now() + 10000, (err: any) => {
          if (err) reject(new Error(`gRPC not ready: ${err.message}`));
          else resolve();
        });
      });

      logger.info('✅ YellowstoneConnector: gRPC connected');

      this.stream = this.client.subscribe(metadata);
      this.isRunning = true;

      const request = {
        transactions: {
          andromeda: {
            account_include: [ANDROMEDA_PROGRAM_ID],
            account_exclude: [],
            account_required: [],
            vote: false,
            failed: false,
          },
        },
        slots: {},
        accounts: {},
        blocks: {},
        blocks_meta: {},
        entry: {},
        commitment: 1,
        accounts_data_slice: [],
      };

      this.stream.write(request);
      logger.info(`📡 YellowstoneConnector: Subscribed to program ${ANDROMEDA_PROGRAM_ID}`);

      this.stream.on('data', async (update: any) => {
        try {
          if (!update?.transaction) return;

          const tx     = update.transaction;
          const txInfo = tx.transaction;
          const sigs   = txInfo?.transaction?.signatures ?? [];
          if (sigs.length === 0) return;

          const signature = Buffer.isBuffer(sigs[0])
            ? sigs[0].toString('base64')
            : String(sigs[0]);

          const accountKeys = txInfo?.transaction?.message?.account_keys ?? [];
          const submitter = accountKeys.length > 0
            ? (Buffer.isBuffer(accountKeys[0])
                ? accountKeys[0].toString('base64')
                : String(accountKeys[0]))
            : 'unknown';

          const slot      = BigInt(tx.slot ?? 0);
          const timestamp = Date.now();

          logger.info(`🔔 YellowstoneConnector: New milestone tx → slot ${slot}`);
          await this.onMilestoneTx({ signature, submitter, slot, timestamp });

        } catch (err: any) {
          logger.error(`❌ YellowstoneConnector: Error processing update: ${err.message}`);
        }
      });

      let retryDelay = 5000;
      const maxDelay = 60000;

      const reconnect = (reason: string) => {
        this.isRunning = false;
        logger.warn(`⚠️  YellowstoneConnector: ${reason}. Reconnecting in ${retryDelay/1000}s...`);
        setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, maxDelay);
          this.start().then(() => { retryDelay = 5000; }).catch(() => {});
        }, retryDelay);
      };

      this.stream.on('error', (err: any) => {
        logger.error(`❌ YellowstoneConnector: Stream error: ${err.message}`);
        reconnect('Stream error');
      });

      this.stream.on('end', () => {
        reconnect('Stream ended');
      });

    } catch (err: any) {
      logger.error(`❌ YellowstoneConnector: Connection failed: ${err.message}`);
      this.isRunning = false;
      throw err;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    logger.info('🛑 YellowstoneConnector: Stopped');
  }

  get running(): boolean {
    return this.isRunning;
  }
}
