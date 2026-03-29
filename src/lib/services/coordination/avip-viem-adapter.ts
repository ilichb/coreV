import {
    createPublicClient,
    createWalletClient,
    http,
    keccak256,
    stringToHex,
    Address,
    Hash,
    zeroHash,
    publicActions,
    formatEther,
    parseEther,
    toHex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat, sepolia, polygonZkEvmTestnet } from 'viem/chains';
import { logger } from '../../utils/logger';
import { Mutex } from 'async-mutex';
import * as z from 'zod';
import fs from 'fs';
import path from 'path';

// --- Esquemas de Validación ---

const ScorecardSchema = z.object({
    id: z.string().optional(),
    daoId: z.string().startsWith('0x'),
    proposalId: z.string(),
    userId: z.string(),
    vote: z.union([z.string(), z.number()]),
    weight: z.number().min(0),
    timestamp: z.number(),
    metadata: z.record(z.any()).optional()
});

export type Scorecard = z.infer<typeof ScorecardSchema>;

// ABI completo del contrato AVIPRegistry
const AVIP_REGISTRY_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    { "inputs": [], "name": "AlreadyVerified", "type": "error" },
    { "inputs": [], "name": "BatchAlreadyExists", "type": "error" },
    { "inputs": [], "name": "BatchNotFound", "type": "error" },
    { "inputs": [], "name": "InvalidBatchSize", "type": "error" },
    { "inputs": [], "name": "InvalidMerkleRoot", "type": "error" },
    { "inputs": [], "name": "InvalidPreviousBatch", "type": "error" },
    { "inputs": [], "name": "UnauthorizedValidator", "type": "error" },
    { "inputs": [], "name": "ZeroAddress", "type": "error" },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "bytes32", "name": "batchId", "type": "bytes32" },
            { "indexed": true, "internalType": "bytes32", "name": "merkleRoot", "type": "bytes32" },
            { "indexed": false, "internalType": "bytes32", "name": "mmrRoot", "type": "bytes32" },
            { "indexed": true, "internalType": "address", "name": "submitter", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "itemCount", "type": "uint256" },
            { "indexed": false, "internalType": "bytes32", "name": "previousBatchId", "type": "bytes32" }
        ],
        "name": "BatchSubmitted",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "validator", "type": "address" }
        ],
        "name": "isValidatorAuthorized",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getLatestBatch",
        "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "merkleRoot", "type": "bytes32" },
            { "internalType": "bytes32", "name": "mmrRoot", "type": "bytes32" },
            { "internalType": "uint256", "name": "itemCount", "type": "uint256" },
            { "internalType": "bytes32", "name": "previousBatchId", "type": "bytes32" }
        ],
        "name": "submitBatch",
        "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "batchId", "type": "bytes32" }
        ],
        "name": "getBatch",
        "outputs": [
            {
                "components": [
                    { "internalType": "bytes32", "name": "batchId", "type": "bytes32" },
                    { "internalType": "bytes32", "name": "merkleRoot", "type": "bytes32" },
                    { "internalType": "bytes32", "name": "mmrRoot", "type": "bytes32" },
                    { "internalType": "address", "name": "submitter", "type": "address" },
                    { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
                    { "internalType": "uint256", "name": "itemCount", "type": "uint256" },
                    { "internalType": "bytes32", "name": "previousBatchId", "type": "bytes32" },
                    { "internalType": "bool", "name": "verified", "type": "bool" }
                ],
                "internalType": "struct AVIPRegistry.Batch",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalBatches",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "batchId", "type": "bytes32" }
        ],
        "name": "verifyChainIntegrity",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export interface AVIPBatchResult {
    success: boolean;
    batchId?: string;
    txHash?: string;
    error?: string;
    itemCount?: number;
    merkleRoot?: string;
}

export class AVIPViemAdapter {
    private publicClient;
    private walletClient;
    private account;
    private contractAddress: Address;
    private batchSize: number;
    private maxWaitTime: number;
    private queue: Array<{ scorecard: Scorecard; metadata: any }> = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private mutex = new Mutex();
    private processedHashes = new Set<string>();
    private readonly MAX_RETRIES = 3;
    private readonly DLQ_PATH = path.join(process.cwd(), 'data/avip-dlq.json');

    constructor() {
        const rpcUrl = process.env.AVIP_RPC_URL || 'http://localhost:8545';
        const network = process.env.AVIP_NETWORK || 'hardhat';

        let chain;
        switch (network) {
            case 'sepolia':
                chain = sepolia;
                break;
            case 'polygon-zkevm':
                chain = polygonZkEvmTestnet;
                break;
            default:
                chain = hardhat;
        }

        this.account = privateKeyToAccount(
            (process.env.AVIP_PRIVATE_KEY as Hash) ||
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
        );

        this.publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl)
        });

        this.walletClient = createWalletClient({
            account: this.account,
            chain,
            transport: http(rpcUrl)
        }).extend(publicActions);

        this.contractAddress = (process.env.AVIP_CONTRACT_ADDRESS as Address) ||
            '0x5FbDB2315678afecb367f032d93F642f64180aa3';

        this.batchSize = parseInt(process.env.AVIP_BATCH_SIZE || '10');
        this.maxWaitTime = parseInt(process.env.AVIP_MAX_WAIT_TIME || '30000');

        logger.info('🛡️ AVIP Hardened Viem Adapter initialized', {
            network,
            contract: this.contractAddress,
            batchSize: this.batchSize
        });
    }

    /**
     * Valida y encola un scorecard con chequeo de idempotencia
     */
    async submitScorecard(scorecard: any, metadata?: any): Promise<{ queued: boolean; error?: string }> {
        if (process.env.AVIP_ENABLED !== 'true') return { queued: false };

        try {
            // 1. Validación de Esquema
            // Nota: Usar import * as z permite evitar problemas con ciertos bundlers
            const validated = ScorecardSchema.parse(scorecard);

            // 2. Idempotencia: Evitar duplicados
            const scorecardHash = keccak256(stringToHex(JSON.stringify(validated)));
            if (this.processedHashes.has(scorecardHash)) {
                logger.warn('⚠️ Duplicate scorecard detected, skipping AVIP enqueue', { hash: scorecardHash });
                return { queued: false, error: 'Duplicate scorecard' };
            }

            this.queue.push({ scorecard: validated, metadata: metadata || {} });
            this.processedHashes.add(scorecardHash);

            // Limpieza periódica de hashes (opcional, aquí mantenemos los de la sesión actual)
            if (this.processedHashes.size > 1000) this.processedHashes.clear();

            logger.info(`🛡️ Scorecard enqueued for AVIP batch`, {
                queueSize: this.queue.length,
                scorecardId: validated.id || 'unknown'
            });

            // 3. Disparar Flush si se alcanza el umbral
            if (this.queue.length >= this.batchSize) {
                this.flush(); // Sin await para no bloquear respuesta del API
            } else if (!this.flushTimer) {
                this.flushTimer = setTimeout(() => this.flush(), this.maxWaitTime);
            }

            return { queued: true };
        } catch (error: any) {
            // Manejo amable de errores de validación
            const errorMessage = error instanceof z.ZodError
                ? JSON.stringify(error.format())
                : error.message;

            logger.error('❌ Failed to validate/enqueue scorecard for AVIP', { error: errorMessage });
            return { queued: false, error: errorMessage };
        }
    }

    /**
     * Procesa el lote con Mutex y lógica de reintentos
     */
    async flush(): Promise<AVIPBatchResult> {
        return this.mutex.runExclusive(async () => {
            if (this.queue.length === 0) return { success: false, error: 'Queue empty' };

            if (this.flushTimer) {
                clearTimeout(this.flushTimer);
                this.flushTimer = null;
            }

            const itemsToProcess = [...this.queue];
            this.queue = []; // Limpiamos preventivamente; si falla, re-encolamos con lógica de retry

            let attempt = 0;
            while (attempt < this.MAX_RETRIES) {
                try {
                    logger.info(`🚀 Starting AVIP flush attempt ${attempt + 1}/${this.MAX_RETRIES}`, {
                        itemCount: itemsToProcess.length
                    });

                    const merkleRoot = this.calculateBatchMerkleRoot(itemsToProcess.map(i => i.scorecard));

                    const latestBatchId = await this.publicClient.readContract({
                        address: this.contractAddress,
                        abi: AVIP_REGISTRY_ABI,
                        functionName: 'getLatestBatch'
                    }) as Hash;

                    const gas = await this.publicClient.estimateContractGas({
                        address: this.contractAddress,
                        abi: AVIP_REGISTRY_ABI,
                        functionName: 'submitBatch',
                        args: [
                            merkleRoot as Hash,
                            keccak256(stringToHex('avip-v2-' + Date.now())),
                            BigInt(itemsToProcess.length),
                            latestBatchId === '0x' ? zeroHash : latestBatchId
                        ],
                        account: this.account
                    });

                    const hash = await this.walletClient.writeContract({
                        address: this.contractAddress,
                        abi: AVIP_REGISTRY_ABI,
                        functionName: 'submitBatch',
                        args: [
                            merkleRoot as Hash,
                            keccak256(stringToHex('avip-v2-' + Date.now())),
                            BigInt(itemsToProcess.length),
                            latestBatchId === '0x' ? zeroHash : latestBatchId
                        ],
                        gas: (gas * 120n) / 100n
                    });

                    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

                    logger.info(`✅ AVIP Batch confirmed`, {
                        txHash: hash,
                        gasUsed: receipt.gasUsed.toString()
                    });

                    return {
                        success: true,
                        txHash: hash,
                        itemCount: itemsToProcess.length,
                        merkleRoot
                    };

                } catch (error: any) {
                    attempt++;
                    logger.error(`💥 AVIP Flush attempt ${attempt} failed`, { error: error.message });

                    if (attempt < this.MAX_RETRIES) {
                        const delay = Math.pow(2, attempt) * 1000;
                        logger.info(`⏳ Retrying in ${delay / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // Fallo definitivo: Guardar en Dead Letter Queue y Re-encolar para el siguiente ciclo
                        logger.error('🚨 MAX_RETRIES reached. Moving to Dead Letter Queue for auditing.');
                        await this.saveToDeadLetterQueue(itemsToProcess, error.message);

                        // Opcional: Re-encolar si se prefiere intentar más tarde automáticamente
                        // this.queue.unshift(...itemsToProcess);

                        return {
                            success: false,
                            error: `Max retries reached: ${error.message}`,
                            itemCount: itemsToProcess.length
                        };
                    }
                }
            }

            return { success: false, error: 'Unknown terminal error' };
        });
    }

    /**
     * Guarda los lotes fallidos en un archivo local para revisión manual
     */
    private async saveToDeadLetterQueue(items: any[], error: string) {
        try {
            const dlqEntry = {
                timestamp: new Date().toISOString(),
                error,
                itemCount: items.length,
                batch: items.map(i => i.scorecard)
            };

            const dir = path.dirname(this.DLQ_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            let currentDlq: any[] = [];
            if (fs.existsSync(this.DLQ_PATH)) {
                try {
                    currentDlq = JSON.parse(fs.readFileSync(this.DLQ_PATH, 'utf8'));
                } catch (e) {
                    logger.warn('⚠️ DLQ file corrupted, starting fresh');
                }
            }

            currentDlq.push(dlqEntry);
            fs.writeFileSync(this.DLQ_PATH, JSON.stringify(currentDlq, null, 2));

            logger.info(`📁 Batch saved to DLQ: ${this.DLQ_PATH}`);
        } catch (e: any) {
            logger.error('❌ Failed to save to DLQ!', { error: e.message });
        }
    }

    private calculateBatchMerkleRoot(items: Scorecard[]): string {
        const hashes = items.map(item =>
            keccak256(stringToHex(JSON.stringify(item)))
        );

        if (hashes.length === 0) return zeroHash;
        if (hashes.length === 1) return hashes[0];

        const buildTree = (level: Hash[]): Hash => {
            if (level.length === 1) return level[0];
            const nextLevel: Hash[] = [];
            for (let i = 0; i < level.length; i += 2) {
                const left = level[i];
                const right = i + 1 < level.length ? level[i + 1] : left;
                nextLevel.push(keccak256(stringToHex(left + right)));
            }
            return buildTree(nextLevel);
        };

        return buildTree(hashes);
    }

    async healthCheck() {
        try {
            const [block, balance, code, isVal, total, gasPrice] = await Promise.all([
                this.publicClient.getBlockNumber(),
                this.publicClient.getBalance({ address: this.account.address }),
                this.publicClient.getBytecode({ address: this.contractAddress }),
                this.publicClient.readContract({
                    address: this.contractAddress,
                    abi: AVIP_REGISTRY_ABI,
                    functionName: 'isValidatorAuthorized',
                    args: [this.account.address]
                }),
                this.publicClient.readContract({
                    address: this.contractAddress,
                    abi: AVIP_REGISTRY_ABI,
                    functionName: 'totalBatches'
                }),
                this.publicClient.getGasPrice()
            ]);

            const gasGwei = formatEther(gasPrice); // Viem no tiene formatGwei por defecto tan directo como ethers, pero formatEther/parseUnits sirve
            const isCongested = gasPrice > parseEther('0.0000001'); // > 100 Gwei (ejemplo)

            return {
                healthy: !!block && code !== '0x' && isVal && !isCongested,
                rpc: "connected",
                balance: formatEther(balance),
                contract: code !== '0x' ? "deployed" : "missing",
                isValidator: isVal,
                totalBatches: Number(total),
                queueSize: this.queue.length,
                gasPriceGwei: (Number(gasPrice) / 1e9).toFixed(2),
                networkCongested: isCongested,
                dlqSize: fs.existsSync(this.DLQ_PATH) ? JSON.parse(fs.readFileSync(this.DLQ_PATH, 'utf8')).length : 0
            };
        } catch (e: any) {
            return { healthy: false, error: e.message };
        }
    }
}

export const avipViemAdapter = new AVIPViemAdapter();
