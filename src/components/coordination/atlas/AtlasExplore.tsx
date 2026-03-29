'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import EmbeddedDisplay from '@/components/widgets/EmbeddedDisplay';
import BuilderRanking from './BuilderRanking';
import ProjectRanking from './ProjectRanking';
import MilestoneFeed from './MilestoneFeed';
import RootstockProposals from '../governance/RootstockProposals';
import RootstockBuilderScorecard from '../scorecards/RootstockBuilderScorecard';
import { Search, Filter, TrendingUp, Users, FolderGit2, RefreshCw, Hexagon } from 'lucide-react';
import { logger } from '../../../lib/utils/logger';

interface AtlasStats {
  totalBuilders: number;
  totalProjects: number;
  totalMilestones: number;
  avgImpactScore: number;
}

export default function AtlasExplore() {
  const t = useTranslations('AtlasExplore');
  const [activeTab, setActiveTab] = useState<'builders' | 'projects' | 'feed'>('builders');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ecosystemFilter, setEcosystemFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stats, setStats] = useState<AtlasStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBuilderAddress, setSelectedBuilderAddress] = useState<string | null>(null);

  const categories = [
    'all', 'defi', 'governance', 'infrastructure', 'refi', 'social', 'gaming', 'ai'
  ];

  const ecosystems = [
    'all', 'rootstock', 'snapshot', 'ethereum', 'polygon', 'avalanche', 'optimism', 'arbitrum'
  ];

  useEffect(() => {
    loadAtlasStats();
  }, []);

  const loadAtlasStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/intelligence/telemetry');
      const data = await response.json();

      if (data.success && data.telemetry) {
        const t = data.telemetry;
        setStats({
          totalBuilders: t.dataSources?.uniqueBuilders || t.ecosystems?.rootstock?.builders || 0,
          totalProjects: t.dataSources?.totalMilestones || 0,
          totalMilestones: t.dataSources?.totalMilestones || 0,
          avgImpactScore: 0 // Calculated from real milestones, set to 0 if unavailable
        });
      } else {
        setStats({ totalBuilders: 0, totalProjects: 0, totalMilestones: 0, avgImpactScore: 0 });
      }
    } catch (error) {
      logger.error('Error loading ATLAS stats:', error);
      setStats({ totalBuilders: 0, totalProjects: 0, totalMilestones: 0, avgImpactScore: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    logger.info('Searching with:', {
      query: searchQuery,
      category: categoryFilter,
      ecosystem: ecosystemFilter,
      tab: activeTab
    });
    // Implementar búsqueda real
  };

  const handleRefresh = () => {
    loadAtlasStats();
    // Refrescar datos de los componentes hijos
  };

  return (
    <div className="space-y-6">
      {/* Header con estadísticas y controles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <EmbeddedDisplay title={t('Stats.totalBuilders')} status="active">
          <div className="flex items-center justify-between">
            <div>
              {loading ? (
                <div className="animate-pulse h-6 w-16 bg-gray-800 rounded"></div>
              ) : (
                <p className="text-2xl font-mono-display font-bold text-gray-100 value-glow">
                  {stats?.totalBuilders}
                </p>
              )}
              <p className="text-[9px] text-gray-500 mt-1">{t('Stats.activeIdentities')}</p>
            </div>
            <Users className="w-8 h-8 text-reactor-cyan/30" />
          </div>
        </EmbeddedDisplay>

        <EmbeddedDisplay title={t('Stats.totalProjects')} status="active">
          <div className="flex items-center justify-between">
            <div>
              {loading ? (
                <div className="animate-pulse h-6 w-16 bg-gray-800 rounded"></div>
              ) : (
                <p className="text-2xl font-mono-display font-bold text-gray-100 value-glow">
                  {stats?.totalProjects}
                </p>
              )}
              <p className="text-[9px] text-gray-500 mt-1">{t('Stats.verifiedInitiatives')}</p>
            </div>
            <FolderGit2 className="w-8 h-8 text-reactor-cyan/30" />
          </div>
        </EmbeddedDisplay>

        <EmbeddedDisplay title={t('Stats.milestones')} status="active">
          <div className="flex items-center justify-between">
            <div>
              {loading ? (
                <div className="animate-pulse h-6 w-16 bg-gray-800 rounded"></div>
              ) : (
                <p className="text-2xl font-mono-display font-bold text-gray-100 value-glow">
                  {stats?.totalMilestones}
                </p>
              )}
              <p className="text-[9px] text-gray-500 mt-1">{t('Stats.immutableRecords')}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-reactor-cyan/30" />
          </div>
        </EmbeddedDisplay>

        <EmbeddedDisplay title={t('Stats.avgImpact')} status="active">
          <div className="flex items-center justify-between">
            <div>
              {loading ? (
                <div className="animate-pulse h-6 w-16 bg-gray-800 rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-mono-display font-bold text-gray-100 value-glow">
                    {stats?.avgImpactScore}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-1">{t('Stats.score100')}</p>
                </>
              )}
            </div>
            <div className="w-8 h-8 flex items-center justify-center bg-reactor-cyan/10 border border-reactor-cyan/20 rounded">
              <span className="text-xs font-bold text-reactor-cyan">AI</span>
            </div>
          </div>
        </EmbeddedDisplay>
      </div>

      {/* Panel de control de búsqueda y filtros */}
      <EmbeddedDisplay title={t('Control.title')} status="active" className="col-span-full">
        <div className="space-y-4">
          {/* Barra de búsqueda */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-reactor-cyan/50" />
              <input
                type="text"
                placeholder={t('Control.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-reactor-cyan/20 rounded-[2px] pl-10 pr-4 py-2 text-xs font-mono-display text-gray-100 focus:border-reactor-cyan/50 outline-none placeholder:text-gray-700"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-reactor-cyan/10 border border-reactor-cyan/20 text-reactor-cyan font-mono-display text-xs font-bold hover:bg-reactor-cyan/20 transition-colors"
            >
              {t('Control.search')}
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 border border-reactor-cyan/20 rounded-[2px] text-reactor-cyan/60 hover:text-reactor-cyan hover:bg-reactor-cyan/5 transition-all"
              title={t('Control.refresh')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono-display text-gray-500 mb-2 uppercase tracking-widest">
                <Filter className="w-3 h-3 inline mr-1" />
                {t('Control.category')}
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-black/40 border border-reactor-cyan/20 rounded-[2px] px-3 py-2 text-xs font-mono-display text-gray-100 focus:border-reactor-cyan/50 outline-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat} className="bg-gray-900">
                    {t(`Categories.${cat}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono-display text-gray-500 mb-2 uppercase tracking-widest">
                <Filter className="w-3 h-3 inline mr-1" />
                {t('Control.ecosystem')}
              </label>
              <select
                value={ecosystemFilter}
                onChange={(e) => setEcosystemFilter(e.target.value)}
                className="w-full bg-black/40 border border-reactor-cyan/20 rounded-[2px] px-3 py-2 text-xs font-mono-display text-gray-100 focus:border-reactor-cyan/50 outline-none"
              >
                {ecosystems.map(eco => (
                  <option key={eco} value={eco} className="bg-gray-900">
                    {eco.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono-display text-gray-500 mb-2 uppercase tracking-widest">
                {t('Control.viewMode')}
              </label>
              <div className="flex border border-reactor-cyan/20 rounded-[2px] overflow-hidden">
                <button
                  onClick={() => setActiveTab('builders')}
                  className={`flex-1 py-2 text-xs font-mono-display font-bold ${activeTab === 'builders'
                    ? 'bg-reactor-cyan/10 text-reactor-cyan border-r border-reactor-cyan/20'
                    : 'bg-black/20 text-gray-500 hover:bg-black/40'
                    }`}
                >
                  {t('Tabs.builders')}
                </button>
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`flex-1 py-2 text-xs font-mono-display font-bold ${activeTab === 'projects'
                    ? 'bg-reactor-cyan/10 text-reactor-cyan border-x border-reactor-cyan/20'
                    : 'bg-black/20 text-gray-500 hover:bg-black/40'
                    }`}
                >
                  {t('Tabs.projects')}
                </button>
                <button
                  onClick={() => setActiveTab('feed')}
                  className={`flex-1 py-2 text-xs font-mono-display font-bold ${activeTab === 'feed'
                    ? 'bg-reactor-cyan/10 text-reactor-cyan border-l border-reactor-cyan/20'
                    : 'bg-black/20 text-gray-500 hover:bg-black/40'
                    }`}
                >
                  {t('Tabs.feed')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </EmbeddedDisplay>

      {/* Contenido principal según pestaña activa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Ranking principal */}
        <div className="lg:col-span-2">
          {activeTab === 'builders' && (
            <div className="space-y-6">
              {selectedBuilderAddress ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedBuilderAddress(null)}
                    className="text-xs font-mono-display text-reactor-cyan hover:underline flex items-center gap-1 mb-2"
                  >
                    ← Back to Ranking
                  </button>
                  <RootstockBuilderScorecard address={selectedBuilderAddress} />
                </div>
              ) : (
                <EmbeddedDisplay title={t('Sections.topBuilders')} status="active">
                  <BuilderRanking
                    category={categoryFilter === 'all' ? undefined : categoryFilter}
                    ecosystem={ecosystemFilter === 'all' ? undefined : ecosystemFilter}
                    searchQuery={searchQuery}
                    onBuilderClick={(did) => {
                      // Extract address from DID (e.g. did:andromeda:rootstock:0x... or just raw 0x...)
                      const parts = did.split(':');
                      const address = parts[parts.length - 1];
                      if (address && address.startsWith('0x')) {
                        setSelectedBuilderAddress(address);
                      }
                    }}
                  />
                </EmbeddedDisplay>
              )}


              {ecosystemFilter === 'rootstock' && !selectedBuilderAddress && (
                <EmbeddedDisplay title="Rootstock Governance Ecosystem" status="active">
                  <RootstockProposals />
                </EmbeddedDisplay>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <EmbeddedDisplay title={t('Sections.topProjects')} status="active">
              <ProjectRanking
                category={categoryFilter === 'all' ? undefined : categoryFilter}
                ecosystem={ecosystemFilter === 'all' ? undefined : ecosystemFilter}
                searchQuery={searchQuery}
              />
            </EmbeddedDisplay>
          )}

          {activeTab === 'feed' && (
            <EmbeddedDisplay title={t('Sections.recentActivity')} status="active">
              <MilestoneFeed
                category={categoryFilter === 'all' ? undefined : categoryFilter}
                ecosystem={ecosystemFilter === 'all' ? undefined : ecosystemFilter}
                searchQuery={searchQuery}
              />
            </EmbeddedDisplay>
          )}
        </div>

        {/* Columna derecha: Información adicional */}
        <div className="space-y-6">
          <EmbeddedDisplay title={t('Sections.quickStats')} status="active">
            <div className="space-y-3">
              <StatItem label={t('QuickStats.buildersOnline')} value="24" change="+3" />
              <StatItem label={t('QuickStats.projectsToday')} value="8" change="+2" />
              <StatItem label={t('QuickStats.avgImpactToday')} value="82" change="+5" />
              <StatItem label={t('QuickStats.verificationRate')} value="94%" change="+2%" />
            </div>
          </EmbeddedDisplay>

          <EmbeddedDisplay title={t('Sections.topCategories')} status="active">
            <div className="space-y-2">
              {['defi', 'governance', 'infrastructure', 'refi', 'social'].map((cat, index) => (
                <div key={cat} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs font-mono-display text-gray-300">{t(`Categories.${cat}`)}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-reactor-cyan h-1.5 rounded-full"
                        style={{ width: `${80 - index * 15}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono-display font-bold text-gray-100">{80 - index * 15}</span>
                  </div>
                </div>
              ))}
            </div>
          </EmbeddedDisplay>

          <EmbeddedDisplay title={t('Sections.systemStatus')} status="active">
            <div className="space-y-3">
              <StatusItem label="ATLAS Search API" status="online" t={t} />
              <StatusItem label="MongoDB Indexes" status="optimized" t={t} />
              <StatusItem label="Vara Anchoring" status="active" t={t} />
              <StatusItem label="Data Sync" status="syncing" t={t} />
            </div>
          </EmbeddedDisplay>
        </div>
      </div>

      {/* Pie de página con información */}
      <div className="text-center">
        <p className="text-[9px] font-mono-display text-gray-600">
          {t('Footer')}
        </p>
      </div>
    </div>
  );
}

function StatItem({ label, value, change }: { label: string; value: string; change: string }) {
  const isPositive = change.startsWith('+');
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-mono-display text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono-display font-bold text-gray-100">{value}</span>
        <span className={`text-[10px] font-mono-display ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {change}
        </span>
      </div>
    </div>
  );
}

function StatusItem({ label, status, t }: { label: string; status: 'online' | 'offline' | 'syncing' | 'optimized' | 'active'; t: any }) {
  const statusConfig = {
    online: { color: 'bg-green-500', text: t('Status.online') },
    offline: { color: 'bg-red-500', text: t('Status.offline') },
    syncing: { color: 'bg-yellow-500 animate-pulse', text: t('Status.syncing') },
    optimized: { color: 'bg-reactor-cyan', text: t('Status.optimized') },
    active: { color: 'bg-green-500', text: t('Status.active') }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-mono-display text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
        <span className="text-[10px] font-mono-display font-bold text-gray-300">{config.text}</span>
      </div>
    </div>
  );
}