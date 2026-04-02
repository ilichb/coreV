'use client';

import DashboardUnified from '@/components/layout/DashboardUnified';
import EmbeddedDisplay from '@/components/widgets/EmbeddedDisplay';
import { SyncManager } from '@/components/intelligence/SyncManager';
import { SystemMetrics } from '@/components/intelligence/SystemMetrics';
import { ConnectionLED } from '@/components/ui/ConnectionLED';
import { Activity, Radio, TrendingUp, Beaker } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProjectScorecards } from '@/components/intelligence/ProjectScorecards';
import NetworkGraph from '@/components/intelligence/NetworkGraph';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

export default function IntelligencePage() {
  const t = useTranslations('IntelligencePage');
  const params = useParams();
  const locale = params.locale as string;
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activityLog, setActivityLog] = useState<Array<{ts:string;level:string;msg:string}>>([]);

  const [telemetry, setTelemetry] = useState<any>(null);

  // Real ecosystems data - only blockchain ecosystems
  const realEcosystems = telemetry?.ecosystems ? [
    {
      name: 'Rootstock',
      status: telemetry.ecosystems.rootstock?.status === 'synced' ? 'connected' :
        telemetry.ecosystems.rootstock?.status === 'error' ? 'error' : 'pending',
      data: telemetry.ecosystems.rootstock || {},
      icon: telemetry.ecosystems.rootstock?.status === 'synced' ? '🟢' :
        telemetry.ecosystems.rootstock?.status === 'error' ? '🔴' : '🟡',
      description: 'On-chain governance',
      type: 'blockchain'
    },
    {
      name: 'Arbitrum',
      status: telemetry.ecosystems.arbitrum?.status === 'synced' ? 'connected' :
        telemetry.ecosystems.arbitrum?.status === 'error' ? 'error' : 'pending',
      data: telemetry.ecosystems.arbitrum || {},
      icon: telemetry.ecosystems.arbitrum?.status === 'synced' ? '🟢' :
        telemetry.ecosystems.arbitrum?.status === 'error' ? '🔴' : '🟡',
      description: 'DAO proposals',
      type: 'blockchain'
    },
    {
      name: 'Optimism',
      status: telemetry.ecosystems.optimism?.status === 'synced' ? 'connected' :
        telemetry.ecosystems.optimism?.status === 'error' ? 'error' : 'pending',
      data: telemetry.ecosystems.optimism || {},
      icon: telemetry.ecosystems.optimism?.status === 'synced' ? '🟢' :
        telemetry.ecosystems.optimism?.status === 'error' ? '🔴' : '🟡',
      description: 'Collective decisions',
      type: 'blockchain'
    },
    {
      name: 'Snapshot',
      status: 'connected',
      data: {},
      icon: '🔵',
      description: 'Off-chain voting',
      type: 'governance'
    },
    {
      name: 'Algorand',
      status: 'disconnected',
      data: {},
      icon: '⚫',
      description: 'Governance (soon)',
      type: 'blockchain'
    },
  ] : [
    { name: 'Rootstock', status: 'pending', data: {}, icon: '🟡', description: 'On-chain governance', type: 'blockchain' },
    { name: 'Arbitrum', status: 'pending', data: {}, icon: '🟡', description: 'DAO proposals', type: 'blockchain' },
    { name: 'Optimism', status: 'pending', data: {}, icon: '🟡', description: 'Collective decisions', type: 'blockchain' },
    { name: 'Snapshot', status: 'pending', data: {}, icon: '🔵', description: 'Off-chain voting', type: 'governance' },
    { name: 'Algorand', status: 'disconnected', data: {}, icon: '⚫', description: 'Governance (soon)', type: 'blockchain' },
  ];

  // Count connected vs pending
  const connectedCount = realEcosystems.filter(e => e.status === 'connected').length;
  const pendingCount = realEcosystems.filter(e => e.status === 'pending').length;
  const disconnectedCount = realEcosystems.filter(e => e.status === 'disconnected').length;

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar actividad real y hacer polling cada 15 segundos
  useEffect(() => {
    const loadActivity = async () => {
      try {
        const res = await fetch('/api/intelligence/activity');
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          // Prepend new events, keep rolling window of 30
          setActivityLog(prev => {
            const merged = [...data.events, ...prev];
            // Deduplicate by msg+ts
            const seen = new Set<string>();
            return merged
              .filter(e => {
                const key = `${e.ts}|${e.msg}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .slice(0, 30);
          });
        }
      } catch {
        // silently fail — no interrumpir la UI
      }
    };

    if (mounted) {
      loadActivity(); // carga inicial
      const interval = setInterval(loadActivity, 15000); // polling 15s
      return () => clearInterval(interval);
    }
  }, [mounted]);


  // Cargar telemetría real y hacer polling cada 30 segundos
  useEffect(() => {
    const loadTelemetry = async () => {
      try {
        const res = await fetch("/api/intelligence/telemetry");
        const data = await res.json();
        if (data.success && data.telemetry) {
          setTelemetry(data.telemetry);
        }
      } catch {
        // silently fail
      }
    };
    if (mounted) {
      loadTelemetry();
      const interval = setInterval(loadTelemetry, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  return (
    <DashboardUnified>
      <div className="space-y-6 pb-20 p-6">

        {/* TOP ROW: System Status & Ecosystems */}
        <div className="grid grid-cols-12 gap-4">
          {/* Compact System Clock with Live Status */}
          <div className="col-span-12 lg:col-span-3">
            <div className="panel p-4 h-full panel-primary">
              <div className="panel-corner tl"></div>
              <div className="panel-corner tr"></div>
              <div className="panel-corner bl"></div>
              <div className="panel-corner br"></div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-mono font-bold text-gray-500 tracking-wider uppercase">{t('LiveStatus.title')}</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Radio className="w-3 h-3 text-reactor-cyan" />
                </div>
              </div>

              <div className="space-y-2">
                {/* Time Display - Compact */}
                <div className="flex items-baseline gap-2">
                  <div className="title-orbitron text-2xl font-bold tabular-nums tracking-tighter">
                    {mounted ? currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>
                  <div className="text-[10px] text-gray-500 text-mono uppercase">
                    {mounted ? currentTime.toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : '-- ---'}
                  </div>
                </div>

                {/* Last Data Sync */}
                <div className="pt-2 border-t border-gray-800">
                  <div className="text-[9px] text-mono text-gray-500 uppercase tracking-wider mb-1">{t('LiveStatus.lastSync')}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-mono">
                      {telemetry?.lastSync
                        ? new Date(telemetry.lastSync).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[1px] ${telemetry?.syncStatus === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : telemetry?.syncStatus === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-800 text-gray-400'
                      }`}>
                      {telemetry?.syncStatus?.toUpperCase() || t('LiveStatus.idle')}
                    </span>
                  </div>
                </div>

                {/* Active Connections */}
                <div className="pt-2">
                  <div className="text-[9px] text-mono text-gray-500 uppercase tracking-wider mb-1">{t('LiveStatus.activeConnections')}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-300">{t('LiveStatus.api')}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-reactor-cyan rounded-full"></div>
                      <span className="text-xs text-gray-300">{t('LiveStatus.data')}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs text-gray-300">{t('LiveStatus.sync')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ecosystems Panel - Scrollable */}
          <div className="col-span-12 lg:col-span-9">
            <div className="panel p-4 h-full">
              <div className="panel-corner tl"></div>
              <div className="panel-corner tr"></div>
              <div className="panel-corner bl"></div>
              <div className="panel-corner br"></div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] text-mono font-bold text-gray-500 tracking-wider uppercase">{t('Ecosystems.title')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-mono text-gray-500">{t('Ecosystems.scrollHint')}</span>
                  <div className="w-6 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="w-1/3 h-full bg-reactor-cyan animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Scrollable Ecosystems Grid */}
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-3 min-w-max">
                  {realEcosystems.map((eco, idx) => (
                    <div
                      key={idx}
                      className={`flex-shrink-0 w-48 p-3 rounded-[4px] border transition-all ${eco.status === 'connected'
                        ? 'border-green-500/30 bg-green-500/5'
                        : eco.status === 'pending'
                          ? 'border-yellow-500/30 bg-yellow-500/5'
                          : eco.status === 'error'
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-gray-800 bg-gray-900/50'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{eco.icon}</span>
                          <span className="text-sm font-bold text-white">{eco.name}</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${eco.status === 'connected' ? 'bg-green-500 animate-pulse' :
                          eco.status === 'pending' ? 'bg-yellow-500' :
                            eco.status === 'error' ? 'bg-red-500' :
                              'bg-gray-700'
                          }`}></div>
                      </div>

                      <div className="text-[10px] text-gray-400 mb-2">{eco.description}</div>

                      {/* Real Data when available */}
                      {['Rootstock', 'Arbitrum', 'Optimism'].includes(eco.name) && eco.status === 'connected' && eco.data && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-gray-500">Builders:</span>
                            <span className="text-white">{eco.data.builders || '--'}</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-gray-500">Proposals:</span>
                            <span className="text-white">{eco.data.proposals || 0}</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-gray-500">Last sync:</span>
                            <span className="text-reactor-cyan">
                              {eco.data.lastSync
                                ? new Date(eco.data.lastSync).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                                : t('LiveStatus.api')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Placeholder for other ecosystems or disconnected states */}
                      {(!['Rootstock', 'Arbitrum', 'Optimism'].includes(eco.name) || eco.status !== 'connected') && (
                        <div className="text-[9px] text-gray-600 text-center py-1">
                          {eco.status === 'connected' ? t('Ecosystems.monitoringActive') :
                            eco.status === 'pending' ? t('Ecosystems.connectionPending') :
                              eco.status === 'error' ? t('Ecosystems.connectionError') :
                                t('Ecosystems.notConfigured')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Connection Summary */}
              <div className="mt-4 pt-3 border-t border-gray-800">
                <div className="flex items-center justify-between text-[10px] text-mono">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400">{t('Ecosystems.connected', { count: connectedCount })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-400">{t('Ecosystems.pending', { count: pendingCount })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-700 rounded-full"></div>
                      <span className="text-gray-400">{t('Ecosystems.offline', { count: disconnectedCount })}</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="col-span-12">
          <EmbeddedDisplay title={t('Titles.telemetry')} className="min-h-[180px]">
            <div className="p-2">
              <SystemMetrics />
            </div>
          </EmbeddedDisplay>
        </div>

        {/* MAIN CONTENT ROW - REFACTORIZADO PARA MEJOR VISIBILIDAD */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Sync Manager */}
          <div className="col-span-12 lg:col-span-5">
            <EmbeddedDisplay title={t('Titles.bridge')} status="active">
              <div className="p-2">
                <SyncManager />
              </div>
            </EmbeddedDisplay>
          </div>

          {/* Middle Column: Network Graph */}
          <div className="col-span-12 lg:col-span-7">
            <div className="h-full">
              <NetworkGraph maxNodes={12} animate={true} />
            </div>
          </div>
        </div>

        {/* SECOND ROW: Activity Monitor (MOVIDO A POSICIÓN SUPERIOR/CENTRAL) */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Activity Monitor */}
          <div className="col-span-12 lg:col-span-4">
            <EmbeddedDisplay title={t('Titles.monitor')} status="active">
              <div className="h-[300px] overflow-y-auto custom-scrollbar">
                <div className="space-y-1.5 p-2">
                  {activityLog.map((log: any, idx: number) => {
                    const isObj = typeof log === 'object' && log !== null;
                    const text: string = isObj ? `[${log.ts}] ${log.msg}` : log;
                    const level: string = isObj ? log.level : (
                      text.toLowerCase().includes('error') || text.toLowerCase().includes('fail') ? 'error' :
                      text.toLowerCase().includes('verified') || text.toLowerCase().includes('synced') ? 'success' :
                      text.toLowerCase().includes('spike') || text.toLowerCase().includes('warn') ? 'warn' : 'info'
                    );

                    return (
                      <div
                        key={idx}
                        className={`text-[10px] font-mono-display leading-relaxed flex items-start gap-2 p-1.5 rounded-[2px] transition-all
                          ${level === 'error'   ? 'text-warning-orange bg-warning-orange/5' :
                            level === 'success' ? 'text-green-400 bg-green-400/5' :
                            level === 'warn'    ? 'text-yellow-400 bg-yellow-400/5' :
                                                 'text-gray-500 hover:bg-white/5'}`}
                        style={{
                          animation: idx === 0 ? 'slideIn 0.3s ease-out' : 'none',
                          opacity: Math.max(0.3, 1 - (idx * 0.04))
                        }}
                      >
                        <Activity className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </EmbeddedDisplay>
          </div>


          {/* Right Column: SYSTEM STATUS alineado horizontalmente */}
          <div className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* REAL-TIME DATA STATUS */}
              <div className="col-span-2 lg:col-span-1">
                <EmbeddedDisplay title={t('RealTimeData.title')} status="active" className="h-full">
                  <div className="p-4 space-y-3">
                    {/* Rootstock Data Status */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-mono-display">{t('RealTimeData.rootstockData')}</span>
                        <span className="text-xs text-green-400 font-mono-display font-bold flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          {t('RealTimeData.live')}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono pl-1">
                        {telemetry?.ecosystems?.rootstock?.proposals
                          ? `${telemetry.ecosystems.rootstock.proposals} proposals`
                          : t('RealTimeData.fetchingData')}
                      </div>
                    </div>

                    {/* Data Processing Pipeline */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-mono-display">{t('RealTimeData.processingPipeline')}</span>
                        <span className={`text-xs font-mono-display font-bold flex items-center gap-1 ${
                          telemetry?.systemStatus?.dataFlow === 'active' ? 'text-reactor-cyan' : 'text-yellow-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full animate-pulse ${
                            telemetry?.systemStatus?.dataFlow === 'active' ? 'bg-reactor-cyan' : 'bg-yellow-400'
                          }`} />
                          {telemetry?.systemStatus?.dataFlow === 'active' ? t('RealTimeData.active') : t('RealTimeData.unknown')}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono pl-1">
                        IPFS → MongoDB ({telemetry?.systemStatus?.database === 'online' ? '✓' : '✗'}) → Redis ({telemetry?.systemStatus?.redis === 'online' ? '✓' : '~'})
                      </div>
                    </div>

                    {/* API Connectivity */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-mono-display">{t('RealTimeData.externalApis')}</span>
                        <span className={`text-xs font-mono-display font-bold flex items-center gap-1 ${
                          telemetry?.externalApis?.thegraph === 'operational' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full animate-pulse ${
                            telemetry?.externalApis?.thegraph === 'operational' ? 'bg-green-400' : 'bg-yellow-400'
                          }`} />
                          {telemetry?.externalApis?.thegraph === 'operational' ? t('RealTimeData.connected') : t('RealTimeData.unknown')}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono pl-1">
                        Tally ({telemetry?.externalApis?.tally ?? '…'}) · Pinata ({telemetry?.externalApis?.ipfs ?? '…'}) · The Graph ({telemetry?.externalApis?.thegraph ?? '…'})
                      </div>
                    </div>

                    {/* Data Freshness */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-mono-display">{t('RealTimeData.dataFreshness')}</span>
                        <span className={`text-xs font-mono-display font-bold flex items-center gap-1 ${telemetry?.lastSync && (Date.now() - new Date(telemetry.lastSync).getTime()) < 300000
                          ? 'text-green-400'
                          : 'text-yellow-400'
                          }`}>
                          <span className={`w-2 h-2 rounded-full ${telemetry?.lastSync && (Date.now() - new Date(telemetry.lastSync).getTime()) < 300000
                            ? 'bg-green-400 animate-pulse'
                            : 'bg-yellow-400'
                            }`} />
                          {telemetry?.lastSync
                            ? `${Math.floor((Date.now() - new Date(telemetry.lastSync).getTime()) / 60000)} ${t('RealTimeData.minAgo')}`
                            : t('RealTimeData.unknown')}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono pl-1">
                        {t('RealTimeData.lastSyncLabel')} {telemetry?.lastSync
                          ? new Date(telemetry.lastSync).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </div>
                    </div>
                  </div>
                </EmbeddedDisplay>
              </div>

              {/* DETECTED PROJECT SCORECARDS */}
              <div className="col-span-2 lg:col-span-1">
                <EmbeddedDisplay title={t('Titles.scorecards')} status="active" className="h-full">
                  <ProjectScorecards />
                </EmbeddedDisplay>
              </div>
            </div>
          </div>
        </div>

        {/* THIRD ROW: Real Data Sources */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <EmbeddedDisplay title={t('DataSources.title')} status="active">
              <div className="p-4">
                <div className="grid grid-cols-4 gap-4">
                  {/* Rootstock Data */}
                  <div className="text-center p-3 bg-black/20 rounded-[2px] border border-green-500/20">
                    <div className="text-xs text-gray-500 font-mono-display mb-1">{t('DataSources.rootstock')}</div>
                    <div className="text-xl font-bold text-white font-mono-display">
                      {telemetry?.ecosystems?.rootstock?.proposals !== undefined ? telemetry.ecosystems.rootstock.proposals : '--'}
                    </div>
                    <div className="text-[10px] text-green-400 mt-1">{t('DataSources.onChainProposals')}</div>
                    <div className="text-[9px] text-gray-500 mt-1">
                      {telemetry?.ecosystems?.rootstock?.builders
                        ? `${telemetry.ecosystems.rootstock.builders} ${t('DataSources.activeBuilders')}`
                        : t('DataSources.fetching')}
                    </div>
                  </div>

                  {/* IPFS Storage */}
                  <div className="text-center p-3 bg-black/20 rounded-[2px] border border-reactor-cyan/20">
                    <div className="text-xs text-gray-500 font-mono-display mb-1">{t('DataSources.ipfsStorage')}</div>
                    <div className="text-xl font-bold text-white font-mono-display">
                      {telemetry?.dataSources?.totalMilestones ?? '--'}
                    </div>
                    <div className="text-[10px] text-reactor-cyan mt-1">{t('DataSources.milestonesStored')}</div>
                    <div className="text-[9px] text-gray-500 mt-1">
                      {telemetry?.dataSources?.verifiedCount
                        ? `${telemetry.dataSources.verifiedCount} verified`
                        : t('DataSources.pinataConnected')}
                    </div>
                  </div>

                  {/* Builders Network */}
                  <div className="text-center p-3 bg-black/20 rounded-[2px] border border-yellow-500/20">
                    <div className="text-xs text-gray-500 font-mono-display mb-1">{t('DataSources.buildersNetwork')}</div>
                    <div className="text-xl font-bold text-white font-mono-display">
                      {telemetry?.dataSources?.uniqueBuilders || '--'}
                    </div>
                    <div className="text-[10px] text-yellow-400 mt-1">{t('DataSources.activeBuilders')}</div>
                    <div className="text-[9px] text-gray-500 mt-1">
                      {telemetry?.dataSources?.totalProjects
                        ? `${telemetry.dataSources.totalProjects} projects`
                        : t('DataSources.atlasNetwork')}
                    </div>
                  </div>

                  {/* API Health */}
                  <div className="text-center p-3 bg-black/20 rounded-[2px] border border-blue-500/20">
                    <div className="text-xs text-gray-500 font-mono-display mb-1">{t('DataSources.apiHealth')}</div>
                    <div className="text-xl font-bold text-white font-mono-display">
                      {telemetry?.systemStatus?.apiGateway === 'operational' ? '100%' : '--'}
                    </div>
                    <div className="text-[10px] text-blue-400 mt-1">{t('DataSources.uptime')}</div>
                    <div className="text-[9px] text-gray-500 mt-1">
                      Tally · The Graph · External
                    </div>
                  </div>
                </div>

                {/* Connection Status Summary */}
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-400">{t('DataSources.liveData')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-reactor-cyan rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-400">IPFS: {telemetry?.dataSources?.totalMilestones || 0} milestones</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-xs text-gray-400">{t('DataSources.pendingEcosystems')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-400">{t('DataSources.apisConnected')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">{t('DataSources.lastUpdate')}</div>
                      <div className="text-xs text-white font-mono">
                        {telemetry?.lastSync
                          ? new Date(telemetry.lastSync).toLocaleTimeString(locale, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })
                          : '--:--:--'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </EmbeddedDisplay>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 240, 255, 0.3);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 240, 255, 0.5);
        }
      `}</style>
    </DashboardUnified>
  );
}
