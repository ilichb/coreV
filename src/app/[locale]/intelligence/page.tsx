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
  const [activityLog, setActivityLog] = useState<string[]>([]);

  const [telemetry, setTelemetry] = useState<any>(null);

  // Derived integration statuses (only real ecosystems we have data for)
  const integrationStatus = telemetry ? [
    {
      eco: 'Rootstock',
      status: telemetry.ecosystems?.rootstock?.status === 'synced' ? 'synced' :
              telemetry.ecosystems?.rootstock?.status === 'error' ? 'error' : 'syncing',
      last: telemetry.ecosystems?.rootstock?.builders
        ? `${telemetry.ecosystems.rootstock.builders} builders` 
        : t('SystemStatus.syncing')
    },
    {
      eco: 'MongoDB',
      status: telemetry.systemStatus?.database === 'online' ? 'synced' : 'error',
      last: telemetry.systemStatus?.databaseDetail || t('SystemStatus.syncing')
    },
    {
      eco: 'ATLAS API',
      status: telemetry.systemStatus?.apiGateway === 'operational' ? 'synced' : 'error',
      last: t('DataSources.last24h')
    },
  ] : [
    { eco: 'Rootstock', status: 'syncing', last: t('SystemStatus.syncing') },
    { eco: 'MongoDB', status: 'syncing', last: t('SystemStatus.syncing') },
    { eco: 'ATLAS API', status: 'syncing', last: t('SystemStatus.syncing') },
  ];

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load real telemetry data on mount
  useEffect(() => {
    const loadTelemetry = async () => {
      try {
        const res = await fetch('/api/intelligence/telemetry');
        const data = await res.json();
        if (data.success) {
          setTelemetry(data.telemetry);
          // Seed the activity log with real system facts
          const now = new Date().toLocaleTimeString();
          const logs = [
            `[${now}] ${t('Logs.initializing')}`,
          ];
          if (data.telemetry.dataSources?.totalMilestones) {
            logs.push(`[${now}] ${data.telemetry.dataSources.totalMilestones} milestones indexed in ATLAS`);
          }
          if (data.telemetry.dataSources?.uniqueBuilders) {
            logs.push(`[${now}] ${data.telemetry.dataSources.uniqueBuilders} unique builders tracked`);
          }
          if (data.telemetry.ecosystems?.rootstock?.builders) {
            logs.push(`[${now}] Rootstock: ${data.telemetry.ecosystems.rootstock.builders} builders · ${data.telemetry.ecosystems.rootstock.proposals || 0} on-chain proposals`);
          }
          if (data.telemetry.dataSources?.verifiedCount) {
            logs.push(`[${now}] ${data.telemetry.dataSources.verifiedCount} AVIP-verified milestones`);
          }
          setActivityLog(logs);
        }
      } catch (e) {
        setActivityLog([`[${new Date().toLocaleTimeString()}] ${t('Logs.established')}`]);
      }
    };
    if (mounted) loadTelemetry();
  }, [mounted]);


  return (
    <DashboardUnified>
      <div className="space-y-6 pb-20 p-6">

        {/* TOP ROW: System Clock + Quick Stats */}
        <div className="grid grid-cols-12 gap-4">
          {/* System Clock */}
          <div className="col-span-12 lg:col-span-4">
            <div className="panel p-4 h-full panel-primary">
              <div className="panel-corner tl"></div>
              <div className="panel-corner tr"></div>
              <div className="panel-corner bl"></div>
              <div className="panel-corner br"></div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-mono font-bold text-gray-500 tracking-wider uppercase">{t('Clock.systemTime')}</span>
                <Radio className="w-3 h-3 text-reactor-cyan animate-pulse" />
              </div>
              <div className="title-orbitron text-4xl font-bold tabular-nums tracking-tighter min-h-[36px]">
                {mounted ? currentTime.toLocaleTimeString(locale) : '--:--:--'}
              </div>
              <div className="text-[10px] text-gray-500 text-mono mt-1 min-h-[15px] uppercase tracking-widest">
                {mounted ? currentTime.toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '--------, ---- --, ----'}
              </div>
            </div>
          </div>

          {/* Connection Status LEDs */}
          <div className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-3 gap-3 h-full">
              {integrationStatus.map((status) => (
                <ConnectionLED
                  key={status.eco}
                  ecosystem={status.eco}
                  status={status.status as any}
                  lastSync={status.last}
                />
              ))}
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
                  {activityLog.map((log, idx) => {
                    const logLower = log.toLowerCase();
                    const isError = logLower.includes('error') || logLower.includes('failed') || logLower.includes('rejeitado') || logLower.includes('rechazado');
                    const isSuccess = logLower.includes('completed') || logLower.includes('passed') || logLower.includes('confirmed') || logLower.includes('completada') || logLower.includes('concluída') || logLower.includes('aprobado') || logLower.includes('confirmada');
                    const isWarning = logLower.includes('spike') || logLower.includes('detected') || logLower.includes('detectado');

                    return (
                      <div
                        key={idx}
                        className={`text-[10px] font-mono-display leading-relaxed flex items-start gap-2 p-1.5 rounded-[2px] transition-all
                          ${isError ? 'text-warning-orange bg-warning-orange/5' :
                            isSuccess ? 'text-green-400 bg-green-400/5' :
                              isWarning ? 'text-yellow-400 bg-yellow-400/5' :
                                'text-gray-500 hover:bg-white/5'}`}
                        style={{
                          animation: idx === 0 ? 'slideIn 0.3s ease-out' : 'none',
                          opacity: Math.max(0.3, 1 - (idx * 0.05))
                        }}
                      >
                        <Activity className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{log}</span>
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
              {/* SYSTEM STATUS */}
              <div className="col-span-2 lg:col-span-1">
                <EmbeddedDisplay title={t('Titles.status')} status="active" className="h-full">
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-black/20 rounded-[2px]">
                      <span className="text-xs text-gray-500 font-mono-display">{t('SystemStatus.coreServices')}</span>
                      <span className="text-xs text-green-400 font-mono-display font-bold flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        {t('SystemStatus.operational')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-black/20 rounded-[2px]">
                      <span className="text-xs text-gray-500 font-mono-display">{t('SystemStatus.database')}</span>
                      <span className="text-xs text-reactor-cyan font-mono-display font-bold flex items-center gap-1">
                        <span className="w-2 h-2 bg-reactor-cyan rounded-full animate-pulse" />
                        {t('SystemStatus.syncing')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-black/20 rounded-[2px]">
                      <span className="text-xs text-gray-500 font-mono-display">{t('SystemStatus.apiGateway')}</span>
                      <span className="text-xs text-green-400 font-mono-display font-bold flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        {t('SystemStatus.healthy')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-black/20 rounded-[2px]">
                      <span className="text-xs text-gray-500 font-mono-display">{t('SystemStatus.realDataFlow')}</span>
                      <span className="text-xs text-green-400 font-mono-display font-bold flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        {t('SystemStatus.active')}
                      </span>
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

        {/* THIRD ROW: Data Sources and Connectivity */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <EmbeddedDisplay title={t('Titles.connectivity')} status="active">
              <div className="p-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-black/20 rounded-[2px]">
                    <div className="text-xs text-gray-500 font-mono-display mb-1">{t('DataSources.arbitrum')}</div>
                    <div className="text-xl font-bold text-white font-mono-display">4</div>
                    <div className="text-[10px] text-green-400 mt-1">{t('DataSources.connectedTally')}</div>
                  </div>
                  <div className="text-center p-3 bg-black/20 rounded-[2px]">
                    <div className="text-xs text-gray-500 font-mono-display mb-1">{t('DataSources.optimism')}</div>
                    <div className="text-xl font-bold text-white font-mono-display">3</div>
                    <div className="text-[10px] text-green-400 mt-1">{t('DataSources.connectedTally')}</div>
                  </div>
                  <div className="text-center p-3 bg-black/20 rounded-[2px]">
                    <div className="text-xs text-gray-500 font-mono-display mb-1">{t('DataSources.snapshot')}</div>
                    <div className="text-xl font-bold text-white font-mono-display">9</div>
                    <div className="text-[10px] text-reactor-cyan mt-1">{t('DataSources.monitored')}</div>
                  </div>
                  <div className="text-center p-3 bg-black/20 rounded-[2px]">
                    <div className="text-xs text-gray-500 font-mono-display mb-1">{t('DataSources.proposals')}</div>
                    <div className="text-xl font-bold text-white font-mono-display">23</div>
                    <div className="text-[10px] text-yellow-400 mt-1">{t('DataSources.last24h')}</div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500 font-mono-display">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>{t('DataSources.activeConnections')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-reactor-cyan rounded-full animate-pulse"></div>
                    <span>{t('DataSources.networkGraphNote')}</span>
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
