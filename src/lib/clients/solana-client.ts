import { 
    Connection, 
    Keypair, 
    Transaction, 
    SystemProgram, 
    PublicKey, 
    TransactionInstruction,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface SolanaProjectMetadata {
    merkle_root: string;
    ipfs_cid: string;
    ecosystem: string;
    dao_identifier: string;
    batch_id: string;
    timestamp: number;
}

// Solana Memo Program v2 – official address
// https://spl.solana.com/memo
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABZAn9asGmeqb91N9kk973vCdz9G9n3pXr');

export class SolanaClient {
    private connection: Connection;
    private payer: Keypair | null = null;
    private endpoint: string;

    constructor() {
        this.endpoint = process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com';
        this.connection = new Connection(this.endpoint, 'confirmed');
        logger.info(`🌐 SolanaClient: Connecting to ${this.endpoint}`);
        
        // We delay PublicKey initialization to avoid crashes during module import
        this.initializePayer();
    }


    private initializePayer() {
        try {
            const keyPath = path.resolve(process.cwd(), 'src/lib/blockchain/keys/solana-bot.json');
            if (fs.existsSync(keyPath)) {
                const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
                this.payer = Keypair.fromSecretKey(new Uint8Array(keyData));
                logger.info(`✅ SolanaClient: Bot account loaded: ${this.payer.publicKey.toBase58()}`);
            } else {
                logger.warn(`⚠️ SolanaClient: Keyfile not found. Generating session keypair.`);
                this.payer = Keypair.generate();
            }
        } catch (e: any) {
            logger.error(`❌ SolanaClient: Payer initialization failed: ${e.message}`);
            this.payer = Keypair.generate();
        }
    }

    /**
     * Ancla un lote de scorecards en la blockchain de Solana usando el Memo Program.
     */
    async anchorBatch(metadata: any): Promise<string> {
        if (!this.payer) {
            throw new Error("Solana payer not initialized");
        }

        try {
            const batchId = metadata.batch_id || 'UNKNOWN';
            logger.info(`⚓ Anchoring batch ${batchId} to Solana...`);
            
            const memoData = JSON.stringify({
                v: "1.0",
                bch: batchId,
                roots: metadata.merkle_roots || [],
                ts: Date.now()
            });

            const transaction = new Transaction().add(
                new TransactionInstruction({
                    keys: [{ pubkey: this.payer.publicKey, isSigner: true, isWritable: true }],
                    programId: MEMO_PROGRAM_ID,
                    data: Buffer.from(memoData, 'utf-8'),
                })
            );

            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [this.payer]
            );

            logger.info(`✨ Solana Anchor Successful: ${signature}`);
            return signature;
        } catch (error: any) {
            logger.error(`❌ Solana Anchor Failed: ${error.message}`);
            throw error;
        }
    }

    async getStatus(): Promise<any> {
        try {
            const slot = await this.connection.getSlot();
            const balance = this.payer ? await this.connection.getBalance(this.payer.publicKey) : 0;
            
            return {
                status: 'ok',
                slot,
                endpoint: this.endpoint,
                bot_address: this.payer?.publicKey.toBase58(),
                balance_sol: balance / 1e9,
                memo_program: MEMO_PROGRAM_ID.toBase58()
            };
        } catch (error: any) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

export const solanaClient = new SolanaClient();
