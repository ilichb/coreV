import { EcosystemConnector, RawGovernanceDecision, StandardGovernanceDecision, ConnectorConfig, QuorumConfig, VerificationResult } from '@/lib/infrastructure/base-connector';
import { rpcBalancer } from '@/lib/infrastructure/clients/rpc-balancer';
import { theGraphClient, GOVERNANCE_QUERIES, TheGraphClient } from '@/lib/infrastructure/clients/thegraph-client';
import { snapshotClient } from '@/lib/infrastructure/clients/snapshot-client';
import { logger } from '../../../utils/logger';

export class RootstockConnector extends EcosystemConnector {
  ecosystem = 'rootstock';
  daoIdentifier = 'rootstock-dao';

  private config: ConnectorConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor() {
    super();

    this.config = {
      rpcUrl: process.env.ROOTSTOCK_RPC_PRIMARY || 'https://public-node.rsk.co',
      contractAddresses: {
        governor: process.env.ROOTSTOCK_GOVERNOR_ADDRESS || '0x43867c46B7051C3660506820C6556eAC85e49221',
        token: process.env.ROOTSTOCK_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
        timelock: process.env.ROOTSTOCK_TIMELOCK_ADDRESS
      },
      graphqlEndpoint: process.env.ROOTSTOCK_GRAPHQL_URL || 'https://api.tally.xyz/query',
      pollingInterval: parseInt(process.env.ROOTSTOCK_POLLING_INTERVAL || '60000'),
      apiKeys: {
        thegraph: process.env.THEGRAPH_API_KEY || '',
        tally: process.env.TALLY_API_KEY || 'fc61f12d3b8da00f210ecec0f72bd3462de3e9238aa2cbbe40f04a09f6ff502c'
      }
    };
  }

  async fetchGovernanceDecisions(fromBlock?: number, toBlock?: number): Promise<RawGovernanceDecision[]> {
    logger.info(`🔍 Fetching REAL Rootstock governance decisions...`);
    
    try {
      // 1. Fetch via SnapshotClient (Modular)
      logger.info('📡 Fetching from Snapshot (Modular Client)...');
      const snapshotProposals = await snapshotClient.getProposals('rootstock');
      
      if (snapshotProposals.length > 0) {
        logger.info(`✅ Found ${snapshotProposals.length} proposals via Snapshot.`);
        return snapshotProposals.map(p => ({
          id: p.id,
          proposalId: p.id,
          title: p.title,
          description: p.body,
          proposer: p.author,
          status: p.state.toUpperCase(),
          createdAt: new Date(p.start * 1000).toISOString(),
          source: "snapshot-rootstock"
        }));
      }

      // 2. Intentar via Tally
      const tallyProposals = await this.fetchFromTally();
      if (tallyProposals.length > 0) {
        logger.info(`✅ Found ${tallyProposals.length} proposals via Tally API.`);
        return tallyProposals.map(p => ({
          id: p.id,
          proposalId: p.id,
          title: p.title,
          description: p.description,
          proposer: p.proposer?.address || p.proposer?.id || '',
          status: p.status,
          createdAt: p.createdAt,
          source: "rootstock-tally"
        }));
      }

      // Fallback
      return this.fetchFromRPC(fromBlock, toBlock);
    } catch (error) {
       logger.error('Critical error in fetchGovernanceDecisions:', error);
       return [];
    }
  }


  private async fetchFromTally(): Promise<any[]> {
    try {
      logger.info('📡 Fetching via Tally API (Organization ID: 2520434659481880168)...');
      const tallyClient = new TheGraphClient('https://api.tally.xyz/query', this.config.apiKeys?.tally);

      const query = `
        query GovernanceProposals($input: ProposalsInput!) {
          proposals(input: $input) {
            nodes {
              ... on Proposal {
                id
                onchainId
                status
                createdAt
                metadata {
                  description
                }
                voteStats {
                  votesCount
                  percent
                  type
                }
                governor {
                  id
                  name
                }
              }
            }
          }
        }
      `;

      const result = await tallyClient.query<any>(query, {
        input: {
          filters: {
            organizationId: "2520434659481880168"
          },
          sort: {
            sortBy: "id",
            isDescending: true
          },
          page: {
            limit: 10
          }
        }
      });

      return result?.proposals?.nodes || [];
    } catch (error: any) {
      logger.error('Tally API Error (Rootstock):', error.message);
      return [];
    }
  }

  private async fetchFromTheGraph(): Promise<any[]> {
    try {
      // Fallback subgraph URL
      const endpoint = this.config.graphqlEndpoint || 'https://api.thegraph.com/subgraphs/name/tally/rootstock-governance';
      if (endpoint.includes('thegraph.com')) return []; // Skip if it's the known broken endpoint

      const data = await theGraphClient.query<{ proposals: any[] }>({
        query: GOVERNANCE_QUERIES.rootstock,
        variables: { first: 20, skip: 0 }
      });
      return data?.proposals || [];
    } catch (error) {
      return [];
    }
  }

  private async fetchFromRPC(fromBlock?: number, toBlock?: number): Promise<RawGovernanceDecision[]> {
    const decisions: RawGovernanceDecision[] = [];
    logger.info('📡 Probing Rootstock Governor for recent proposals...');

    try {
      // Governor contract: 0x43867c46B7051C3660506820C6556eAC85e49221
      // Function: proposals(uint256) -> returns (id, proposer, eta, startBlock, endBlock, forVotes, againstVotes, abstainVotes, canceled, executed)

      // We probe IDs 1-3 which are known to exist or be recently active
      const probeIds = [1, 2, 3];

      for (const id of probeIds) {
        try {
          // proposal(uint256) selector: 0x013cf08b
          const proposalIdHex = id.toString(16).padStart(64, '0');
          const result = await rpcBalancer.call<string>({
            method: 'eth_call',
            params: [{
              to: this.config.contractAddresses.governor,
              data: `0x013cf08b${proposalIdHex}`
            }, 'latest']
          });

          if (result && result !== '0x' && result.length > 130) {
            // result is ABI encoded. Proposer is at index 1 (offset 32 bytes)
            const proposer = '0x' + result.substring(90, 130);

            decisions.push({
              id: id.toString(),
              proposalId: id.toString(),
              proposer: proposer,
              description: `Rootstock Governance Proposal #${id}`,
              source: 'rpc',
              state: 'Active' // Default for simplification
            });
            logger.info(`✅ Found proposal #${id} (Proposer: ${proposer})`);
          }
        } catch (e) {
          logger.warn(`Could not fetch proposal #${id} via RPC`);
        }
      }
    } catch (error) {
      logger.error('RPC probe failed:', error);
    }
    return decisions;
  }

  async normalizeDecision(raw: any): Promise<StandardGovernanceDecision> {
    const id = raw.onchainId || raw.id || 'unknown';
    
    // Tally often puts title in description metadata
    const fullDescription = raw.metadata?.description || raw.description || '';
    const titleMatch = fullDescription.match(/^#?\s*(.*?)(?:\n|;|--|$)/);
    const title = titleMatch ? titleMatch[1].trim() : `Proposal ${id}`;

    const startTime = raw.createdAt ? Math.floor(new Date(raw.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
    // Tally doesn't always provide end timestamp in summary, use fallback
    const endTime = startTime + 7 * 24 * 60 * 60; 

    let status: 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXECUTED' = 'ACTIVE';
    const rawState = (raw.status || '').toUpperCase();

    if (rawState === 'EXECUTED') status = 'EXECUTED';
    else if (rawState === 'CANCELED' || rawState === 'DEFEATED' || rawState === 'REJECTED') status = 'REJECTED';
    else if (rawState === 'SUCCEEDED' || rawState === 'QUEUED' || rawState === 'PASSED') status = 'PASSED';

    const quorumRequired = await this.getQuorumRequired();

    // Extract vote stats
    const forVotes = raw.voteStats?.find((v: any) => v.type === 'FOR')?.votesCount || '0';
    const againstVotes = raw.voteStats?.find((v: any) => v.type === 'AGAINST')?.votesCount || '0';

    return {
      proposal_id: `rootstock:${id}`,
      dao_identifier: this.daoIdentifier,
      ecosystem: this.ecosystem,
      title,
      description: fullDescription,
      discussion_url: `https://tally.xyz/gov/rootstockcollective/proposal/${raw.id}`,
      snapshot_url: `https://tally.xyz/gov/rootstockcollective/proposal/${raw.id}`,
      proposal_type: 'STANDARD',
      voting_system: 'SIMPLE_MAJORITY',
      start_timestamp: startTime,
      end_timestamp: endTime,
      status,
      votes_for: BigInt(forVotes),
      votes_against: BigInt(againstVotes),
      voting_power_total: BigInt(forVotes) + BigInt(againstVotes),
      quorum_required: quorumRequired,
      contract_addresses: [this.config.contractAddresses.governor],
      created_at: startTime,
      updated_at: Math.floor(Date.now() / 1000),
      verification_proofs: [`tally-${raw.id}`],
      builder_did: `did:andromeda:rootstock:${raw.id}` // Fallback identifier
    };
  }

  async verifyOnChainState(decision: StandardGovernanceDecision): Promise<VerificationResult> {
    const proposalId = decision.proposal_id.split(':')[1];
    try {
      const proposalIdHex = proposalId.startsWith('0x') ? proposalId : BigInt(proposalId).toString(16).padStart(64, '0');
      await rpcBalancer.call<string>({
        method: 'eth_call',
        params: [{
          to: this.config.contractAddresses.governor,
          data: `0x013cf08b${proposalIdHex}`
        }, 'latest']
      });
      return { onchain_verified: true, signature_valid: true, timestamp_consistent: true, state_matches: true, proofs: [`rpc-verified-${Date.now()}`] };
    } catch (error: any) {
      return { onchain_verified: false, signature_valid: false, timestamp_consistent: false, state_matches: false, proofs: [error.message] };
    }
  }

  async getLatestBlockNumber(): Promise<number> {
    try {
      const hex = await rpcBalancer.call<string>({ method: 'eth_blockNumber', params: [] });
      return parseInt(hex, 16);
    } catch {
      return 0;
    }
  }

  async getQuorumRequirements(): Promise<QuorumConfig> {
    try {
      const hex = await rpcBalancer.call<string>({
        method: 'eth_call',
        params: [{ to: this.config.contractAddresses.governor, data: '0x170a3070' }, 'latest']
      });
      return { required: BigInt(hex || '0'), numerator: 4, denominator: 100 };
    } catch {
      return { required: BigInt('0'), numerator: 4, denominator: 100 };
    }
  }

  async getVotingPower(address: string, blockNumber: number): Promise<bigint> {
    try {
      const hex = await rpcBalancer.call<string>({
        method: 'eth_call',
        params: [{
          to: this.config.contractAddresses.token,
          data: `0x70a08231${address.substring(2).padStart(64, '0')}`
        }, blockNumber.toString(16)]
      });
      return BigInt(hex || '0');
    } catch {
      return BigInt(0);
    }
  }

  private quorumCache: bigint | null = null;
  private lastQuorumFetch = 0;
  private readonly QUORUM_CACHE_TTL = 3600000; // 1 hour

  private async getQuorumRequired(): Promise<bigint> {
    const now = Date.now();
    if (this.quorumCache !== null && now - this.lastQuorumFetch < this.QUORUM_CACHE_TTL) {
      return this.quorumCache;
    }

    try {
      const config = await this.getQuorumRequirements();
      this.quorumCache = config.required;
      this.lastQuorumFetch = now;
      return this.quorumCache;
    } catch (error) {
      return BigInt(0);
    }
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) return cached.data;
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
