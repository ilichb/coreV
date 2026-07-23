import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, setProvider, BN } from '@coral-xyz/anchor';
// NodeWallet como reemplazo de Wallet
class AnchorWallet { constructor(public payer: any) {} get publicKey() { return this.payer.publicKey; } async signTransaction(tx: any) { tx.partialSign(this.payer); return tx; } async signAllTransactions(txs: any[]) { return txs.map(tx => { tx.partialSign(this.payer); return tx; }); } }
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

const ANDROMEDA_PROGRAM_ID = new PublicKey('FBYJTCxPU6PsGLwasEV8YemKsKaMgSkEfPKrudpLbhYx');

const IDL_PATH = path.resolve(
    '/home/ilich/Escritorio/andromeda-core1/packages/solana-contracts/andromeda-registry/target/idl/andromeda_registry.json'
);

export interface MilestoneMetadata {
    merkle_root: Uint8Array;
    ipfs_cid: string;
    did: string;
    ecosystem: string;
    dao_identifier: string;
}

export class SolanaClient {
    private _connection: Connection | null = null;
    private payer: Keypair | null = null;
    private endpoint: string;

    constructor() {
        this.endpoint = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    }

    private getConnection(): Connection {
        if (!this._connection) {
            const ep = this.endpoint.startsWith('http') ? this.endpoint : `https://${this.endpoint}`;
            this._connection = new Connection(ep, 'confirmed');
            logger.info(`🌐 SolanaClient: Connecting to ${ep}`);
        }
        return this._connection;
    }

    private getPayer(): Keypair {
        if (!this.payer) {
            try {
                const keyPath = path.resolve(
                    '/home/ilich/Escritorio/andromeda-core1/src/lib/blockchain/keys/solana-bot.json'
                );
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
        return this.payer;
    }

    private getProgram() {
        const payer = this.getPayer();
        const wallet = new AnchorWallet(payer);
        const provider = new AnchorProvider(this.getConnection(), wallet, { commitment: 'confirmed' });
        setProvider(provider);
        const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf-8'));
        return new Program(idl, provider);
    }

    async anchorMilestone(metadata: MilestoneMetadata): Promise<string> {
        const payer = this.getPayer();

        try {
            const program = this.getProgram();

            const [milestonePda] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('milestone'),
                    payer.publicKey.toBuffer(),
                    require("crypto").createHash("sha256").update(metadata.did).digest(),
                ],
                ANDROMEDA_PROGRAM_ID
            );

            const tx = await program.methods
                .submitMilestone(
                    Array.from(metadata.merkle_root),
                    metadata.ipfs_cid,
                    metadata.did,
                    metadata.ecosystem,
                    metadata.dao_identifier
                )
                .accounts({
                    milestone: milestonePda,
                    authority: payer.publicKey,
                    systemProgram: new PublicKey('11111111111111111111111111111111'),
                })
                .signers([payer])
                .rpc();

            logger.info(`✨ Milestone anchored: ${tx} (PDA: ${milestonePda.toBase58()})`);
            return tx;
        } catch (error: any) {
            logger.error(`❌ AnchorMilestone failed: ${error.message}`);
            throw error;
        }
    }

    async sendPayment(toPubkey: PublicKey, lamports: number): Promise<string> {
        const payer = this.getPayer();
        const { SystemProgram, Transaction, sendAndConfirmTransaction } = await import('@solana/web3.js');
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: payer.publicKey,
                toPubkey,
                lamports,
            })
        );
        const signature = await sendAndConfirmTransaction(this.getConnection(), transaction, [payer]);
        logger.info(`💰 Payment: ${lamports} lamports → ${toPubkey.toBase58()} (tx: ${signature})`);
        return signature;
    }

    async anchorBatch(metadata: any): Promise<string> {
        const payer = this.getPayer();
        const { PublicKey: PK, Transaction, TransactionInstruction, sendAndConfirmTransaction } = await import('@solana/web3.js');
        const MEMO_PROGRAM_ID = new PK('MemoSq4gqABZAn9asGmeqb91N9kk973vCdz9G9n3pXr');
        const memoData = JSON.stringify({ v: '1.0', bch: metadata.batch_id, roots: metadata.merkle_roots || [], ts: Date.now() });
        const transaction = new Transaction().add(new TransactionInstruction({
            keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(memoData, 'utf-8'),
        }));
        return await sendAndConfirmTransaction(this.getConnection(), transaction, [payer]);
    }

    async getStatus(): Promise<any> {
        try {
            const payer = this.payer;
            const slot = await this.getConnection().getSlot();
            const balance = payer ? await this.getConnection().getBalance(payer.publicKey) : 0;
            return {
                status: 'ok',
                slot,
                endpoint: this.endpoint,
                bot_address: payer?.publicKey.toBase58(),
                balance_sol: balance / 1e9,
                andromeda_program: ANDROMEDA_PROGRAM_ID.toBase58(),
            };
        } catch (error: any) {
            return { status: 'error', message: error.message };
        }
    }
}

export const solanaClient = new SolanaClient();
