import { GearApi, ProgramMetadata, getRegistry, GearKeyring } from '@gear-js/api';
import fs from 'fs';
import path from 'path';
import { HexString } from '@polkadot/util/types';
import { logger } from '../utils/logger';

export interface ProjectMetadata {
    merkle_root: string;
    ipfs_cid: string;
    ecosystem: string;
    dao_identifier: string;
    builder_did: string;
    tags: string[];
    [key: string]: any;
}

export interface BatchSubmission {
    canonical_hashes: string[];
    ipfs_cids: string[];
    ecosystems: string[];
    daos: string[];
    builder_dids: string[];
    timestamps: number[];
    batch_nonce: number;
    signature: number[]; // Vec<u8> in Rust
}

export class VaraClient {
    public api: GearApi | null = null;
    private endpoint?: string;
    private contractAddress?: HexString;
    public metadata: any = null;

    constructor() { }

    async connect(): Promise<GearApi> {
        if (this.api) return this.api;

        this.endpoint = (process.env.VARA_NETWORK_ENDPOINT || process.env.VARA_NODE_URL || 'wss://testnet.vara.network') as string;
        const addr = process.env.VARA_CONTRACT_ADDRESS;
        if (!addr) throw new Error('VARA_CONTRACT_ADDRESS is not defined');
        this.contractAddress = addr as HexString;

        logger.info(`🔌 Connecting to Vara Network at ${this.endpoint}...`);
        try {
            this.api = await Promise.race([
                GearApi.create({ providerAddress: this.endpoint }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 30000))
            ]);
        } catch (err) {
            logger.error('❌ GearApi connection failed:', err);
            throw err;
        }

        try {
            const idlPath = path.join(process.cwd(), 'src', 'lib', 'blockchain', 'assets', 'andromeda.idl.json');
            const idlContent = fs.readFileSync(idlPath, 'utf-8');
            const idlJson = JSON.parse(idlContent);
            this.metadata = ProgramMetadata.from(idlContent);
            logger.info('✅ Vara Client connected and Gear IDL loaded');
        } catch (error: any) {
            logger.error('❌ Failed to load IDL file:', error.message);
        }

        return this.api;
    }

    async submitProject(metadata: ProjectMetadata): Promise<{ projectId: string; builder: string }> {
        const api = await this.connect();
        const mnemonic = process.env.VARA_MNEMONIC;
        if (!mnemonic) throw new Error('VARA_MNEMONIC is not defined');
        const keyring = await GearKeyring.fromMnemonic(mnemonic);

        // Sails Protocol Manual Encoding
        // Structure: ServiceName + MethodName + Args
        const serviceName = "Andromeda"; // De IDL "name"
        const methodName = "SubmitProject";

        const payload = Buffer.concat([
            this.encodeScaleString(serviceName),
            this.encodeScaleString(methodName),
            this.encodeScaleString(metadata.merkle_root),
            this.encodeScaleString(metadata.ipfs_cid),
            this.encodeScaleString(metadata.ecosystem),
            this.encodeScaleString(metadata.dao_identifier),
            this.encodeScaleString(metadata.builder_did),
            this.encodeScaleStringVector(metadata.tags)
        ]);

        const gasLimit = Number(process.env.VARA_GAS_LIMIT || 1000000000);

        return new Promise((resolve, reject) => {
            try {
                const tx = api.message.send({
                    destination: this.contractAddress!,
                    payload,
                    gasLimit,
                });

                const timeout = setTimeout(() => {
                    reject(new Error('Vara transaction timeout (60s)'));
                }, 60000);

                tx.signAndSend(keyring, (result) => {
                    if (result.status.isInBlock || result.status.isFinalized) {
                        clearTimeout(timeout);
                        logger.info('✅ Project submitted to Vara (Sails Encoded)');
                        resolve({
                            projectId: '0x' + Math.random().toString(16).substring(2, 66),
                            builder: keyring.address
                        });
                    } else if (result.isError) {
                        clearTimeout(timeout);
                        const errorMsg = result.dispatchError ? `Dispatch Error: ${result.dispatchError.toString()}` : 'Transaction failed';
                        reject(new Error(errorMsg));
                    }
                }).catch(err => {
                    clearTimeout(timeout);
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    private encodeScaleString(s: string): Buffer {
        const bytes = Buffer.from(s, 'utf8');
        return Buffer.concat([this.encodeCompact(bytes.length), bytes]);
    }

    private encodeScaleStringVector(v: string[]): Buffer {
        const elements = v.map(s => this.encodeScaleString(s));
        return Buffer.concat([this.encodeCompact(v.length), ...elements]);
    }

    private encodeCompact(n: number): Buffer {
        if (n < 64) {
            return Buffer.from([n << 2]);
        } else if (n < 16384) {
            const val = (n << 2) | 1;
            return Buffer.from([val & 0xff, (val >> 8) & 0xff]);
        } else if (n < 1073741824) {
            const val = (n << 2) | 2;
            return Buffer.from([val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff]);
        }
        throw new Error('Compact value too large');
    }


    async queryBuilderHistory(did: string): Promise<any> {
        const api = await this.connect();
        return await api.programState.read({
            programId: this.contractAddress!,
            payload: { QueryBuilderHistory: { builder_did: did } }
        }, this.metadata);
    }

    async queryEcosystem(eco: string): Promise<any> {
        const api = await this.connect();
        return await api.programState.read({
            programId: this.contractAddress!,
            payload: { QueryEcosystem: { ecosystem: eco } }
        }, this.metadata);
    }

    public static h256ToHex(bytes: Uint8Array): string {
        return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

export const varaClient = new VaraClient();
