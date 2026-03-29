import { ProjectRecord, DecisionMetadata } from '@/types/vara-registry';
import { cryptoGuard } from '../services/coordination/crypto-guard';
import { varaAdapter } from '../services/coordination/vara-adapter';
import { ProjectMetadata } from '../clients/vara-client';
import { logger } from '../utils/logger';

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

  async fetchSubgraphProposals(limit: number = 20): Promise<any[]> {
    try {
      if (!this.governanceSubgraph) {
        logger.warn('⚠️ No governance subgraph URL configured (THEGRAPH_API_KEY missing)');
        return [];
      }

      logger.info('📡 Fetching Rootstock Governance proposals from Subgraph...');
      const query = `
        {
          upgradeds(first: ${limit}) {
            id
            implementation
            blockNumber
            blockTimestamp
          }
          eip712DomainChangeds(first: ${limit}) {
            id
            blockNumber
            blockTimestamp
            transactionHash
          }
        }
      `;

      const response = await fetch(this.governanceSubgraph, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const { data } = await response.json();
      return data ? [...(data.upgradeds || []), ...(data.eip712DomainChangeds || [])] : [];
    } catch (error) {
      logger.error('❌ Error fetching Subgraph proposals:', error);
      return [];
    }
  }

  async fetchBuilderActivity(builderAddress: string): Promise<any> {
    try {
      if (!this.rewardsSubgraph) {
        logger.warn('⚠️ No rewards subgraph URL configured (THEGRAPH_API_KEY missing)');
        return { backerStakingHistories: [], gaugeStakingHistories: [] };
      }

      logger.info(`📡 Fetching activity for builder ${builderAddress} from Rewards Subgraph...`);
      const query = `
        {
          backerStakingHistories(where: { id: "${builderAddress.toLowerCase()}" }) {
            id
            backerTotalAllocation
            accumulatedTime
            lastBlockNumber
          }
          gaugeStakingHistories(where: { backer: "${builderAddress.toLowerCase()}" }) {
            id
            gauge
            allocation
          }
        }
      `;

      const response = await fetch(this.rewardsSubgraph, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const { data } = await response.json();
      return data || { backerStakingHistories: [], gaugeStakingHistories: [] };
    } catch (error) {
      logger.error(`❌ Error fetching builder activity for ${builderAddress}:`, error);
      return { backerStakingHistories: [], gaugeStakingHistories: [] };
    }
  }

  async fetchAllBuilders(limit: number = 20): Promise<any[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout

    try {
      logger.info('📡 Fetching ALL Rootstock Collective builders with robust headers and timeout...');

      const builders: any[] = [];

      // 1. Try Rewards Subgraph (only if configured)
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
          const subgraphResponse = await fetch(this.rewardsSubgraph, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            signal: controller.signal
          });

          const { data } = await subgraphResponse.json();
          const subgraphBuilders = (data?.backerStakingHistories || []).map((b: any) => ({
            id: b.id.toLowerCase(),
            backerTotalAllocation: b.backerTotalAllocation,
            accumulatedTime: b.accumulatedTime,
            builderDid: `did:andromeda:rootstock:${b.id.toLowerCase()}`
          }));
          builders.push(...subgraphBuilders);
        } catch (e) {
          logger.warn('Could not fetch from Rewards Subgraph:', e);
        }
      } else {
        logger.warn('⚠️ No rewards subgraph URL configured (THEGRAPH_API_KEY missing)');
      }

      // 2. Augment with Collective Public API — captures names and any extra builders
      try {
        const collectiveRes = await fetch('https://app.rootstockcollective.xyz/api/builders', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (AndromedaCore/1.0; +https://andromeda.computer)',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        if (collectiveRes.ok) {
          const collectiveData = await collectiveRes.json();
          const list = Array.isArray(collectiveData) ? collectiveData : (collectiveData.builders || []);

          if (Array.isArray(list)) {
            list.forEach((cb: any) => {
              const addr = (cb.address || cb.id || '').toLowerCase();
              if (!addr) return;

              // Extract name from whatever the Collective API provides
              const resolvedName = cb.name || cb.projectName || cb.title || cb.builderName || null;
              const resolvedCategory = cb.category || cb.type || null;

              const existing = builders.find((b: any) => b.id === addr);
              if (existing) {
                // Augment existing entry with name if not already set
                if (resolvedName && !existing.name) existing.name = resolvedName;
                if (resolvedCategory && !existing.category) existing.category = resolvedCategory;
              } else {
                // New builder only found in Collective API
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
        }
      } catch (e) {
        logger.warn('Could not fetch from Collective API or timeout reached:', e);
      }

      return builders;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error('❌ Rootstock builder fetch timed out');
      } else {
        logger.error('❌ Error fetching all builders:', error);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
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

    // 1. Check fast-path static override (instant, no network)
    if (this.knownMetadata[lower]) return this.knownMetadata[lower];

    // 2. Query Rootstock Collective individual builder profile
    // This is the canonical source of truth for project names
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      // The Collective API may have an individual builder endpoint
      const res = await fetch(`https://app.rootstockcollective.xyz/api/builders/${lower}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (AndromedaCore/1.0; +https://andromeda.computer)',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const builderData = await res.json();
        // The Collective API may return fields like: name, title, description, projectName
        const name = builderData.name ||
          builderData.projectName ||
          builderData.title ||
          builderData.builderName;

        const content = JSON.stringify(builderData).toLowerCase();
        const category = content.includes('defi') || content.includes('lending') || content.includes('dex') ? 'DeFi' :
          content.includes('bridge') ? 'Bridge' :
            content.includes('social') || content.includes('community') ? 'Social' :
              content.includes('nft') || content.includes('gaming') ? 'NFT/Gaming' : 'Infrastructure';

        if (name && name.length > 1) {
          this.knownMetadata[lower] = { name, category }; // Cache it
          return { name, category };
        }
      }
    } catch (e) {
      // Collective API not available for this address — continue to Snapshot
    }

    // 3. Try to infer name from Snapshot proposals authored by this address
    try {
      const query = `
        query {
          proposals(
            first: 1,
            where: { space_in: ["${this.snapshotSpace}"], author: "${address}" },
            orderBy: "created",
            orderDirection: desc
          ) {
            title
            body
          }
        }
      `;
      const res = await fetch(this.snapshotGraphQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();
      const proposal = data?.proposals?.[0];

      if (proposal?.title) {
        // Extract name from common pattern: "[ProjectName] Request..." or "ProjectName: Proposal..."
        const bracketMatch = proposal.title.match(/^\[([^\]]+)\]/);
        const colonMatch = proposal.title.match(/^([^:|\-]+?)(?:\s*[:|\-]|\s+Request|\s+Proposal|\s+Grant)/);
        const extractedName = bracketMatch?.[1]?.trim() || colonMatch?.[1]?.trim();

        const content = (proposal.title + ' ' + (proposal.body || '')).toLowerCase();
        const category = content.includes('defi') || content.includes('lending') ? 'DeFi' :
          content.includes('bridge') ? 'Bridge' :
            content.includes('social') ? 'Social' : 'Infrastructure';

        if (extractedName && extractedName.length > 1 && extractedName.length < 40) {
          this.knownMetadata[lower] = { name: extractedName, category };
          return { name: extractedName, category };
        }
      }
    } catch (e) {
      // Snapshot not available — fall through
    }

    // 4. Unresolvable: show shortened address
    return {
      name: `${address.substring(0, 6)}...${address.substring(38)}`,
      category: 'Infrastructure'
    };
  }

  async getBuilderScorecard(address: string): Promise<any> {
    try {
      logger.info(`📡 Generating Rootstock scorecard for builder ${address}...`);

      const lowerAddress = address.toLowerCase();

      // 1. Fetch staking/rewards activity from Rewards Subgraph
      const activity = await this.fetchBuilderActivity(address);

      // 2. Fetch on-chain governance proposals where this address is the PROPOSER
      const onChainProposalQuery = `{
        proposals(
          first: 20,
          where: { proposer: "${lowerAddress}" },
          orderBy: startBlock,
          orderDirection: desc
        ) {
          id
          description
          status
          forVotes
          againstVotes
          startBlock
          endBlock
        }
      }`;

      // 3. Fetch proposals where this address VOTED (on-chain participation)
      const onChainVotesQuery = `{
        voteCasts(
          first: 20,
          where: { voter: "${lowerAddress}" },
          orderBy: blockNumber,
          orderDirection: desc
        ) {
          id
          proposal { id description status }
          support
          votes
          blockNumber
        }
      }`;

      // 4. Fetch human-readable proposal metadata from Rootstock Collective API
      const fetchCollectiveProposals = async (): Promise<any[]> => {
        try {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 6000);
          const res = await fetch(
            `https://app.rootstockcollective.xyz/api/proposals/v1?proposer=${lowerAddress}&limit=20`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (AndromedaCore/1.0; +https://andromeda.computer)',
                'Accept': 'application/json'
              },
              signal: controller.signal
            }
          );
          if (!res.ok) return [];
          const d = await res.json();
          return Array.isArray(d) ? d : (d.proposals || d.data || []);
        } catch {
          return [];
        }
      };

      // Only fetch from governance subgraph if configured
      let govProposalData: any = { data: { proposals: [] } };
      let govVotesData: any = { data: { voteCasts: [] } };

      if (this.governanceSubgraph) {
        const [govProposalsRes, govVotesRes] = await Promise.allSettled([
          fetch(this.governanceSubgraph, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: onChainProposalQuery }),
          }),
          fetch(this.governanceSubgraph, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: onChainVotesQuery }),
          })
        ]);

        if (govProposalsRes.status === 'fulfilled') {
          govProposalData = await govProposalsRes.value.json();
        }
        if (govVotesRes.status === 'fulfilled') {
          govVotesData = await govVotesRes.value.json();
        }
      } else {
        logger.warn('⚠️ No governance subgraph URL configured (THEGRAPH_API_KEY missing)');
      }

      const [collectiveProposals] = await Promise.allSettled([
        fetchCollectiveProposals()
      ]);

      const richProposals = collectiveProposals.status === 'fulfilled'
        ? collectiveProposals.value : [];

      const onChainProposals = govProposalData.data?.proposals || [];
      const onChainVotes = govVotesData.data?.voteCasts || [];

      // 5. Merge on-chain data with Collective API metadata for rich display
      const mergedProposals = onChainProposals.map((p: any) => {
        const rich = richProposals.find((r: any) =>
          r.id === p.id || r.onChainId === p.id || r.proposalId === p.id
        );
        const descLines = (p.description || '').split('\n');
        const autoTitle = descLines[0]?.replace(/^#+\s*/, '').trim() || `Proposal ${p.id.substring(0, 8)}`;
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

      // 6. Aggregate staking data
      const staking = activity.backerStakingHistories?.[0] || { backerTotalAllocation: '0', accumulatedTime: '0' };
      const gauges = activity.gaugeStakingHistories || [];

      // 7. Calculate AVIP v2.0 Reputation Score
      const proposalCount = onChainProposals.length;
      const voteCount = onChainVotes.length;
      const totalStaked = parseFloat(staking.backerTotalAllocation) || 0;
      const gaugeCount = gauges.length;

      // AVIP v2.0 calculation (Core Paper v3.1)
      // Base score based on staking allocation (0-100 scale)
      const baseScore = Math.min(Math.floor(totalStaked * 0.01) + 20, 100);

      // Bonuses with AVIP v2.0 weights
      const proposalBonus = Math.min(proposalCount * 25, 150);  // +25 per authored proposal (max +150)
      const voteBonus = Math.min(voteCount * 8, 100);           // +8 per vote cast (max +100)
      const stakeBonus = Math.min(totalStaked * 0.08, 120);     // +0.08 per unit staked (max +120)
      const gaugeBonus = Math.min(gaugeCount * 10, 80);         // +10 per active gauge (max +80)

      // Total reputation (0-999 scale)
      const totalReputation = Math.min(
        Math.floor(baseScore * 6) + proposalBonus + voteBonus + stakeBonus + gaugeBonus,
        999
      );

      // 8. Resolve project name
      const metadata = await this.getMetadata(address);

      return {
        address,
        name: metadata.name,
        category: metadata.category,
        did: `did:andromeda:rootstock:${address}`,
        reputation: totalReputation,
        baseScore: baseScore, // For UI display
        governanceSource: 'Rootstock Collective Governor (On-Chain)',
        governanceUrl: 'https://app.rootstockcollective.xyz/proposals',
        stats: {
          proposals: proposalCount,
          votesCast: voteCount,
          totalStaked,
          activeGauges: gaugeCount,
          timeInEcosystem: Math.floor(parseInt(staking.accumulatedTime || '0') / 86400),
        },
        proposals: mergedProposals,
        votes: onChainVotes.slice(0, 5).map((v: any) => ({
          proposalId: v.proposal?.id,
          proposalTitle: (v.proposal?.description || '').split('\n')[0]?.replace(/^#+\s*/, '') || 'Proposal',
          support: v.support === true || v.support === 1 ? 'FOR' : v.support === 0 ? 'AGAINST' : 'ABSTAIN',
          votes: v.votes,
          url: `https://app.rootstockcollective.xyz/proposals/${v.proposal?.id}`,
        })),
        staking: {
          allocation: staking.backerTotalAllocation,
          gauges: gauges.map((g: any) => g.gauge)
        },
        avipScore: {
          base: baseScore,
          proposalBonus,
          voteBonus,
          stakeBonus,
          gaugeBonus,
          total: totalReputation
        }
      };
    } catch (error) {
      logger.error(`❌ Error generating builder scorecard for ${address}:`, error);
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
        clarity_score: decision.clarityScore || 75,
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
