'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, FolderGit2, ExternalLink, Shield, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { logger } from '../../../lib/utils/logger';

interface BuilderRankingItem {
  rank: number;
  did: string;
  name?: string;
  shortDid: string;
  reputationScore: number;
  totalProjects: number;
  impactScore: number;
  ecosystem: string;
  category: string;
  lastActivity: string;
  crossChainAddresses: number;
  change: number;
}

interface BuilderRankingProps {
  category?: string;
  ecosystem?: string;
  searchQuery?: string;
  limit?: number;
  onBuilderClick?: (did: string) => void;
}

// 🔧 PATCH: Regex unificado que acepta Base58 (standard Solana) Y Base64 (Yellowstone gRPC)
function isSolanaAddress(s: string): boolean {
  return (
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s) ||           // Base58 pubkey
    /^[A-Za-z0-9+/]{42,48}={0,2}$/.test(s)                // Base64 (Yellowstone)
  ) && !s.startsWith('0x');
}

function normalizeDid(didKey: string): string {
  const parts = didKey.split(':');
  // 🔧 FIX: Para Solana no podemos usar lowercase() en el pubkey porque es Base58 (case-sensitive)
  const solanaAddrPart = parts.find((p: string) => isSolanaAddress(p));
  const fullAddrPart = parts.find((p: string) => /^0x[a-f0-9]{10,}/.test(p));
  const rawAddr = solanaAddrPart || fullAddrPart || parts[parts.length - 1];

  if (!rawAddr) return didKey;

  if (isSolanaAddress(rawAddr) || didKey.toLowerCase().includes(':sol:') || didKey.toLowerCase().includes('solana')) {
    return `did:andromeda:sol:${rawAddr}`; // rawAddr mantiene su casing original
  }

  // EVM chains (estas sí pueden ser lowercase)
  const addrLower = rawAddr.toLowerCase();
  if (addrLower.startsWith('0x')) {
    if (didKey.includes('eip155:30') || didKey.includes(':rootstock:')) {
      return `did:andromeda:rootstock:${addrLower}`;
    }
    if (didKey.includes('eip155:42161') || didKey.includes(':arbitrum:')) {
      return `did:andromeda:arbitrum:${addrLower}`;
    }
    if (didKey.includes('eip155:10') || didKey.includes(':optimism:')) {
      return `did:andromeda:optimism:${addrLower}`;
    }
    if (didKey.includes(':eth:') || didKey.includes('eip155:1')) {
      return `did:andromeda:eth:${addrLower}`;
    }
  }

  return didKey;
}

export default function BuilderRanking({
  category,
  ecosystem,
  searchQuery,
  limit = 10,
  onBuilderClick
}: BuilderRankingProps) {
  const t = useTranslations('AtlasExplore.BuilderRanking');
  const tAtlas = useTranslations('AtlasExplore');
  const [builders, setBuilders] = useState<BuilderRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'impact' | 'reputation' | 'projects' | 'activity'>('impact');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const state = { cancelled: false };
    loadBuilderRanking(state);
    return () => { state.cancelled = true; };
  }, [category, ecosystem, searchQuery, sortBy, sortOrder]);

  const loadBuilderRanking = async (state = { cancelled: false }) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (ecosystem && ecosystem !== 'all') params.append('ecosystem', ecosystem);
      const trimmedSearch = (searchQuery || '').trim();
      if (trimmedSearch) params.append('search', trimmedSearch);
      params.append('sortBy', sortBy === 'impact' ? 'metadata.trustScore' : 'metadata.avipScore.total');
      params.append('sortOrder', sortOrder);
      const effectiveLimit = (!ecosystem || ecosystem === 'all') ? Math.max(limit * 3, 50) : limit;
      params.append('limit', effectiveLimit.toString());

      const response = await fetch(`/api/atlas/search?${params.toString()}`);
      const data = await response.json();

      let dbResults = data.success && data.results ? data.results : [];
      let finalResults = [...dbResults];

      const isAddressSearch = trimmedSearch && /^0x[a-fA-F0-9]{40}$/.test(trimmedSearch);

      if (isAddressSearch) {
        logger.info(`🔍 Address search detected: ${trimmedSearch}. Fetching real scorecard...`);
        try {
          const scorecardRes = await fetch(`/api/rootstock/builders?address=${trimmedSearch}`);
          if (scorecardRes.ok) {
            const scorecard = await scorecardRes.json();
            if (scorecard && scorecard.address) {
              finalResults = [{
                builderDid: `did:andromeda:rootstock:${scorecard.address.toLowerCase()}`,
                name: scorecard.name,
                reputationScore: scorecard.reputation || 0,
                totalProjects: scorecard.stats?.proposals || 1,
                impactScore: scorecard.reputation || 0,
                ecosystem: 'rootstock',
                category: scorecard.category,
                isLive: true,
                createdAt: new Date().toISOString(),
                _scorecardStats: scorecard.stats,
                _scorecardProposals: scorecard.proposals
              }];
            } else {
              finalResults = [];
            }
          } else {
            finalResults = [];
          }
        } catch (e) {
          logger.warn('Failed to fetch scorecard on-demand:', e);
          finalResults = [];
        }
      } else {
        // ── Live Fallback: Rootstock ──
        if (ecosystem === 'rootstock') {
          logger.info('🔄 Fetching Rootstock builder list to complement ATLAS results...');
          try {
            const buildersRes = await fetch('/api/rootstock/builders');
            const buildersData = await buildersRes.json();
            if (buildersData.success && buildersData.builders) {
              const atlasDidSet = new Set(
                dbResults.map((r: any) => (r.builderDid || '').toLowerCase())
              );
              buildersData.builders.forEach((lb: any) => {
                const lbDid = (lb.builderDid || '').toLowerCase();
                if (lbDid && !atlasDidSet.has(lbDid)) {
                  finalResults.push(lb);
                }
              });
            }
          } catch (e) {
            logger.warn('Could not fetch live builders list:', e);
          }
        }

        // 🔧 PATCH: Live Fallback para Solana
        if (ecosystem === 'solana') {
          logger.info('🔄 Fetching Solana governance data as live fallback...');
          try {
            const solRes = await fetch('/api/solana/governance?limit=20');
            const solData = await solRes.json();
            if (solData.success && solData.proposals) {
              const atlasDidSet = new Set(
                dbResults.map((r: any) => (r.builderDid || '').toLowerCase())
              );
              solData.proposals.forEach((p: any) => {
                const did = `did:andromeda:sol:${p.realm}`;
                if (!atlasDidSet.has(did.toLowerCase())) {
                  finalResults.push({
                    builderDid: did,
                    ecosystem: 'solana',
                    name: p.dao_identifier || p.title,
                    reputationScore: 0,
                    totalProjects: 1,
                    impactScore: 0,
                    category: 'Governance',
                    isLive: true,
                    createdAt: new Date().toISOString()
                  });
                }
              });
            }
          } catch (e) {
            logger.warn('Solana live fallback failed:', e);
          }
        }

        // Filtrado por texto
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          finalResults = finalResults.filter(item => {
            const bDid = (item.builderDid || item.action?.metadata?.builderDid || "").toLowerCase();
            const name = (item.name || "").toLowerCase();
            return bDid.includes(query) || name.includes(query);
          });
        }
      }

      if (finalResults.length > 0) {
        const builderMap = new Map<string, BuilderRankingItem>();

        finalResults.forEach((item: any, index: number) => {
          const bDid = item.builderDid
            || item.action?.metadata?.builderDid
            || item.sourceScorecard?.authorDid
            || item.metadata?.authorDid;
          if (!bDid) return;

          const didKey = bDid.toLowerCase();
          const normalizedDid = normalizeDid(didKey);
          const finalKey = normalizedDid.toLowerCase();

          if (!builderMap.has(finalKey)) {
            const resolvedEcosystem =
              item.action?.metadata?.ecosystem ||
              item.sourceScorecard?.ecosystem ||
              item.ecosystem ||
              (didKey.includes(':rootstock:') || didKey.includes('eip155:30') ? 'rootstock' :
                didKey.includes(':arbitrum:') || didKey.includes('eip155:42161') ? 'arbitrum' :
                  didKey.includes(':sol:') || didKey.includes('solana') ? 'solana' :
                    didKey.includes(':optimism:') || didKey.includes('eip155:10') ? 'optimism' : 'unknown');

            builderMap.set(finalKey, {
              rank: index + 1,
              did: normalizedDid,
              name: item.name,
              shortDid: item.name || (normalizedDid.split(':').pop()?.substring(0, 10) + '...'),
              reputationScore: Math.min(100, Math.round(item.metadata?.avipScore?.total || item.reputationScore || item.impactScore || item.reputation || 0)),
              totalProjects: item.metadata?.impactMetrics?.projects || item.totalProjects || 1,
              impactScore: Math.min(100, Math.round(item.metadata?.trustScore || item.impactScore || 0)),
              ecosystem: resolvedEcosystem,
              category: (item.category || item.action?.tags?.[0] || 'infrastructure').replace(/\./g, '-'),
              lastActivity: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'recent',
              crossChainAddresses: 1,
              change: item.isVirtual ? -1 : (item.isLive || item.name ? 0 : 2)
            });
          }
        });

        if (!state.cancelled) setBuilders(Array.from(builderMap.values()));
      } else {
        if (!state.cancelled) setBuilders([]);
      }
    } catch (error) {
      logger.error('Error loading builder ranking:', error);
      if (!state.cancelled) setBuilders([]);
    } finally {
      if (!state.cancelled) setLoading(false);
    }
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getEcosystemColor = (ecosystem: string) => {
    const colors: Record<string, string> = {
      ethereum: 'text-purple-500', rootstock: 'text-orange-500',
      arbitrum: 'text-blue-400', optimism: 'text-red-400',
      polkadot: 'text-pink-500', snapshot: 'text-blue-500',
      vara: 'text-cyan-500', polygon: 'text-violet-500',
      avalanche: 'text-red-500', algorand: 'text-teal-400',
      solana: 'text-green-400'
    };
    return colors[ecosystem?.toLowerCase()] || 'text-gray-500';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      defi: 'text-green-500', governance: 'text-blue-500',
      infrastructure: 'text-amber-500', refi: 'text-emerald-500',
      social: 'text-pink-500', gaming: 'text-violet-500', ai: 'text-cyan-500'
    };
    return colors[category] || 'text-gray-500';
  };

  return (
    <div className="space-y-4">
      {/* Header con controles de ordenamiento */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => handleSort('impact')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono-display border rounded-[2px] ${sortBy === 'impact' ? 'bg-reactor-cyan/10 border-reactor-cyan text-reactor-cyan' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}>
            <TrendingUp className="w-3 h-3" /> {t('impact')} {sortBy === 'impact' && (sortOrder === 'desc' ? '▼' : '▲')}
          </button>
          <button onClick={() => handleSort('reputation')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono-display border rounded-[2px] ${sortBy === 'reputation' ? 'bg-reactor-cyan/10 border-reactor-cyan text-reactor-cyan' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}>
            <Shield className="w-3 h-3" /> {t('reputation')} {sortBy === 'reputation' && (sortOrder === 'desc' ? '▼' : '▲')}
          </button>
          <button onClick={() => handleSort('projects')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono-display border rounded-[2px] ${sortBy === 'projects' ? 'bg-reactor-cyan/10 border-reactor-cyan text-reactor-cyan' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}>
            <FolderGit2 className="w-3 h-3" /> {t('projects')} {sortBy === 'projects' && (sortOrder === 'desc' ? '▼' : '▲')}
          </button>
        </div>
        <div className="text-[10px] font-mono-display text-gray-500">
          {t('buildersCount', { count: builders.length })}
        </div>
      </div>

      {/* Tabla de ranking */}
      {loading ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-12 bg-black/40 border border-white/5 animate-pulse rounded-[2px]" />
          ))}
        </div>
      ) : builders.length === 0 ? (
        <div className="text-center py-8 border border-white/5 rounded-[2px]">
          <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs font-mono-display text-gray-500">{t('noBuilders')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono-display">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.rank')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.builder')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.impact')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.reputation')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.projects')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.ecosystem')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.activity')}</th>
              </tr>
            </thead>
            <tbody>
              {builders.map((builder) => (
                <tr
                  key={builder.did}
                  className={`border-b border-white/5 hover:bg-black/30 transition-colors group ${onBuilderClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onBuilderClick?.(builder.did)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-[2px] text-xs font-bold ${builder.rank <= 3 ? 'bg-reactor-cyan/10 text-reactor-cyan' : 'bg-black/20 text-gray-500'}`}>
                        {builder.rank}
                      </div>
                      <div className={`text-[10px] font-bold ${builder.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {builder.change >= 0 ? `+${builder.change}` : builder.change}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-gray-100">{builder.shortDid}</div>
                      <div className={`text-[10px] ${getCategoryColor(builder.category)}`}>
                        {tAtlas(`Categories.${builder.category}`)}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-800 rounded-full h-1.5">
                        <div className="bg-reactor-cyan h-1.5 rounded-full" style={{ width: `${builder.impactScore}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-100">{builder.impactScore}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-3 h-3 ${builder.reputationScore > 90 ? 'text-green-500' : builder.reputationScore > 80 ? 'text-amber-500' : 'text-gray-500'}`} />
                      <span className="text-xs font-bold text-gray-100">{builder.reputationScore}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="w-3 h-3 text-reactor-cyan" />
                      <span className="text-xs font-bold text-gray-100">{builder.totalProjects}</span>
                      <div className="text-[10px] text-gray-600">({t('chains', { count: builder.crossChainAddresses })})</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className={`text-xs font-bold ${getEcosystemColor(builder.ecosystem)}`}>
                      {builder.ecosystem.toUpperCase()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[10px] text-gray-500">{builder.lastActivity}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pie de tabla con estadísticas */}
      {builders.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="text-[10px] font-mono-display text-gray-600">
            {t('displayed', { count: builders.length })}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-mono-display text-gray-500">
              {t('avgImpact')}: <span className="text-gray-100 font-bold">{Math.round(builders.reduce((sum, b) => sum + b.impactScore, 0) / builders.length)}</span>
            </div>
            <div className="text-[10px] font-mono-display text-gray-500">
              {t('avgReputation')}: <span className="text-gray-100 font-bold">{Math.round(builders.reduce((sum, b) => sum + b.reputationScore, 0) / builders.length)}</span>
            </div>
            <button className="text-[10px] font-mono-display text-reactor-cyan hover:underline">
              {t('viewFull')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
