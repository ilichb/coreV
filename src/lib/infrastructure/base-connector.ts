export interface RawGovernanceDecision {
  [key: string]: any;
}

export interface StandardGovernanceDecision {
  proposal_id: string;
  dao_identifier: string;
  ecosystem: string;
  title: string;
  description: string;
  discussion_url: string;
  snapshot_url: string;
  proposal_type: 'STANDARD' | 'BUDGET' | 'PARAMETER_CHANGE';
  voting_system: 'SIMPLE_MAJORITY' | 'QUORUM' | 'QUADRATIC';
  start_timestamp: number;
  end_timestamp: number;
  status: 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXECUTED';
  votes_for: bigint;
  votes_against: bigint;
  voting_power_total: bigint;
  quorum_required: bigint;
  funding_amount?: string;
  funding_token?: string;
  milestones?: number;
  contract_addresses?: string[];
  parameter_changes?: Array<{
    contract: string;
    method: string;
    old_value: string;
    new_value: string;
  }>;
  created_at: number;
  updated_at: number;
  executed_at?: number;
  onchain_tx_hash?: string;
  ipfs_cid?: string;
  verification_proofs?: string[];
  builder_did?: string;
  tags?: string[];
}

export interface ConnectorConfig {
  rpcUrl: string;
  contractAddresses: {
    governor: string;
    token: string;
    timelock?: string;
  };
  graphqlEndpoint?: string;
  apiKeys?: Record<string, string>;
  pollingInterval: number;
}

export interface QuorumConfig {
  required: bigint;
  numerator: number;
  denominator: number;
}

export interface VerificationResult {
  onchain_verified: boolean;
  signature_valid: boolean;
  timestamp_consistent: boolean;
  state_matches: boolean;
  proofs: string[];
}

export abstract class EcosystemConnector {
  abstract ecosystem: string;
  abstract daoIdentifier: string;

  abstract fetchGovernanceDecisions(
    fromBlock?: number,
    toBlock?: number
  ): Promise<RawGovernanceDecision[]>;

  abstract normalizeDecision(
    raw: RawGovernanceDecision
  ): Promise<StandardGovernanceDecision>;

  abstract verifyOnChainState(
    decision: StandardGovernanceDecision
  ): Promise<VerificationResult>;

  abstract getLatestBlockNumber(): Promise<number>;
  abstract getVotingPower(address: string, blockNumber: number): Promise<bigint>;
  abstract getQuorumRequirements(): Promise<QuorumConfig>;
}
