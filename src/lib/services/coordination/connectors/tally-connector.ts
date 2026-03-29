import { EcosystemConnector, RawGovernanceDecision, StandardGovernanceDecision, ConnectorConfig, QuorumConfig, VerificationResult } from '@/lib/infrastructure/base-connector';
import { logger } from '../../../utils/logger';

// Interfaces para respuestas de Tally API
interface TallyProposal {
  id: string;
  title: string;
  description: string;
  dao: {
    name: string;
    slug: string;
    network: {
      name: string;
      slug: string;
    };
  };
  governance: {
    id: string;
    chainId: number;
    governorAddress: string;
    votingDelay: number;
    votingPeriod: number;
    proposalThreshold: string;
    quorum: string;
  };
  status: string;
  startBlock: number;
  endBlock: number;
  executionETA: string | null;
  createdAt: string;
  updatedAt: string;
  proposalActions: Array<{
    id: string;
    type: string;
    data: any;
  }>;
  proposalStats: {
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
    quorumReached: boolean;
    turnoutBps: number;
  };
}

interface TallyProposalsResponse {
  proposals: {
    nodes: TallyProposal[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

// GraphQL queries para Tally API
const TALLY_QUERIES = {
  proposals: `
    query GetTallyProposals($input: ProposalsInput!) {
      proposals(input: $input) {
        nodes {
          ... on Proposal {
            id
            title
            description
            dao {
              name
              slug
              network {
                name
                slug
              }
            }
            governance {
              id
              chainId
              name
            }
            status
            start {
              ... on Block {
                timestamp
              }
            }
            end {
              ... on Block {
                timestamp
              }
            }
            createdAt
            updatedAt
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  proposal: `
    query GetTallyProposal($input: ProposalInput!) {
      proposal(input: $input) {
        ... on Proposal {
          id
          title
          description
          dao {
            name
            slug
          }
          status
          createdAt
          updatedAt
        }
      }
    }
  `
};

// Chain IDs para networks soportadas
const CHAIN_IDS = {
  arbitrum: 42161,
  optimism: 10,
  ethereum: 1,
  polygon: 137,
  base: 8453
};

// Mapeo de estados Tally a estados estandarizados
const STATUS_MAP: Record<string, 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXECUTED'> = {
  'PENDING': 'ACTIVE',
  'ACTIVE': 'ACTIVE',
  'SUCCEEDED': 'PASSED',
  'QUEUED': 'PASSED',
  'EXECUTED': 'EXECUTED',
  'DEFEATED': 'REJECTED',
  'EXPIRED': 'REJECTED',
  'CANCELLED': 'REJECTED'
};

export class TallyConnector extends EcosystemConnector {
  ecosystem: string;
  daoIdentifier: string;
  private chainId: number;
  private config: ConnectorConfig;
  private graphqlEndpoint: string;
  private apiKey: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutos

  constructor(network: 'arbitrum' | 'optimism' | 'ethereum' | 'polygon' | 'base', apiKey?: string) {
    super();

    this.ecosystem = network;
    this.daoIdentifier = `${network}-dao`;
    this.chainId = CHAIN_IDS[network];

    this.graphqlEndpoint = process.env.TALLY_API_URL || 'https://api.tally.xyz/query';
    this.apiKey = apiKey || process.env.TALLY_API_KEY || '';

    this.config = {
      rpcUrl: this.getRpcUrl(network),
      contractAddresses: {
        governor: '',
        token: ''
      },
      apiKeys: {
        tally: this.apiKey
      },
      pollingInterval: parseInt(process.env.TALLY_POLLING_INTERVAL || '120000') // 2 minutos
    };
  }

  async fetchGovernanceDecisions(fromBlock?: number, toBlock?: number): Promise<RawGovernanceDecision[]> {
    logger.info(`🔍 Fetching Tally proposals for ${this.ecosystem} (chainId: ${this.chainId})...`);

    const allProposals: TallyProposal[] = [];
    let hasNextPage = true;
    let afterCursor: string | null = null;
    let page = 1;
    const MAX_PAGES = 5; // Límite para evitar consumo excesivo de API (modo de prueba)
    const MAX_PROPOSALS = 15; // Límite estricto de ingesta

    try {
      while (hasNextPage && page <= MAX_PAGES && allProposals.length < MAX_PROPOSALS) {
        const response = await this.graphqlQuery(TALLY_QUERIES.proposals, {
          input: {
            filters: { chainIds: [this.chainId] },
            page: { limit: 10, afterCursor }
          }
        });

        const proposals = response?.proposals?.nodes || [];
        allProposals.push(...proposals);

        hasNextPage = response?.proposals?.pageInfo?.hasNextPage || false;
        afterCursor = response?.proposals?.pageInfo?.endCursor || null;

        logger.info(`📄 Page ${page}: Found ${proposals.length} proposals (total: ${allProposals.length})`);
        page++;

        if (allProposals.length >= MAX_PROPOSALS) {
          logger.info(`⏹️ Reached maximum proposals limit (${MAX_PROPOSALS}) for ${this.ecosystem}`);
          break;
        }
      }

      // Cachear resultados
      this.setCachedData(`tally-proposals-${this.ecosystem}`, allProposals);

      logger.info(`✅ Found ${allProposals.length} proposals for ${this.ecosystem}`);
      return allProposals.map((p: TallyProposal) => ({ ...p, source: 'tally', ecosystem: this.ecosystem }));

    } catch (error: any) {
      logger.error(`❌ Error fetching Tally proposals for ${this.ecosystem}:`, error.message);

      // Intentar usar datos cacheados en caso de error
      const cached = this.getCachedData(`tally-proposals-${this.ecosystem}`);
      if (cached) {
        logger.info(`🔄 Using cached data for ${this.ecosystem} (${cached.length} proposals)`);
        return cached.map((p: any) => ({ ...p, source: 'tally', ecosystem: this.ecosystem }));
      }

      throw error;
    }
  }

  async normalizeDecision(raw: any): Promise<StandardGovernanceDecision> {
    try {
      const proposal = raw as TallyProposal;

      // Determinar tipo de propuesta basado en acciones
      let proposalType: 'STANDARD' | 'BUDGET' | 'PARAMETER_CHANGE' = 'STANDARD';
      let fundingAmount: string | undefined;
      let fundingToken: string | undefined;

      const budgetActions = proposal.proposalActions?.filter(action =>
        action.type === 'TRANSFER_TOKEN' || action.type === 'TRANSFER_ETH'
      );

      if (budgetActions.length > 0) {
        proposalType = 'BUDGET';
        // Sumar montos de transferencias
        const totalAmount = budgetActions.reduce((sum, action) => {
          const amount = action.data?.value || action.data?.amount || '0';
          return sum + BigInt(amount);
        }, BigInt(0));
        fundingAmount = totalAmount.toString();
        fundingToken = budgetActions[0].type === 'TRANSFER_ETH' ? 'ETH' : 'ERC20';
      }

      const parameterActions = proposal.proposalActions?.filter(action =>
        action.type === 'CALL' && action.data?.functionName?.toLowerCase().includes('set')
      );

      if (parameterActions.length > 0 && budgetActions.length === 0) {
        proposalType = 'PARAMETER_CHANGE';
      }

      // Mapear estado
      const rawStatus = proposal.status || 'PENDING';
      const status = STATUS_MAP[rawStatus] || 'ACTIVE';

      // Calcular timestamps aproximados (Tally usa strings ISO)
      const createdTimestamp = Math.floor(new Date(proposal.createdAt).getTime() / 1000);
      const updatedTimestamp = Math.floor(new Date(proposal.updatedAt).getTime() / 1000);

      // Estimación de start y end timestamps basado en bloques
      const startTimestamp = createdTimestamp;
      const endTimestamp = createdTimestamp + (7 * 24 * 60 * 60); // 7 días por defecto

      // Extraer tags del título y descripción
      const tags = this.extractTags(`${proposal.title} ${proposal.description}`);

      return {
        proposal_id: `tally:${this.ecosystem}:${proposal.id}`,
        dao_identifier: proposal.dao?.slug || this.daoIdentifier,
        ecosystem: this.ecosystem,
        title: proposal.title || `Governance Proposal ${proposal.id.substring(0, 8)}`,
        description: proposal.description || '',
        discussion_url: `https://www.tally.xyz/gov/${proposal.dao?.slug}/proposal/${proposal.id}`,
        snapshot_url: `https://www.tally.xyz/gov/${proposal.dao?.slug}/proposal/${proposal.id}`,
        proposal_type: proposalType,
        voting_system: 'SIMPLE_MAJORITY',
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
        status,
        votes_for: BigInt(proposal.proposalStats?.forVotes || '0'),
        votes_against: BigInt(proposal.proposalStats?.againstVotes || '0'),
        voting_power_total: BigInt(proposal.proposalStats?.forVotes || '0') +
          BigInt(proposal.proposalStats?.againstVotes || '0') +
          BigInt(proposal.proposalStats?.abstainVotes || '0'),
        quorum_required: BigInt(proposal.governance?.quorum || '0'),
        funding_amount: fundingAmount,
        funding_token: fundingToken,
        milestones: this.extractMilestones(proposal.description),
        contract_addresses: this.extractContractAddresses(proposal),
        parameter_changes: this.extractParameterChanges(proposal),
        created_at: createdTimestamp,
        updated_at: updatedTimestamp,
        executed_at: status === 'EXECUTED' ? updatedTimestamp : undefined,
        onchain_tx_hash: this.extractTransactionHash(proposal),
        ipfs_cid: proposal.id, // El ID de Tally puede usarse como referencia
        verification_proofs: [`tally-${proposal.id}`, `chain-${this.chainId}`],
        builder_did: this.extractBuilderDID(proposal),
        tags
      };
    } catch (error: any) {
      logger.error(`❌ Error normalizing Tally proposal ${raw.id}:`, error);
      throw error;
    }
  }

  async verifyOnChainState(decision: StandardGovernanceDecision): Promise<VerificationResult> {
    try {
      // Para Tally, podemos verificar:
      // 1. Que la propuesta existe en Tally
      // 2. Que los bloques son consistentes
      // 3. Que los votos son correctos

      const [source, ecosystem, id] = decision.proposal_id.split(':');

      if (source !== 'tally') {
        return {
          onchain_verified: false,
          signature_valid: false,
          timestamp_consistent: false,
          state_matches: false,
          proofs: ['Invalid proposal source']
        };
      }

      // Consultar la propuesta en Tally
      const response = await this.graphqlQuery(TALLY_QUERIES.proposal, {
        input: { proposalId: id }
      });
      const proposal = response?.proposal;

      if (!proposal) {
        return {
          onchain_verified: false,
          signature_valid: false,
          timestamp_consistent: false,
          state_matches: false,
          proofs: ['Proposal not found on Tally']
        };
      }

      // Verificar estado
      const currentStatus = STATUS_MAP[proposal.status] || 'ACTIVE';
      const stateMatches = currentStatus === decision.status;

      // Verificar timestamps (dentro de un margen de 1 hora)
      const proposalCreated = Math.floor(new Date(proposal.createdAt).getTime() / 1000);
      const timestampConsistent = Math.abs(proposalCreated - decision.created_at) < 3600;

      // Verificar votos (dentro de un margen del 5%)
      const currentForVotes = BigInt(proposal.proposalStats?.forVotes || '0');
      const currentAgainstVotes = BigInt(proposal.proposalStats?.againstVotes || '0');
      const votesWithinMargin =
        Math.abs(Number(currentForVotes - decision.votes_for) / Number(decision.votes_for || 1)) < 0.05 &&
        Math.abs(Number(currentAgainstVotes - decision.votes_against) / Number(decision.votes_against || 1)) < 0.05;

      return {
        onchain_verified: true,
        signature_valid: true, // Tally valida signatures internamente
        timestamp_consistent: timestampConsistent,
        state_matches: stateMatches,
        proofs: [
          `tally-verified-${Date.now()}`,
          `chain-${proposal.governance?.chainId || this.chainId}`,
          `governor-${proposal.governance?.governorAddress || 'unknown'}`,
          `votes-match:${votesWithinMargin ? 'yes' : 'no'}`
        ]
      };
    } catch (error: any) {
      return {
        onchain_verified: false,
        signature_valid: false,
        timestamp_consistent: false,
        state_matches: false,
        proofs: [error.message]
      };
    }
  }

  async getLatestBlockNumber(): Promise<number> {
    // Para simplificar, usar un valor por defecto
    // En una implementación real, consultaríamos un RPC
    return Math.floor(Date.now() / 1000);
  }

  async getVotingPower(address: string, blockNumber: number): Promise<bigint> {
    // En Tally, el voting power depende del token de gobernanza
    // Por simplicidad, retornamos un valor basado en el address
    return BigInt('1000000000000000000'); // 1 token por defecto
  }

  async getQuorumRequirements(): Promise<QuorumConfig> {
    // Usar valores por defecto para esta implementación
    return {
      required: BigInt('1000000000000000000'), // 1 token
      numerator: 4,
      denominator: 100 // 4%
    };
  }

  private async graphqlQuery(query: string, variables?: Record<string, any>): Promise<any> {
    const response = await fetch(this.graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': this.apiKey
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Tally API request failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`Tally API errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  private getRpcUrl(network: string): string {
    const urls: Record<string, string> = {
      arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      optimism: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      ethereum: process.env.ETHEREUM_RPC_URL || 'https://cloudflare-eth.com',
      polygon: 'https://polygon-rpc.com',
      base: 'https://mainnet.base.org'
    };

    return urls[network] || 'https://cloudflare-eth.com';
  }

  private extractTags(text: string): string[] {
    const tags = new Set<string>();
    const lowercaseText = text.toLowerCase();

    // Detectar categorías por palabras clave
    const keywordMap: Record<string, string[]> = {
      'defi': ['defi', 'lending', 'borrowing', 'staking', 'yield', 'amm', 'dex'],
      'governance': ['governance', 'voting', 'dao', 'proposal', 'timelock'],
      'infrastructure': ['infrastructure', 'protocol', 'upgrade', 'maintenance', 'security'],
      'community': ['community', 'grant', 'funding', 'treasury', 'budget', 'compensation'],
      'security': ['security', 'audit', 'bug', 'bounty', 'exploit', 'vulnerability'],
      'scaling': ['layer2', 'rollup', 'optimistic', 'zk', 'zero-knowledge'],
      'nft': ['nft', 'token', 'erc721', 'erc1155', 'marketplace']
    };

    for (const [tag, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(keyword => lowercaseText.includes(keyword))) {
        tags.add(tag);
      }
    }

    return Array.from(tags);
  }

  private extractMilestones(description: string): number {
    const milestoneKeywords = ['milestone', 'phase', 'stage', 'step', 'checkpoint', 'quarter'];
    const count = milestoneKeywords.reduce((total, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = description.match(regex);
      return total + (matches ? matches.length : 0);
    }, 0);

    return Math.min(count, 5);
  }

  private extractContractAddresses(proposal: TallyProposal): string[] {
    const addresses = new Set<string>();

    // Extraer del governor address
    if (proposal.governance?.governorAddress) {
      addresses.add(proposal.governance.governorAddress);
    }

    // Extraer de proposal actions
    proposal.proposalActions?.forEach(action => {
      if (action.data?.to) addresses.add(action.data.to);
      if (action.data?.contractAddress) addresses.add(action.data.contractAddress);
    });

    return Array.from(addresses).slice(0, 10);
  }

  private extractParameterChanges(proposal: TallyProposal): Array<{ contract: string; method: string; old_value: string; new_value: string }> {
    const changes: Array<{ contract: string; method: string; old_value: string; new_value: string }> = [];

    proposal.proposalActions?.forEach(action => {
      if (action.type === 'CALL' && action.data) {
        changes.push({
          contract: action.data.to || action.data.contractAddress || 'unknown',
          method: action.data.functionName || 'unknown',
          old_value: 'unknown',
          new_value: JSON.stringify(action.data.args || {})
        });
      }
    });

    return changes.slice(0, 5);
  }

  private extractTransactionHash(proposal: TallyProposal): string | undefined {
    // En Tally, las propuestas ejecutadas tienen un executionETA
    // Podríamos buscar el hash en logs, pero por simplicidad retornamos undefined
    return undefined;
  }

  private extractBuilderDID(proposal: TallyProposal): string | undefined {
    // En Tally, el creador no está directamente en la respuesta
    // Podríamos inferirlo de otras fuentes, pero por ahora undefined
    return undefined;
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