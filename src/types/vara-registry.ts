export interface ChainAddress {
  chain: string;    // "eth", "sol", "pol", "avax", "vara"
  address: string;  // 0x... o pubkey base58
}

export interface BuilderIdentity {
  did: string;                    // did:andromeda:eth:0x...
  reputation_score: number;       // 0-1000
  total_projects: number;
  first_seen: number;             // Timestamp
  cross_chain_addresses: ChainAddress[];
  last_activity: number;
}

export interface Signature {
  signer_did: string;
  signature_type: string;   // "EIP-712", "Ed25519", "Vara"
  signature: string;
}

export interface DecisionMetadata {
  outcome: string;               // "APPROVED", "REJECTED", "PENDING"
  votes_for: number;
  votes_against: number;
  clarity_score: number;         // 0-100
  funding_amount?: string;       // "$50,000"
  milestones?: number;
}

export interface ProjectRecord {
  canonical_hash: string;
  ipfs_cid: string;
  ecosystem: string;             // "ethereum", "solana", "polkadot", "rootstock"
  dao_identifier: string;        // "rootstock-dao", "uniswap-dao", "aave-dao"
  builder_did: string;
  builder_actor: string;         // ActorId en Vara
  submission_timestamp: number;
  signatures: Signature[];
  tags: string[];                // "defi", "nft", "infrastructure", "ai"
  decision_metadata?: DecisionMetadata;
}

export interface RegistryEvent {
  type: 'ProjectSubmitted' | 'BuilderRegistered' | 'DaoRegistered' | 'DaoVerified';
  data: any;
}

export interface IoBuilderHistory {
  builder_did: string;
  identity: BuilderIdentity;
  projects: ProjectRecord[];
  total_count: number;
}

export interface IoEcosystemView {
  ecosystem: string;
  stats: {
    total_projects: number;
    active_builders: number;
    total_evaluations: number;
    average_clarity: number;
    approval_rate: number;
  };
  recent_projects: ProjectRecord[];
  top_builders: BuilderIdentity[];
}

export interface IoDaoView {
  dao: {
    dao_name: string;
    ecosystem: string;
    verified: boolean;
    project_count: number;
    admin_dids: string[];
    created_at: number;
  };
  projects: ProjectRecord[];
  builder_count: number;
}

export interface IoSearchResults {
  by_tags: ProjectRecord[];
  by_ecosystem: ProjectRecord[];
  by_builder: ProjectRecord[];
  total_count: number;
}

export interface VaraSubmitResult {
  success: boolean;
  txHash?: string;
  blockHash?: string;
  error?: string;
  event?: RegistryEvent;
}
