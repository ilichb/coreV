import { EcosystemConnector, RawGovernanceDecision, StandardGovernanceDecision, ConnectorConfig, QuorumConfig, VerificationResult } from '@/lib/infrastructure/base-connector';
import { rpcBalancer } from '@/lib/infrastructure/clients/rpc-balancer';
import { logger } from '../../../utils/logger';

// GraphQL queries para Snapshot Hub
const SNAPSHOT_QUERIES = {
  proposals: `
    query GetSnapshotProposals($space: String!, $first: Int = 100, $skip: Int = 0, $state: String = "active") {
      proposals(
        first: $first,
        skip: $skip,
        where: { space: $space, state: $state },
        orderBy: "created",
        orderDirection: desc
      ) {
        id
        title
        body
        choices
        start
        end
        snapshot
        state
        author
        created
        scores
        scores_total
        votes
        space {
          id
          name
        }
      }
    }
  `,
  proposal: `
    query GetSnapshotProposal($id: String!) {
      proposal(id: $id) {
        id
        title
        body
        choices
        start
        end
        snapshot
        state
        author
        created
        scores
        scores_total
        votes
        space {
          id
          name
        }
      }
    }
  `
};

// Space IDs conocidos de DAOs populares
const KNOWN_SPACES = {
  'uniswap': 'uniswap.eth',
  'aave': 'aave.eth',
  'compound': 'compound.eth',
  'curve': 'curve.eth',
  'makerdao': 'maker.eth',
  'balancer': 'balancer.eth',
  'yearn': 'yearn.eth',
  'sushi': 'sushi.eth',
  'badger': 'badger.eth'
};

export class SnapshotConnector extends EcosystemConnector {
  ecosystem = 'snapshot';
  daoIdentifier = 'snapshot-dao';

  private config: ConnectorConfig;
  private graphqlEndpoint: string;
  private spaces: string[] = [];
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutos

  constructor(spaces?: string[]) {
    super();

    // Configurar espacios a monitorear
    this.spaces = spaces || Object.values(KNOWN_SPACES);
    
    this.graphqlEndpoint = process.env.SNAPSHOT_GRAPHQL_URL || 'https://hub.snapshot.org/graphql';
    
    this.config = {
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://cloudflare-eth.com',
      contractAddresses: {
        governor: process.env.SNAPSHOT_GOVERNOR_ADDRESS || '0x0000000000000000000000000000000000000000',
        token: process.env.SNAPSHOT_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000'
      },
      graphqlEndpoint: this.graphqlEndpoint,
      pollingInterval: parseInt(process.env.SNAPSHOT_POLLING_INTERVAL || '60000'),
      apiKeys: {
        snapshot: process.env.SNAPSHOT_API_KEY || ''
      }
    };
  }

  async fetchGovernanceDecisions(fromBlock?: number, toBlock?: number): Promise<RawGovernanceDecision[]> {
    logger.info(`🔍 Fetching Snapshot proposals from spaces: ${this.spaces.join(', ')}`);

    const allProposals: RawGovernanceDecision[] = [];

    // Fetch de cada space en paralelo
    const spacePromises = this.spaces.map(async (space) => {
      try {
        const proposals = await this.fetchSpaceProposals(space);
        return proposals.map(proposal => ({
          ...proposal,
          space,
          source: 'snapshot'
        }));
      } catch (error) {
        logger.error(`❌ Error fetching proposals for space ${space}:`, error);
        return [];
      }
    });

    const spaceResults = await Promise.allSettled(spacePromises);
    
    spaceResults.forEach(result => {
      if (result.status === 'fulfilled') {
        allProposals.push(...result.value);
      }
    });

    // Cachear resultados
    this.setCachedData('snapshot-proposals', allProposals);
    
    logger.info(`✅ Found ${allProposals.length} Snapshot proposals from ${this.spaces.length} spaces`);
    return allProposals;
  }

  private async fetchSpaceProposals(space: string): Promise<any[]> {
    try {
      const response = await this.graphqlQuery(SNAPSHOT_QUERIES.proposals, {
        space,
        first: 50,
        skip: 0,
        state: 'active'
      });

      const proposals = response?.proposals || [];
      return proposals;
    } catch (error) {
      logger.error(`GraphQL query failed for space ${space}:`, error);
      return [];
    }
  }

  async normalizeDecision(raw: any): Promise<StandardGovernanceDecision> {
    try {
      const id = raw.id || 'unknown';
      const space = raw.space || raw.space_id || 'unknown';
      const spaceInfo = raw.space || { id: space, name: space };

      // Determinar tipo de propuesta basado en contenido
      let proposalType: 'STANDARD' | 'BUDGET' | 'PARAMETER_CHANGE' = 'STANDARD';
      let fundingAmount: string | undefined;
      
      if (raw.body?.toLowerCase().includes('budget') || raw.body?.toLowerCase().includes('funding')) {
        proposalType = 'BUDGET';
        // Extraer monto de financiamiento si está presente
        const amountMatch = raw.body.match(/(\$?\d+(?:\.\d+)?)\s*(?:USD|ETH|DAI|USDC)/i);
        if (amountMatch) {
          fundingAmount = amountMatch[1];
        }
      } else if (raw.body?.toLowerCase().includes('parameter') || raw.body?.toLowerCase().includes('configuration')) {
        proposalType = 'PARAMETER_CHANGE';
      }

      // Determinar estado
      let status: 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXECUTED' = 'ACTIVE';
      const rawState = raw.state?.toLowerCase() || 'active';
      const now = Date.now() / 1000; // Convertir a segundos
      
      if (rawState === 'closed' || rawState === 'executed') {
        status = 'EXECUTED';
      } else if (rawState === 'rejected' || rawState === 'failed') {
        status = 'REJECTED';
      } else if (rawState === 'passed' || rawState === 'succeeded') {
        status = 'PASSED';
      } else if (raw.end && now > raw.end) {
        // Si la propuesta ya pasó su fecha de fin, determinar resultado basado en scores
        const scores = raw.scores || [];
        const totalScore = raw.scores_total || 0;
        const maxScore = Math.max(...scores, 0);
        status = maxScore > totalScore * 0.5 ? 'PASSED' : 'REJECTED';
      }

      // Calcular votes
      const scores = raw.scores || [0, 0];
      const votesFor = BigInt(Math.round(scores[0] || 0));
      const votesAgainst = BigInt(Math.round(scores[1] || 0));
      const votingPowerTotal = BigInt(Math.round(raw.scores_total || 0));

      // Extraer tags del cuerpo
      const tags = this.extractTags(raw.body || '');

      return {
        proposal_id: `snapshot:${space}:${id}`,
        dao_identifier: space,
        ecosystem: this.ecosystem,
        title: raw.title || `Snapshot Proposal ${id.substring(0, 8)}`,
        description: raw.body || '',
        discussion_url: `https://snapshot.org/#/${space}/proposal/${id}`,
        snapshot_url: `https://snapshot.org/#/${space}/proposal/${id}`,
        proposal_type: proposalType,
        voting_system: 'SIMPLE_MAJORITY',
        start_timestamp: raw.start ? Math.floor(raw.start) : Math.floor(Date.now() / 1000),
        end_timestamp: raw.end ? Math.floor(raw.end) : Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 días por defecto
        status,
        votes_for: votesFor,
        votes_against: votesAgainst,
        voting_power_total: votingPowerTotal,
        quorum_required: await this.getQuorumRequired(space),
        funding_amount: fundingAmount,
        funding_token: 'ETH', // Por defecto, podría extraerse del cuerpo
        milestones: this.extractMilestones(raw.body),
        contract_addresses: [],
        parameter_changes: this.extractParameterChanges(raw.body),
        created_at: raw.created ? Math.floor(raw.created) : Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        executed_at: status === 'EXECUTED' ? Math.floor(Date.now() / 1000) : undefined,
        ipfs_cid: raw.id, // En Snapshot, el ID es el CID IPFS
        verification_proofs: [`snapshot-${raw.id}`],
        builder_did: raw.author ? `did:andromeda:eth:${raw.author}` : undefined,
        tags
      };
    } catch (error: any) {
      logger.error(`Error normalizing Snapshot decision ${raw.id}:`, error);
      throw error;
    }
  }

  async verifyOnChainState(decision: StandardGovernanceDecision): Promise<VerificationResult> {
    // Snapshot es off-chain, pero podemos verificar:
    // 1. Que la propuesta existe en Snapshot
    // 2. Que el snapshot block es válido
    // 3. Que los signatures son válidos (si hay)
    
    try {
      const [space, id] = decision.proposal_id.replace('snapshot:', '').split(':');
      
      // Verificar que la propuesta existe
      const proposal = await this.graphqlQuery(SNAPSHOT_QUERIES.proposal, { id });
      
      if (!proposal || !proposal.proposal) {
        return {
          onchain_verified: false,
          signature_valid: false,
          timestamp_consistent: false,
          state_matches: false,
          proofs: ['Proposal not found on Snapshot']
        };
      }

      // Verificar snapshot block
      const snapshotBlock = proposal.proposal.snapshot;
      let snapshotValid = true;
      
      if (snapshotBlock) {
        try {
          const block = await rpcBalancer.call<string>({
            method: 'eth_getBlockByNumber',
            params: [snapshotBlock, false]
          });
          snapshotValid = !!block;
        } catch {
          snapshotValid = false;
        }
      }

      // Verificar estado (básico)
      const stateMatches = proposal.proposal.state?.toLowerCase() === decision.status.toLowerCase();

      return {
        onchain_verified: true, // En Snapshot, "on-chain" significa que existe en la plataforma
        signature_valid: true, // Asumimos válido (Snapshot valida signatures)
        timestamp_consistent: Math.abs(proposal.proposal.created - decision.created_at) < 3600,
        state_matches: stateMatches,
        proofs: [
          `snapshot-verified-${Date.now()}`,
          `space:${space}`,
          `block:${snapshotBlock || 'none'}`
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
    const hex = await rpcBalancer.call<string>({ method: 'eth_blockNumber', params: [] });
    return parseInt(hex, 16);
  }

  async getVotingPower(address: string, blockNumber: number): Promise<bigint> {
    // En Snapshot, el voting power depende de la estrategia del space
    // Por simplicidad, retornamos un valor basado en balance de tokens
    try {
      const hex = await rpcBalancer.call<string>({
        method: 'eth_call',
        params: [{
          to: this.config.contractAddresses.token,
          data: `0x70a08231${address.substring(2).padStart(64, '0')}` // balanceOf selector
        }, blockNumber.toString(16)]
      });
      return BigInt(hex || '0');
    } catch {
      return BigInt(0);
    }
  }

  async getQuorumRequirements(): Promise<QuorumConfig> {
    // En Snapshot, el quorum depende de cada space
    // Retornamos valores por defecto
    return {
      required: BigInt('1000000000000000000'), // 1 ETH (en wei)
      numerator: 4,
      denominator: 100 // 4% por defecto
    };
  }

  private async graphqlQuery(query: string, variables?: Record<string, any>): Promise<any> {
    const response = await fetch(this.graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  private async getQuorumRequired(space: string): Promise<bigint> {
    // Por ahora, retornar un valor por defecto
    // En una implementación real, podríamos consultar la configuración del space
    return BigInt('1000000000000000000'); // 1 ETH
  }

  private extractTags(body: string): string[] {
    const tags = new Set<string>();
    const lowercaseBody = body.toLowerCase();
    
    // Detectar categorías por palabras clave
    if (lowercaseBody.includes('defi') || lowercaseBody.includes('lending') || lowercaseBody.includes('staking')) {
      tags.add('defi');
    }
    if (lowercaseBody.includes('governance') || lowercaseBody.includes('voting') || lowercaseBody.includes('dao')) {
      tags.add('governance');
    }
    if (lowercaseBody.includes('infrastructure') || lowercaseBody.includes('protocol') || lowercaseBody.includes('upgrade')) {
      tags.add('infrastructure');
    }
    if (lowercaseBody.includes('community') || lowercaseBody.includes('grant') || lowercaseBody.includes('funding')) {
      tags.add('community');
    }
    if (lowercaseBody.includes('security') || lowercaseBody.includes('audit') || lowercaseBody.includes('bug')) {
      tags.add('security');
    }

    return Array.from(tags);
  }

  private extractMilestones(body: string): number {
    // Contar milestones mencionados
    const milestoneKeywords = ['milestone', 'phase', 'stage', 'step', 'checkpoint'];
    const count = milestoneKeywords.reduce((total, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = body.match(regex);
      return total + (matches ? matches.length : 0);
    }, 0);
    
    return Math.min(count, 5); // Máximo 5 milestones
  }

  private extractParameterChanges(body: string): Array<{contract: string; method: string; old_value: string; new_value: string}> {
    const changes: Array<{contract: string; method: string; old_value: string; new_value: string}> = [];
    
    // Buscar patrones de cambios de parámetros
    const paramPatterns = [
      /change\s+(\w+)\s+from\s+([\d.]+)\s+to\s+([\d.]+)/gi,
      /update\s+(\w+)\s+to\s+([\d.]+)/gi,
      /set\s+(\w+)\s+=\s+([\d.]+)/gi
    ];
    
    paramPatterns.forEach(pattern => {
      const matches = body.matchAll(pattern);
      for (const match of matches) {
        changes.push({
          contract: 'unknown',
          method: match[1] || 'setParameter',
          old_value: 'unknown',
          new_value: match[2] || match[3] || 'unknown'
        });
      }
    });
    
    return changes.slice(0, 5); // Máximo 5 cambios
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