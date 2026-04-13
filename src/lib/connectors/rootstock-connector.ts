import { ProjectRecord, DecisionMetadata } from '@/types/vara-registry';
import { cryptoGuard } from '../services/coordination/crypto-guard';
import { varaAdapter } from '../services/coordination/vara-adapter';
import { ProjectMetadata } from '../clients/vara-client';
import { logger } from '../utils/logger';
import { redisService } from '../services/coordination/redis';

export interface GovernanceDecision {
  proposalId: string;
  title: string;
  description: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'CANCELLED';
  votesFor: number;
  votesAgainst: number;
  clarityScore?: number;
  timestamp: string;
  tags: string[];
  builderDid?: string;
  builderAddress?: string;
  fundingAmount?: string;
  milestones?: number;
  discussionUrl?: string;
  snapshotUrl?: string;
}

export interface RootstockProposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  scores: number[];
  scores_total: number;
  state: string;
  start: number;
  end: number;
  snapshot: string;
  author: string;
  space: {
    id: string;
    name: string;
  };
}

export class RootstockConnector {
  private snapshotSpace = 'rootstock'; // Rootstock DAO Snapshot space
  private snapshotGraphQL = 'https://hub.snapshot.org/graphql';

  // Rootstock Subgraph Settings
  private apiKey = process.env.THEGRAPH_API_KEY || '';
  private governanceSubgraph = this.apiKey ? `https://gateway.thegraph.com/api/${this.apiKey}/subgraphs/id/C9muK2hesS2V8ZpcR755wVfo9UUhfWSXaDhDKMkCNejP` : '';
  private rewardsSubgraph = this.apiKey ? `https://gateway.thegraph.com/api/${this.apiKey}/subgraphs/id/7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA` : '';

  /**
   * Helper to perform fetches with a specific timeout
   */
  private async fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 8000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  /**
   * Safe JSON parser that checks for ok status and correct content-type
   */
  private async safeJson(response: Response, fallback: any = null): Promise<any> {
    if (!response.ok) {
      logger.warn(`Fetch failed with status ${response.status}: ${response.url}`);
      return fallback;
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn(`Response is not JSON (${contentType}): ${response.url}`);
      return fallback;
    }
    try {
      return await response.json();
    } catch (e) {
      logger.error(`Error parsing JSON from ${response.url}:`, e);
      return fallback;
    }
  }

  async fetchSubgraphProposals(limit: number = 20): Promise<any[]> {
    try {
      if (!this.governanceSubgraph) {
        logger.warn('⚠️ No governance subgraph URL configured (THEGRAPH_API_KEY missing)');
        return [];
      }

      logger.info('📡 Fetching Rootstock Governance proposals from Subgraph...');
      const query = `
        {
          proposals(first: ${limit}) {
            id
            title
            state
            rawState
            votesFor
            votesAgainst
            votesAbstains
            votesTotal
            voteStart
            voteEnd
          }
        }
      `;

      const response = await fetch(this.governanceSubgraph, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const { data } = await response.json();
      return data?.proposals || [];
    } catch (error) {
      logger.error('❌ Error fetching Subgraph proposals:', error);
      return [];
    }
  }

  async fetchBuilderActivity(builderAddress: string): Promise<any> {
    const lower = builderAddress.toLowerCase();
    const cacheKey = `rootstock:activity:${lower}`;

    try {
      // 1. Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        logger.info(`🚀 Cache HIT for builder activity: ${lower}`);
        return JSON.parse(cached);
      }

      if (!this.rewardsSubgraph) {
        logger.warn('⚠️ No rewards subgraph URL configured');
        return { backerStakingHistories: [], gaugeStakingHistories: [] };
      }

      logger.info(`📡 Fetching activity for builder ${lower} from Rewards Subgraph...`);
      const query = `
        {
          backerStakingHistories(where: { id: "${lower}" }) {
            id
            backerTotalAllocation
            accumulatedTime
            lastBlockNumber
          }
          gaugeStakingHistories(where: { backer: "${lower}" }) {
            id
            gauge
            allocation
          }
        }
      `;

      const response = await this.fetchWithTimeout(this.rewardsSubgraph, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      }, 10000);

      const json = await this.safeJson(response);
      const data = json?.data || { backerStakingHistories: [], gaugeStakingHistories: [] };

      // 2. Cache successful result (5 mins)
      if (json?.data) {
        await redisService.set(cacheKey, JSON.stringify(data), 300);
      }

      return data;
    } catch (error) {
      logger.error(`❌ Error fetching builder activity for ${lower}:`, error);
      return { backerStakingHistories: [], gaugeStakingHistories: [] };
    }
  }

  async fetchAllBuilders(limit: number = 20): Promise<any[]> {
    const cacheKey = `rootstock:builders:all:${limit}`;
    

    // Pinned fallbacks for "Always-On" reliability
    const pinnedBuilders = [
      { id: '0xd9fcae4315920387f00725c78285d6d41c30b967', name: 'WoodSwap', category: 'DeFi', backerTotalAllocation: '0', accumulatedTime: '0' },
      { id: '0xf675d0b9432607172776856525143a2991060934', name: 'Asami.Club', category: 'Social', backerTotalAllocation: '0', accumulatedTime: '0' },
      { id: '0x3d0b28ac46d900662d515a28ea17c38c6423985b', name: 'Boltz', category: 'Bridge', backerTotalAllocation: '0', accumulatedTime: '0' }
    ];

    try {
      // 1. Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        logger.info(`🚀 Cache HIT for all builders (limit ${limit})`);
        return JSON.parse(cached);
      }

      logger.info('📡 Fetching ALL Rootstock Collective builders with robust headers and timeout...');
      const builders: any[] = [];

      // A. Try Rewards Subgraph
      if (this.rewardsSubgraph) {
        const query = `
          {
            backerStakingHistories(first: ${limit}, orderBy: backerTotalAllocation, orderDirection: desc) {
              id
              backerTotalAllocation
              accumulatedTime
            }
          }
        `;

        try {
          const subRes = await this.fetchWithTimeout(this.rewardsSubgraph, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
          }, 8000);

          const json = await this.safeJson(subRes);
          const data = json?.data;

          if (data?.backerStakingHistories) {
            const subgraphBuilders = data.backerStakingHistories.map((b: any) => ({
              id: b.id.toLowerCase(),
              backerTotalAllocation: b.backerTotalAllocation,
              accumulatedTime: b.accumulatedTime,
              builderDid: `did:andromeda:rootstock:${b.id.toLowerCase()}`
            }));
            builders.push(...subgraphBuilders);
          }
        } catch (e) {
          logger.warn('Could not fetch from Rewards Subgraph:', e);
        }
      }

      // B. Augment with Collective Public API
      try {
        const collRes = await this.fetchWithTimeout('https://app.rootstockcollective.xyz/api/builders', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (AndromedaCore/1.0; +https://andromeda.computer)',
            'Accept': 'application/json'
          }
        }, 8000);

        const list = await this.safeJson(collRes, []);

        if (Array.isArray(list)) {
          list.forEach((cb: any) => {
            const addr = (cb.address || cb.id || '').toLowerCase();
            if (!addr) return;

            const resolvedName = cb.name || cb.projectName || cb.title || cb.builderName || null;
            const resolvedCategory = cb.category || cb.type || null;

            const existing = builders.find((b: any) => b.id === addr);
            if (existing) {
              if (resolvedName && !existing.name) existing.name = resolvedName;
              if (resolvedCategory && !existing.category) existing.category = resolvedCategory;
            } else {
              builders.push({
                id: addr,
                backerTotalAllocation: cb.totalAllocation || '0',
                accumulatedTime: '0',
                builderDid: `did:andromeda:rootstock:${addr}`,
                name: resolvedName,
                category: resolvedCategory,
              });
            }
          });
        }
      } catch (e) {
        logger.warn('Could not fetch from Collective API:', e);
      }

      // C. Last Resort: Pinned Fallback
      if (builders.length === 0) {
        logger.info('⚠️ All external sources failed. Applying Pinned Builder Fallback.');
        builders.push(...pinnedBuilders.map(pb => ({
          ...pb,
          builderDid: `did:andromeda:rootstock:${pb.id.toLowerCase()}`
        })));
      }

      // 2. Cache successful result (10 mins)
      if (builders.length > 0) {
        await redisService.set(cacheKey, JSON.stringify(builders), 600);
      }

      return builders;
    } catch (error: any) {
      logger.error('❌ Error in fetchAllBuilders:', error);
      // Even in catch, return pinned builders instead of empty
      return pinnedBuilders.map(pb => ({
        ...pb,
        builderDid: `did:andromeda:rootstock:${pb.id.toLowerCase()}`
      }));
    }

  }

  // Minimal override map — only for confirmed addresses where the API is ambiguous
  // Do NOT expand this list: all other names should come from Collective API or Snapshot inference
  private knownMetadata: Record<string, { name: string, category: string }> = {
    '0xd9fcae4315920387f00725c78285d6d41c30b967': { name: 'WoodSwap', category: 'DeFi' },
    '0xf675d0b9432607172776856525143a2991060934': { name: 'Asami.Club', category: 'Social' },
    '0x3d0b28ac46d900662d515a28ea17c38c6423985b': { name: 'Boltz', category: 'Bridge' },
  };

  async getMetadata(address: string): Promise<{ name: string, category: string }> {
    const lower = address.toLowerCase();
    const cacheKey = `rootstock:metadata:${lower}`;

    // 1. Static override fast-path
    if (this.knownMetadata[lower]) return this.knownMetadata[lower];

    try {
      // 2. Try Redis Cache
      const cached = await redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      // 3. Query Rootstock Collective API
      try {
        const res = await this.fetchWithTimeout(`https://app.rootstockcollective.xyz/api/builders/${lower}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (AndromedaCore/1.0; +https://andromeda.computer)',
            'Accept': 'application/json'
          }
        }, 5000);

        const builderData = await this.safeJson(res);

        if (builderData) {
          const name = builderData.name || builderData.projectName || builderData.title || builderData.builderName;
          const content = JSON.stringify(builderData).toLowerCase();
          const category = content.includes('defi') || content.includes('dex') ? 'DeFi' :
            content.includes('bridge') ? 'Bridge' :
              content.includes('social') ? 'Social' :
                content.includes('nft') ? 'NFT/Gaming' : 'Infrastructure';

          if (name && name.length > 1) {
            const meta = { name, category };
            await redisService.set(cacheKey, JSON.stringify(meta), 3600); // 1 hour cache
            return meta;
          }
        }
      } catch (e) {
        logger.warn(`Could not fetch metadata from Collective API for ${lower}`);
      }

      // 4. Try Snapshot Inference
      try {
        const query = `
          query {
            proposals(first: 1, where: { space_in: ["${this.snapshotSpace}"], author: "${address}" }, orderBy: "created", orderDirection: desc) {
              title
              body
            }
          }
        `;
        const res = await this.fetchWithTimeout(this.snapshotGraphQL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        }, 5000);

        const json = await this.safeJson(res);
        const proposal = json?.data?.proposals?.[0];

        if (proposal?.title) {
          const bracketMatch = proposal.title.match(/^\[([^\]]+)\]/);
          const colonMatch = proposal.title.match(/^([^:|\-]+?)(?:\s*[:|\-]|\s+Request|\s+Proposal|\s+Grant)/);
          const extractedName = bracketMatch?.[1]?.trim() || colonMatch?.[1]?.trim();

          if (extractedName && extractedName.length > 1 && extractedName.length < 40) {
            const meta = { name: extractedName, category: 'Infrastructure' };
            await redisService.set(cacheKey, JSON.stringify(meta), 3600);
            return meta;
          }
        }
      } catch (e) {
        logger.warn(`Could not infer metadata from Snapshot for ${lower}`);
      }

    } catch (err) {
      logger.error(`Metadata resolution error for ${lower}:`, err);
    }

    // fallback
    return {
      name: `${address.substring(0, 6)}...${address.substring(38)}`,
      category: 'Infrastructure'
    };
  }

  async getBuilderScorecard(address: string): Promise<any> {
    const lower = address.toLowerCase();
    const cacheKey = `rootstock:scorecard:${lower}`;

    try {
      // 1. Try Redis Cache
      const cached = await redisService.get(cacheKey);
      if (cached) {
        logger.info(`🚀 Cache HIT for scorecard: ${lower}`);
        return JSON.parse(cached);
      }

      logger.info(`📡 Generating Rootstock scorecard for builder ${lower}...`);

      // 2. Parallel data fetching with timeouts
      const [activity, collectiveProposals] = await Promise.all([
        this.fetchBuilderActivity(lower),
        (async () => {
          try {
            const res = await this.fetchWithTimeout(
              `https://app.rootstockcollective.xyz/api/proposals/v1?proposer=${lower}&limit=20`,
              {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (AndromedaCore/1.0; +https://andromeda.computer)',
                  'Accept': 'application/json'
                }
              }, 6000
            );
            const d = await this.safeJson(res);
            return Array.isArray(d) ? d : (d?.proposals || d?.data || []);
          } catch { return []; }
        })()
      ]);

      // 3. Governance Subgraph check (voter role)
      let onChainProposals = [];
      let onChainVotes = [];

      if (this.governanceSubgraph) {
        try {
          const onChainProposalQuery = `{ proposals(first: 20, where: { proposer: "${lower}" }) { id description status forVotes againstVotes } }`;
          const onChainVotesQuery = `{ voteCasts(first: 20, where: { voter: "${lower}" }) { id proposal { id description status } support votes } }`;

          const [pRes, vRes] = await Promise.all([
            this.fetchWithTimeout(this.governanceSubgraph, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: onChainProposalQuery }),
            }, 7000),
            this.fetchWithTimeout(this.governanceSubgraph, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: onChainVotesQuery }),
            }, 7000)
          ]);

          const pJson = await this.safeJson(pRes);
          const vJson = await this.safeJson(vRes);

          onChainProposals = pJson?.data?.proposals || [];
          onChainVotes = vJson?.data?.voteCasts || [];
        } catch (e) {
          logger.warn('Governance subgraph partially unreachable for scorecard');
        }
      }

      // 4. Merge & Aggregate
      const mergedProposals = onChainProposals.map((p: any) => {
        const rich = collectiveProposals.find((r: any) => r.id === p.id || r.onChainId === p.id);
        const desc = p.description || '';
        const autoTitle = desc.split('\n')[0]?.replace(/^#+\s*/, '').trim() || `Proposal ${p.id.substring(0, 8)}`;
        return {
          id: p.id,
          title: rich?.title || rich?.name || autoTitle,
          status: p.status || 'unknown',
          forVotes: p.forVotes || '0',
          againstVotes: p.againstVotes || '0',
          url: rich?.url || `https://app.rootstockcollective.xyz/proposals/${p.id}`,
          relevance: 'On-Chain Governance'
        };
      });

      const staking = activity.backerStakingHistories?.[0] || { backerTotalAllocation: '0', accumulatedTime: '0' };
      const totalStaked = parseFloat(staking.backerTotalAllocation) || 0;
      const gaugeCount = activity.gaugeStakingHistories?.length || 0;

      // 5. Reputation Score (AVIP v2.0)
      const baseScore = Math.min(Math.floor(totalStaked * 0.01) + 20, 100);
      const propsBonus = Math.min(onChainProposals.length * 25, 150);
      const voteBonus = Math.min(onChainVotes.length * 8, 100);
      const totalRep = Math.min(Math.floor(baseScore * 6) + propsBonus + voteBonus + Math.min(totalStaked * 0.1, 150), 999);

      // 6. Metadata
      const metadata = await this.getMetadata(lower);

      const scorecard = {
        address: lower,
        name: metadata.name,
        category: metadata.category,
        did: `did:andromeda:rootstock:${lower}`,
        reputation: totalRep,
        stats: {
          proposals: onChainProposals.length,
          votesCast: onChainVotes.length,
          totalStaked,
          activeGauges: gaugeCount,
          timeInEcosystem: Math.floor(parseInt(staking.accumulatedTime || '0') / 86400),
        },
        staking: {
          allocation: staking.backerTotalAllocation || '0',
          gauges: activity.gaugeStakingHistories?.map((g: any) => g.gauge) || []
        },

        proposals: mergedProposals,
        avipScore: { total: totalRep }
      };

      // 7. Cache result (5 mins)
      await redisService.set(cacheKey, JSON.stringify(scorecard), 300);

      return scorecard;
    } catch (error) {
      logger.error(`❌ Error generating builder scorecard for ${lower}:`, error);
      return null;
    }
  }

  async fetchRecentDecisions(limit: number = 50): Promise<GovernanceDecision[]> {
    try {
      logger.info('📡 Fetching Rootstock DAO decisions from Snapshot...');

      // Query GraphQL de Snapshot
      const query = `
        query {
          proposals(
            first: ${limit},
            skip: 0,
            where: { space_in: ["${this.snapshotSpace}"] },
            orderBy: "created",
            orderDirection: desc
          ) {
            id
            title
            body
            choices
            scores
            scores_total
            state
            start
            end
            snapshot
            author
            space {
              id
              name
            }
          }
        }
      `;

      const response = await fetch(this.snapshotGraphQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const { data } = await response.json();

      if (!data?.proposals) {
        logger.warn('No proposals found for Rootstock DAO');
        return [];
      }

      // Transformar a nuestro formato
      const decisions: GovernanceDecision[] = data.proposals.map((proposal: RootstockProposal) => {
        // Extraer tags del título y descripción
        const content = `${proposal.title} ${proposal.body}`.toLowerCase();
        const tags = this.extractTags(content);

        // Determinar status
        let status: GovernanceDecision['status'];
        switch (proposal.state) {
          case 'closed':
            const totalScore = proposal.scores_total || 0;
            const maxScore = Math.max(...(proposal.scores || [0]));
            status = maxScore > totalScore * 0.5 ? 'APPROVED' : 'REJECTED';
            break;
          case 'active':
            status = 'PENDING';
            break;
          default:
            status = 'CANCELLED';
        }

        // Calcular clarity score basado en longitud y estructura
        const clarityScore = this.calculateClarityScore(proposal.title, proposal.body);

        // Extraer funding amount si existe (patrones comunes)
        const fundingAmount = this.extractFundingAmount(proposal.body);

        return {
          proposalId: proposal.id,
          title: proposal.title,
          description: proposal.body.substring(0, 500) + '...',
          status,
          votesFor: proposal.scores?.[0] || 0,
          votesAgainst: proposal.scores?.[1] || 0,
          clarityScore,
          timestamp: new Date(proposal.start * 1000).toISOString(),
          tags,
          builderDid: `did:andromeda:eth:${proposal.author}`,
          builderAddress: proposal.author,
          fundingAmount,
          milestones: this.extractMilestones(proposal.body),
          discussionUrl: `https://snapshot.org/#/${this.snapshotSpace}/proposal/${proposal.id}`,
          snapshotUrl: `https://snapshot.org/#/${this.snapshotSpace}/proposal/${proposal.id}`,
        };
      });

      logger.info(`✅ Fetched ${decisions.length} Rootstock DAO decisions`);
      return decisions;

    } catch (error) {
      logger.error('❌ Error fetching Rootstock DAO decisions:', error);
      // Fallback a datos simulados
      return this.getSimulatedDecisions(limit);
    }
  }

  async syncDecisionToAndromeda(decision: GovernanceDecision): Promise<boolean> {
    try {
      logger.info(`🔄 Syncing decision ${decision.proposalId} to Andromeda...`);

      // 1. Crear scorecard en formato Andromeda
      const scorecard = this.transformToScorecard(decision);

      // 2. Generar canonical hash
      const canonicalHash = cryptoGuard.generateCanonicalHash(scorecard);

      // 3. Subir a IPFS (simulado por ahora)
      const ipfsCid = `QmRootstock${decision.proposalId.replace(/[^a-zA-Z0-9]/g, '')}`;

      // 4. Extraer ecosistema y DAO identifier
      const ecosystem = this.detectEcosystem(decision);
      const daoIdentifier = 'rootstock-dao';

      // 5. Extraer tags mejorados
      const tags = this.enhanceTags(decision.tags, decision.title, decision.description);

      // 6. Crear metadata de decisión
      const decisionMetadata: DecisionMetadata = {
        outcome: decision.status,
        votes_for: decision.votesFor,
        votes_against: decision.votesAgainst,
        clarity_score: decision.clarityScore || 0,
        funding_amount: decision.fundingAmount,
        milestones: decision.milestones,
      };

      // 7. Registrar en Vara Network
      const projectMetadata: ProjectMetadata = {
        merkle_root: canonicalHash,
        ipfs_cid: ipfsCid,
        ecosystem,
        dao_identifier: daoIdentifier,
        builder_did: decision.builderDid || 'did:andromeda:rootstock:unknown',
        tags,
        ...decisionMetadata  // Incluir metadata de decisión como campos adicionales
      };

      const result = await varaAdapter.submitProject(projectMetadata);

      if (result.success) {
        logger.info(`✅ Decision ${decision.proposalId} synced to Vara: ${result.txHash}`);
        return true;
      } else {
        logger.warn(`⚠️ Failed to sync decision ${decision.proposalId}: ${result.error}`);
        return false;
      }

    } catch (error) {
      logger.error(`❌ Error syncing decision ${decision.proposalId}:`, error);
      return false;
    }
  }

  async syncAllDecisions(decisions: GovernanceDecision[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const decision of decisions) {
      const result = await this.syncDecisionToAndromeda(decision);
      if (result) {
        success++;
      } else {
        failed++;
      }

      // Pequeña pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { success, failed };
  }

  // ========== HELPER FUNCTIONS ==========

  private extractTags(content: string): string[] {
    const tags = new Set<string>();

    // Palabras clave comunes en Web3
    const keywords = [
      'defi', 'lending', 'dex', 'yield', 'staking', 'liquid',
      'nft', 'gaming', 'metaverse', 'collectibles',
      'infrastructure', 'bridge', 'oracle', 'indexer', 'api',
      'governance', 'dao', 'voting', 'treasury',
      'identity', 'privacy', 'security', 'audit',
      'scaling', 'layer2', 'rollup', 'zk',
      'social', 'community', 'content', 'creator',
      'rootstock', 'bitcoin', 'smart contract', 'rsk'
    ];

    keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        tags.add(keyword);
      }
    });

    return Array.from(tags).slice(0, 5);
  }

  private calculateClarityScore(title: string, body: string): number {
    // Algoritmo simple para calcular claridad
    let score = 70; // Base score

    // Bonus por título claro
    if (title.length >= 10 && title.length <= 100) score += 5;

    // Bonus por descripción estructurada
    const hasSections = ['abstract', 'introduction', 'background', 'specification', 'implementation', 'timeline', 'budget']
      .some(section => body.toLowerCase().includes(section));
    if (hasSections) score += 10;

    // Bonus por bullet points o listas
    if ((body.match(/•|\d\.|\-/g) || []).length >= 3) score += 5;

    // Penalty por demasiado corto
    if (body.length < 200) score -= 15;

    // Penalty por demasiado largo y sin estructura
    if (body.length > 5000 && !hasSections) score -= 10;

    return Math.min(Math.max(score, 30), 95);
  }

  private extractFundingAmount(text: string): string | undefined {
    const patterns = [
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|USDC|USDT)?/i,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|USDC|USDT)/i,
      /funding.*?\$(\d+)/i,
      /grant.*?\$(\d+)/i,
      /budget.*?\$(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = match[1].replace(/,/g, '');
        return `$${parseInt(amount).toLocaleString()}`;
      }
    }

    return undefined;
  }

  private extractMilestones(text: string): number | undefined {
    const patterns = [
      /(\d+)\s*milestones?/i,
      /milestone\s*(\d+)/i,
      /phase\s*(\d+)/i,
      /stage\s*(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return undefined;
  }

  private detectEcosystem(decision: GovernanceDecision): string {
    // Análisis de contenido para detectar ecosistema
    const content = `${decision.title} ${decision.description}`.toLowerCase();

    if (content.includes('rootstock') || content.includes('rsk') || content.includes('bitcoin')) {
      return 'rootstock';
    } else if (content.includes('ethereum') || content.includes('evm') || content.includes('eth')) {
      return 'ethereum';
    } else if (content.includes('solana') || content.includes('sol')) {
      return 'solana';
    } else if (content.includes('polygon') || content.includes('matic')) {
      return 'polygon';
    } else if (content.includes('arbitrum')) {
      return 'arbitrum';
    } else if (content.includes('optimism')) {
      return 'optimism';
    }

    return 'ethereum'; // Default
  }

  private enhanceTags(baseTags: string[], title: string, description: string): string[] {
    const enhanced = new Set(baseTags);
    const content = `${title} ${description}`.toLowerCase();

    // Categoría principal
    if (content.includes('defi') || content.includes('dex') || content.includes('lending')) {
      enhanced.add('defi');
    }
    if (content.includes('nft') || content.includes('gaming') || content.includes('metaverse')) {
      enhanced.add('nft-gaming');
    }
    if (content.includes('infrastructure') || content.includes('tool') || content.includes('api')) {
      enhanced.add('infrastructure');
    }
    if (content.includes('governance') || content.includes('dao') || content.includes('voting')) {
      enhanced.add('governance');
    }

    // Tecnología específica
    if (content.includes('zk') || content.includes('zero-knowledge')) {
      enhanced.add('zk');
    }
    if (content.includes('oracle')) {
      enhanced.add('oracle');
    }
    if (content.includes('bridge')) {
      enhanced.add('bridge');
    }

    return Array.from(enhanced).slice(0, 8);
  }

  private transformToScorecard(decision: GovernanceDecision): any {
    // Transformar a formato Andromeda Scorecard
    return {
      'A. Problema': {
        clarity: decision.clarityScore || 75,
        coherence: 80,
        completeness: 70,
        content: {
          description: decision.description,
          problemStatement: `Rootstock DAO Proposal: ${decision.title}`,
          relevance: 'Rootstock ecosystem development'
        }
      },
      'B. Límites': {
        clarity: 65,
        coherence: 70,
        completeness: 75,
        content: {
          scope: 'Rootstock DAO governance',
          constraints: 'Community voting, treasury allocation',
          assumptions: 'Based on Snapshot voting results'
        }
      },
      'C. Especificación Técnica': {
        clarity: decision.clarityScore || 75,
        coherence: 75,
        completeness: 70,
        content: {
          technicalDetails: 'Auto-ingested from Rootstock DAO snapshot',
          implementation: 'Governance decision process',
          standards: 'Rootstock improvement proposal'
        }
      },
      'D. Esfuerzo': {
        clarity: 60,
        coherence: 65,
        completeness: 70,
        content: {
          estimatedEffort: 'Governance process',
          timeline: 'Based on proposal duration',
          resources: 'Community voting power'
        }
      },
      metadata: {
        version: '1.0',
        created: decision.timestamp,
        updated: new Date().toISOString(),
        authorDid: decision.builderDid || 'did:andromeda:rootstock:unknown',
        source: 'rootstock-dao-snapshot',
        proposalId: decision.proposalId
      }
    };
  }

  private getSimulatedDecisions(limit: number): GovernanceDecision[] {
    // Datos simulados para desarrollo
    const simulatedDecisions: GovernanceDecision[] = [];

    const statuses: Array<'APPROVED' | 'REJECTED' | 'PENDING'> = ['APPROVED', 'REJECTED', 'PENDING'];
    const tagsSets = [
      ['defi', 'lending', 'rootstock'],
      ['nft', 'gaming', 'infrastructure'],
      ['governance', 'dao-tools'],
      ['bridge', 'interoperability'],
      ['oracle', 'data']
    ];

    for (let i = 1; i <= limit; i++) {
      const status = statuses[i % 3];
      const tags = tagsSets[i % tagsSets.length];
      const clarityScore = 60 + Math.floor(Math.random() * 35);

      simulatedDecisions.push({
        proposalId: `RSK-${String(i).padStart(3, '0')}`,
        title: `Rootstock ${['DeFi Protocol', 'NFT Marketplace', 'Bridge Infrastructure', 'Oracle Service', 'DAO Tooling'][i % 5]} v${i}`,
        description: `A proposal to build a ${['DeFi lending protocol', 'NFT marketplace', 'cross-chain bridge', 'oracle service', 'DAO tooling'][i % 5]} on the Rootstock ecosystem. This will enhance the capabilities of the Rootstock network and provide new opportunities for developers and users.`,
        status,
        votesFor: Math.floor(Math.random() * 20000000) + 5000000,
        votesAgainst: Math.floor(Math.random() * 10000000) + 1000000,
        clarityScore,
        timestamp: new Date(Date.now() - i * 86400000 * 7).toISOString(), // 7 días atrás
        tags,
        builderDid: `did:andromeda:eth:0x${Math.random().toString(16).substring(2, 42)}`,
        builderAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
        fundingAmount: i % 3 === 0 ? `$${Math.floor(Math.random() * 100) * 10000}` : undefined,
        milestones: i % 4 === 0 ? Math.floor(Math.random() * 5) + 1 : undefined,
        discussionUrl: `https://snapshot.org/#/rootstock/proposal/simulated-${i}`,
        snapshotUrl: `https://snapshot.org/#/rootstock/proposal/simulated-${i}`,
      });
    }

    return simulatedDecisions;
  }
}

// Singleton instance
export const rootstockConnector = new RootstockConnector();
