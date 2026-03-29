'use client';

import React, { useState, useEffect } from 'react';
import { FolderGit2, TrendingUp, Users, Shield, CheckCircle, Clock, ExternalLink, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { logger } from '../../../lib/utils/logger';

interface ProjectRankingItem {
  rank: number;
  canonicalHash: string;
  shortHash: string;
  ipfsCid: string;
  ecosystem: string;
  daoIdentifier: string;
  builderDid: string;
  builderShortDid: string;
  impactScore: number;
  clarityScore: number;
  tags: string[];
  submissionDate: string;
  fundingAmount?: string;
  milestones?: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'IMMUTABLE';
  votesFor: number;
  votesAgainst: number;
  change: number;
}

interface ProjectRankingProps {
  category?: string;
  ecosystem?: string;
  searchQuery?: string;
  limit?: number;
}

export default function ProjectRanking({
  category,
  ecosystem,
  searchQuery,
  limit = 10
}: ProjectRankingProps) {
  const t = useTranslations('AtlasExplore.ProjectRanking');
  const tAtlas = useTranslations('AtlasExplore');
  const [projects, setProjects] = useState<ProjectRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'impact' | 'clarity' | 'funding' | 'date'>('impact');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadProjectRanking();
  }, [category, ecosystem, searchQuery, sortBy, sortOrder]);

  const loadProjectRanking = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (ecosystem && ecosystem !== 'all') params.append('ecosystem', ecosystem);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', sortBy === 'impact' ? 'metadata.trustScore' : (sortBy === 'date' ? 'metadata.createdAt' : 'metadata.trustScore'));
      params.append('sortOrder', sortOrder);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/atlas/search?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.results) {
        setProjects(data.results.map((item: any, index: number) => ({
          rank: index + 1,
          canonicalHash: item.atlasId || item.canonicalHash,
          shortHash: (item.atlasId || item.canonicalHash || '').substring(0, 10) + '...',
          ipfsCid: item.action?.metadata?.ipfsCid || 'N/A',
          ecosystem: item.ecosystem || 'unknown',
          daoIdentifier: item.action?.metadata?.daoIdentifier || 'N/A',
          builderDid: item.builderDid,
          builderShortDid: (item.builderDid || '').split(':').pop()?.substring(0, 10) + '...',
          impactScore: item.impactScore || 0,
          clarityScore: item.action?.metadata?.clarityScore || (item.impactScore ? Math.max(item.impactScore - 10, 0) : 0),
          tags: item.action?.tags || [],
          submissionDate: item.createdAt || new Date().toISOString(),
          fundingAmount: item.action?.metadata?.fundingAmount,
          milestones: item.action?.metadata?.milestones || 1,
          status: item.status || 'APPROVED',
          votesFor: item.action?.metadata?.votesFor || 0,
          votesAgainst: item.action?.metadata?.votesAgainst || 0,
          change: 0
        })));
      } else {
        setProjects([]);
      }
    } catch (error) {
      logger.error('Error loading project ranking:', error);
      setProjects([]);
    } finally {
      setLoading(false);
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

  const getStatusConfig = (status: ProjectRankingItem['status']) => {
    switch (status) {
      case 'APPROVED':
        return { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle };
      case 'PENDING':
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock };
      case 'IMMUTABLE':
        return { color: 'text-reactor-cyan', bg: 'bg-reactor-cyan/10', icon: Shield };
      case 'REJECTED':
        return { color: 'text-red-500', bg: 'bg-red-500/10', icon: CheckCircle };
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-500/10', icon: CheckCircle };
    }
  };

  const getApprovalRate = (votesFor: number, votesAgainst: number) => {
    const total = votesFor + votesAgainst;
    return total > 0 ? Math.round((votesFor / total) * 100) : 0;
  };

  return (
    <div className="space-y-4">
      {/* Header con controles de ordenamiento */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleSort('impact')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono-display border rounded-[2px] ${sortBy === 'impact'
              ? 'bg-reactor-cyan/10 border-reactor-cyan text-reactor-cyan'
              : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
              }`}
          >
            <TrendingUp className="w-3 h-3" />
            {t('impact')} {sortBy === 'impact' && (sortOrder === 'desc' ? '▼' : '▲')}
          </button>
          <button
            onClick={() => handleSort('clarity')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono-display border rounded-[2px] ${sortBy === 'clarity'
              ? 'bg-reactor-cyan/10 border-reactor-cyan text-reactor-cyan'
              : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
              }`}
          >
            <Shield className="w-3 h-3" />
            {t('clarity')} {sortBy === 'clarity' && (sortOrder === 'desc' ? '▼' : '▲')}
          </button>
          <button
            onClick={() => handleSort('funding')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono-display border rounded-[2px] ${sortBy === 'funding'
              ? 'bg-reactor-cyan/10 border-reactor-cyan text-reactor-cyan'
              : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
              }`}
          >
            <FolderGit2 className="w-3 h-3" />
            {t('funding')} {sortBy === 'funding' && (sortOrder === 'desc' ? '▼' : '▲')}
          </button>
        </div>
        <div className="text-[10px] font-mono-display text-gray-500">
          {t('projectsCount', { count: projects.length })}
        </div>
      </div>

      {/* Tabla de ranking */}
      {loading ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-black/40 border border-white/5 animate-pulse rounded-[2px]" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8 border border-white/5 rounded-[2px]">
          <FolderGit2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs font-mono-display text-gray-500">{t('noProjects')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono-display">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.rank')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.project')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.impact')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.clarity')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.dao')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.status')}</th>
                <th className="text-left py-3 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('table.funding')}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project: ProjectRankingItem) => {
                const StatusIcon = getStatusConfig(project.status).icon;
                const statusColor = getStatusConfig(project.status).color;
                const statusBg = getStatusConfig(project.status).bg;
                const approvalRate = getApprovalRate(project.votesFor, project.votesAgainst);

                return (
                  <tr
                    key={project.canonicalHash}
                    className="border-b border-white/5 hover:bg-black/30 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 flex items-center justify-center rounded-[2px] text-xs font-bold
                          ${project.rank <= 3 ? 'bg-reactor-cyan/10 text-reactor-cyan' : 'bg-black/20 text-gray-500'}`}>
                          {project.rank}
                        </div>
                        <div className={`text-[10px] font-bold ${project.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {project.change >= 0 ? `+${project.change}` : project.change}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-100 truncate max-w-[180px]">
                          {project.shortHash}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 2).map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[8px] font-mono-display px-1.5 py-0.5 bg-black/40 border border-white/5 rounded-[1px] text-gray-500"
                            >
                              {tAtlas.has(`Categories.${tag}`) ? tAtlas(`Categories.${tag}`) : tag.toUpperCase()}
                            </span>
                          ))}
                          {project.tags.length > 2 && (
                            <span className="text-[8px] font-mono-display text-gray-600">
                              +{project.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-reactor-cyan h-1.5 rounded-full"
                            style={{ width: `${project.impactScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-100">{project.impactScore}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${project.clarityScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-100">{project.clarityScore}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className={`text-xs font-bold ${getEcosystemColor(project.ecosystem)}`}>
                          {project.ecosystem.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[120px]">
                          {project.daoIdentifier}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className={`flex items-center gap-1 text-xs font-bold ${statusColor}`}>
                          <StatusIcon className="w-3 h-3" />
                          {project.status}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {t('approval', { rate: approvalRate })}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-100">
                          {project.fundingAmount || '—'}
                        </div>
                        {project.milestones && (
                          <div className="text-[10px] text-gray-500">
                            {t('milestones', { count: project.milestones })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pie de tabla con estadísticas */}
      {projects.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="text-[10px] font-mono-display text-gray-600">
            {t('displayed', { count: projects.length })}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-mono-display text-gray-500">
              {t('avgImpact')}: <span className="text-gray-100 font-bold">
                {Math.round(projects.reduce((sum: number, p: ProjectRankingItem) => sum + p.impactScore, 0) / projects.length)}
              </span>
            </div>
            <div className="text-[10px] font-mono-display text-gray-500">
              {t('avgClarity')}: <span className="text-gray-100 font-bold">
                {Math.round(projects.reduce((sum: number, p: ProjectRankingItem) => sum + p.clarityScore, 0) / projects.length)}
              </span>
            </div>
            <div className="text-[10px] font-mono-display text-gray-500">
              {t('totalFunding')}: <span className="text-gray-100 font-bold">
                ${projects.reduce((sum: number, p: ProjectRankingItem) => {
                  const amount = parseFloat(p.fundingAmount?.replace(/[^0-9.]/g, '') || '0');
                  return sum + amount;
                }, 0).toLocaleString()}
              </span>
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