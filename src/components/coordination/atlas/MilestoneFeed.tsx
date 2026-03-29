'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Shield, CheckCircle, AlertCircle, ExternalLink, Zap, Users, FileText } from 'lucide-react';
import { AtlasActionType, MilestoneStatus } from '@/types/coordination/atlas';
import { useTranslations } from 'next-intl';
import { logger } from '../../../lib/utils/logger';

interface MilestoneFeedItem {
  atlasId: string;
  shortAtlasId: string;
  action: {
    type: AtlasActionType;
    description: string;
    tags: string[];
    metadata: {
      builderDid: string;
      builderShortDid: string;
      ecosystem?: string;
      daoIdentifier?: string;
    };
  };
  impactScore: number;
  status: MilestoneStatus;
  evidenceCount: number;
  attestationCount: number;
  verificationLevel: number;
  createdAt: string;
  relativeTime: string;
  evidencePreview?: {
    type: string;
    hash: string;
  };
}

interface MilestoneFeedProps {
  category?: string;
  ecosystem?: string;
  searchQuery?: string;
  limit?: number;
}

export default function MilestoneFeed({
  category,
  ecosystem,
  searchQuery,
  limit = 10
}: MilestoneFeedProps) {
  const t = useTranslations('AtlasExplore.MilestoneFeed');
  const tAtlas = useTranslations('AtlasExplore');
  const [milestones, setMilestones] = useState<MilestoneFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBy, setFilterBy] = useState<'all' | 'verified' | 'pending' | 'immutable'>('all');

  useEffect(() => {
    loadMilestoneFeed();
  }, [category, ecosystem, searchQuery, filterBy]);

  const loadMilestoneFeed = async () => {
    try {
      setLoading(true);

      // TODO: Implementar endpoint real para feed de milestones
      // const response = await fetch(`/api/atlas/feed?category=${category}&ecosystem=${ecosystem}&search=${searchQuery}&status=${filterBy}&limit=${limit}`);
      // const data = await response.json();

      // Datos mock por ahora
      const mockMilestones: MilestoneFeedItem[] = [
        {
          atlasId: 'atlas:milestone:0xa3b8c7d9e2f1a4b5c6d7e8f9a0b1c2d3e4f5a6b',
          shortAtlasId: 'atlas:0xa3b8...a6b',
          action: {
            type: 'CODE_CONTRIBUTION',
            description: 'Implemented Uniswap V4 hooks integration with Rootstock',
            tags: ['defi', 'amm', 'rootstock'],
            metadata: {
              builderDid: 'did:andromeda:eth:0x7a3d...c8f2',
              builderShortDid: '0x7a3d...c8f2',
              ecosystem: 'ethereum',
              daoIdentifier: 'uniswap-dao'
            }
          },
          impactScore: 94,
          status: 'IMMUTABLE',
          evidenceCount: 3,
          attestationCount: 5,
          verificationLevel: 3,
          createdAt: '2024-03-15T14:30:00Z',
          relativeTime: '2 hours ago',
          evidencePreview: {
            type: 'IPFS',
            hash: 'QmXyZ...AbC456'
          }
        },
        {
          atlasId: 'atlas:milestone:0xb4c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2',
          shortAtlasId: 'atlas:0xb4c9...b2',
          action: {
            type: 'PROTOCOL_DESIGN',
            description: 'Designed cross-chain bridge security architecture for Rootstock <> Ethereum',
            tags: ['infrastructure', 'security', 'bridges'],
            metadata: {
              builderDid: 'did:andromeda:rootstock:0x9b4e...a7c1',
              builderShortDid: '0x9b4e...a7c1',
              ecosystem: 'rootstock',
              daoIdentifier: 'rootstock-dao'
            }
          },
          impactScore: 91,
          status: 'VERIFIED',
          evidenceCount: 2,
          attestationCount: 3,
          verificationLevel: 2,
          createdAt: '2024-03-15T12:15:00Z',
          relativeTime: '4 hours ago',
          evidencePreview: {
            type: 'ON_CHAIN',
            hash: '0xabc...def123'
          }
        },
        {
          atlasId: 'atlas:milestone:0xc5d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3',
          shortAtlasId: 'atlas:0xc5d0...c3',
          action: {
            type: 'RESEARCH_PAPER',
            description: 'Published research on ZK-Rollup scaling solutions for Bitcoin L2s',
            tags: ['research', 'zk', 'scaling'],
            metadata: {
              builderDid: 'did:andromeda:polkadot:5H4M...Zp9Q',
              builderShortDid: '5H4M...Zp9Q',
              ecosystem: 'polkadot',
              daoIdentifier: 'polkadot-treasury'
            }
          },
          impactScore: 89,
          status: 'VERIFIED',
          evidenceCount: 1,
          attestationCount: 4,
          verificationLevel: 1,
          createdAt: '2024-03-14T09:45:00Z',
          relativeTime: '1 day ago',
          evidencePreview: {
            type: 'IPFS',
            hash: 'QmDef...Ghi123'
          }
        },
        {
          atlasId: 'atlas:milestone:0xd6e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4',
          shortAtlasId: 'atlas:0xd6e1...d4',
          action: {
            type: 'COMMUNITY_GOVERNANCE',
            description: 'Led community governance proposal for Aave protocol parameter updates',
            tags: ['governance', 'defi', 'social'],
            metadata: {
              builderDid: 'did:andromeda:snapshot:0x3c8a...d5f1',
              builderShortDid: '0x3c8a...d5f1',
              ecosystem: 'snapshot',
              daoIdentifier: 'aave-dao'
            }
          },
          impactScore: 86,
          status: 'PENDING',
          evidenceCount: 0,
          attestationCount: 1,
          verificationLevel: 0,
          createdAt: '2024-03-14T16:20:00Z',
          relativeTime: '18 hours ago'
        },
        {
          atlasId: 'atlas:milestone:0xe7f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5',
          shortAtlasId: 'atlas:0xe7f2...e5',
          action: {
            type: 'TECHNICAL_SPECIFICATION',
            description: 'Authored technical spec for AI-powered smart contract audit framework',
            tags: ['ai', 'security', 'smart-contracts'],
            metadata: {
              builderDid: 'did:andromeda:vara:5G9A...Xy7B',
              builderShortDid: '5G9A...Xy7B',
              ecosystem: 'vara',
              daoIdentifier: 'vara-ecosystem-fund'
            }
          },
          impactScore: 83,
          status: 'VERIFIED',
          evidenceCount: 2,
          attestationCount: 3,
          verificationLevel: 2,
          createdAt: '2024-03-13T11:10:00Z',
          relativeTime: '2 days ago',
          evidencePreview: {
            type: 'CONTENT_HASH',
            hash: 'sha256:abc...def456'
          }
        },
        {
          atlasId: 'atlas:milestone:0xf8a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6',
          shortAtlasId: 'atlas:0xf8a3...f6',
          action: {
            type: 'SECURITY_AUDIT',
            description: 'Completed security audit for Compound V3 protocol upgrade',
            tags: ['security', 'defi', 'audit'],
            metadata: {
              builderDid: 'did:andromeda:eth:0x1f2a...e9c3',
              builderShortDid: '0x1f2a...e9c3',
              ecosystem: 'ethereum',
              daoIdentifier: 'compound-dao'
            }
          },
          impactScore: 80,
          status: 'IMMUTABLE',
          evidenceCount: 4,
          attestationCount: 6,
          verificationLevel: 3,
          createdAt: '2024-03-12T14:55:00Z',
          relativeTime: '3 days ago',
          evidencePreview: {
            type: 'ON_CHAIN',
            hash: '0x123...456abc'
          }
        },
        {
          atlasId: 'atlas:milestone:0x9b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
          shortAtlasId: 'atlas:0x9b4c...a7',
          action: {
            type: 'UI_UX_DESIGN',
            description: 'Designed user interface for Polygon gaming SDK dashboard',
            tags: ['gaming', 'ui', 'polygon'],
            metadata: {
              builderDid: 'did:andromeda:polygon:0x5d7e...b2a8',
              builderShortDid: '0x5d7e...b2a8',
              ecosystem: 'polygon',
              daoIdentifier: 'polygon-dao'
            }
          },
          impactScore: 77,
          status: 'VERIFIED',
          evidenceCount: 1,
          attestationCount: 2,
          verificationLevel: 1,
          createdAt: '2024-03-11T10:30:00Z',
          relativeTime: '4 days ago'
        },
        {
          atlasId: 'atlas:milestone:0xac5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8',
          shortAtlasId: 'atlas:0xac5d...b8',
          action: {
            type: 'CODE_CONTRIBUTION',
            description: 'Contributed to Avalanche DEX aggregator smart contracts',
            tags: ['defi', 'dex', 'avalanche'],
            metadata: {
              builderDid: 'did:andromeda:avalanche:0x8c9f...d3e4',
              builderShortDid: '0x8c9f...d3e4',
              ecosystem: 'avalanche',
              daoIdentifier: 'avalanche-foundation'
            }
          },
          impactScore: 74,
          status: 'PENDING',
          evidenceCount: 0,
          attestationCount: 1,
          verificationLevel: 0,
          createdAt: '2024-03-10T15:40:00Z',
          relativeTime: '5 days ago'
        },
        {
          atlasId: 'atlas:milestone:0xbd6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9',
          shortAtlasId: 'atlas:0xbd6e...c9',
          action: {
            type: 'PROTOCOL_DESIGN',
            description: 'Designed secure wallet infrastructure for Rootstock ecosystem',
            tags: ['infrastructure', 'wallets', 'security'],
            metadata: {
              builderDid: 'did:andromeda:rootstock:0x2b6c...f9a1',
              builderShortDid: '0x2b6c...f9a1',
              ecosystem: 'rootstock',
              daoIdentifier: 'rootstock-dao'
            }
          },
          impactScore: 71,
          status: 'VERIFIED',
          evidenceCount: 2,
          attestationCount: 3,
          verificationLevel: 2,
          createdAt: '2024-03-09T13:25:00Z',
          relativeTime: '6 days ago',
          evidencePreview: {
            type: 'IPFS',
            hash: 'QmNop...Qrs345'
          }
        },
        {
          atlasId: 'atlas:milestone:0xce7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9',
          shortAtlasId: 'atlas:0xce7f...e9',
          action: {
            type: 'COMMUNITY_GOVERNANCE',
            description: 'Facilitated MakerDAO governance process for stability fee adjustment',
            tags: ['governance', 'stablecoins', 'defi'],
            metadata: {
              builderDid: 'did:andromeda:eth:0x4e8d...c7b2',
              builderShortDid: '0x4e8d...c7b2',
              ecosystem: 'ethereum',
              daoIdentifier: 'maker-dao'
            }
          },
          impactScore: 68,
          status: 'CHALLENGED',
          evidenceCount: 1,
          attestationCount: 2,
          verificationLevel: 1,
          createdAt: '2024-03-08T09:15:00Z',
          relativeTime: '1 week ago'
        }
      ];

      // Filtrar según props (simulado)
      let filtered = mockMilestones;
      if (category && category !== 'all') {
        filtered = filtered.filter(m => m.action.tags.includes(category));
      }
      if (ecosystem && ecosystem !== 'all') {
        filtered = filtered.filter(m => m.action.metadata.ecosystem === ecosystem);
      }
      if (searchQuery) {
        filtered = filtered.filter(m =>
          m.atlasId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.action.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.action.metadata.builderShortDid.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.action.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      if (filterBy !== 'all') {
        filtered = filtered.filter(m => m.status === filterBy.toUpperCase() as MilestoneStatus);
      }

      // Ordenar por fecha (más reciente primero)
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setMilestones(filtered.slice(0, limit));
    } catch (error) {
      logger.error('Error loading milestone feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: MilestoneStatus) => {
    switch (status) {
      case 'IMMUTABLE':
        return { color: 'text-reactor-cyan', bg: 'bg-reactor-cyan/10', icon: Shield };
      case 'VERIFIED':
        return { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle };
      case 'PENDING':
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock };
      case 'CHALLENGED':
        return { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle };
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-500/10', icon: Clock };
    }
  };

  const getActionTypeIcon = (type: AtlasActionType) => {
    switch (type) {
      case 'CODE_CONTRIBUTION':
        return <FileText className="w-3.5 h-3.5" />;
      case 'PROTOCOL_DESIGN':
        return <Zap className="w-3.5 h-3.5" />;
      case 'RESEARCH_PAPER':
        return <FileText className="w-3.5 h-3.5" />;
      case 'COMMUNITY_GOVERNANCE':
        return <Users className="w-3.5 h-3.5" />;
      case 'TECHNICAL_SPECIFICATION':
        return <FileText className="w-3.5 h-3.5" />;
      case 'SECURITY_AUDIT':
        return <Shield className="w-3.5 h-3.5" />;
      case 'UI_UX_DESIGN':
        return <FileText className="w-3.5 h-3.5" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const getEcosystemColor = (ecosystem?: string) => {
    if (!ecosystem) return 'text-gray-500';
    const colors: Record<string, string> = {
      ethereum: 'text-purple-500',
      rootstock: 'text-orange-500',
      polkadot: 'text-pink-500',
      snapshot: 'text-blue-500',
      vara: 'text-cyan-500',
      polygon: 'text-violet-500',
      avalanche: 'text-red-500'
    };
    return colors[ecosystem] || 'text-gray-500';
  };

  return (
    <div className="space-y-4">
      {/* Header con filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterBy('all')}
            className={`px-3 py-1 text-xs font-mono-display border rounded-[2px] ${filterBy === 'all'
              ? 'bg-reactor-cyan/10 border-reactor-cyan text-reactor-cyan'
              : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
              }`}
          >
            {t('filters.all')}
          </button>
          <button
            onClick={() => setFilterBy('verified')}
            className={`px-3 py-1 text-xs font-mono-display border rounded-[2px] ${filterBy === 'verified'
              ? 'bg-green-500/10 border-green-500 text-green-500'
              : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
              }`}
          >
            {t('filters.verified')}
          </button>
          <button
            onClick={() => setFilterBy('pending')}
            className={`px-3 py-1 text-xs font-mono-display border rounded-[2px] ${filterBy === 'pending'
              ? 'bg-amber-500/10 border-amber-500 text-amber-500'
              : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
              }`}
          >
            {t('filters.pending')}
          </button>
          <button
            onClick={() => setFilterBy('immutable')}
            className={`px-3 py-1 text-xs font-mono-display border rounded-[2px] ${filterBy === 'immutable'
              ? 'bg-reactor-cyan/10 border-reactor-cyan text-reactor-cyan'
              : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
              }`}
          >
            {t('filters.immutable')}
          </button>
        </div>
        <div className="text-[10px] font-mono-display text-gray-500">
          {t('milestonesCount', { count: milestones.length })}
        </div>
      </div>

      {/* Feed de milestones */}
      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-black/40 border border-white/5 animate-pulse rounded-[2px]" />
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-8 border border-white/5 rounded-[2px]">
          <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs font-mono-display text-gray-500">{t('noMilestones')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const StatusIcon = getStatusConfig(milestone.status).icon;
            const statusColor = getStatusConfig(milestone.status).color;
            const statusBg = getStatusConfig(milestone.status).bg;

            return (
              <div
                key={milestone.atlasId}
                className="bg-black/40 border border-white/5 hover:border-reactor-cyan/20 p-4 rounded-[2px] transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 ${statusBg} border ${statusColor}/20 rounded-[2px]`}>
                      {getActionTypeIcon(milestone.action.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-mono-display font-bold text-gray-100 mb-1 truncate">
                        {milestone.action.description}
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 text-[10px] font-mono-display font-bold ${statusColor}`}>
                          <StatusIcon className="w-3 h-3" />
                          {milestone.status}
                        </div>
                        <div className="text-[10px] font-mono-display text-gray-500">
                          {milestone.relativeTime}
                        </div>
                        {milestone.action.metadata.ecosystem && (
                          <div className={`text-[10px] font-mono-display font-bold ${getEcosystemColor(milestone.action.metadata.ecosystem)}`}>
                            {milestone.action.metadata.ecosystem.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono-display font-bold text-gray-100">
                      {milestone.impactScore}
                    </div>
                    <div className="text-[10px] font-mono-display text-gray-500">
                      {t('impact')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-black/60 p-2 border border-white/5 rounded-[2px]">
                    <div className="text-[10px] font-mono-display text-gray-600 mb-1">{t('builder')}</div>
                    <div className="text-xs font-mono-display text-gray-300 truncate">
                      {milestone.action.metadata.builderShortDid}
                    </div>
                  </div>
                  <div className="bg-black/60 p-2 border border-white/5 rounded-[2px]">
                    <div className="text-[10px] font-mono-display text-gray-600 mb-1">{t('verification')}</div>
                    <div className="text-xs font-mono-display text-gray-300">
                      {t(`verificationLevels.${milestone.verificationLevel}`)}
                    </div>
                  </div>
                  <div className="bg-black/60 p-2 border border-white/5 rounded-[2px]">
                    <div className="text-[10px] font-mono-display text-gray-600 mb-1">{t('evidence')}</div>
                    <div className="text-xs font-mono-display text-gray-300">
                      {t('files', { count: milestone.evidenceCount })}
                    </div>
                  </div>
                  <div className="bg-black/60 p-2 border border-white/5 rounded-[2px]">
                    <div className="text-[10px] font-mono-display text-gray-600 mb-1">{t('attestations')}</div>
                    <div className="text-xs font-mono-display text-gray-300">
                      {t('signers', { count: milestone.attestationCount })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {milestone.action.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-[9px] font-mono-display px-2 py-0.5 bg-black/40 border border-white/5 rounded-[1px] text-gray-500"
                      >
                        {tAtlas.has(`Categories.${tag}`) ? tAtlas(`Categories.${tag}`) : tag.toUpperCase()}
                      </span>
                    ))}
                    {milestone.action.tags.length > 3 && (
                      <span className="text-[9px] font-mono-display text-gray-600">
                        +{milestone.action.tags.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {milestone.evidencePreview && (
                      <div className="text-[9px] font-mono-display text-gray-500">
                        {milestone.evidencePreview.type}: {milestone.evidencePreview.hash.substring(0, 12)}...
                      </div>
                    )}
                    <button className="text-[10px] font-mono-display text-reactor-cyan hover:underline">
                      {t('viewDetails')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pie del feed */}
      {milestones.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="text-[10px] font-mono-display text-gray-600">
            {t('displayed', { count: milestones.length })}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-mono-display text-gray-500">
              {t('avgImpact')}: <span className="text-gray-100 font-bold">
                {Math.round(milestones.reduce((sum, m) => sum + m.impactScore, 0) / milestones.length)}
              </span>
            </div>
            <div className="text-[10px] font-mono-display text-gray-500">
              {t('avgVerification')}: <span className="text-gray-100 font-bold">
                {Math.round(milestones.reduce((sum, m) => sum + m.verificationLevel, 0) / milestones.length)}/3
              </span>
            </div>
            <button className="text-[10px] font-mono-display text-reactor-cyan hover:underline">
              {t('loadMore')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}