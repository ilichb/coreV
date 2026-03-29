"use client";
import { Suspense, useState, useEffect } from 'react';
import ScorecardForm from "@/components/coordination/scorecards/ScorecardForm";
import DashboardUnified from '@/components/layout/DashboardUnified';
import Link from 'next/link';
import { Activity, Beaker, ClipboardList, ShieldCheck, ArrowRight } from 'lucide-react';
import WalletConnector from '@/components/coordination/governance/WalletConnector';
import X402Gate from '@/components/andromeda/payments/X402Gate';
import { useTranslations } from 'next-intl';

// Componente de carga industrial
const InitializingCoordination = () => {
  const t = useTranslations('CoordinationPage');
  return (
    <div className="fixed inset-0 bg-[#0a0b0e] z-[100] flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="design-andromeda-core absolute inset-0 pointer-events-none"></div>
      <div className="relative group z-10">
        <div className="w-16 h-16 mb-8 border-2 border-reactor-cyan/20 rounded-full animate-spin border-t-reactor-cyan shadow-[0_0_30px_rgba(0,212,255,0.15)]" />
      </div>
      <div className="text-reactor-cyan text-mono text-[10px] tracking-[0.5em] animate-pulse flex items-center gap-3 z-10 uppercase font-bold">
        {t('Loading.initializing')}
      </div>
    </div>
  );
}

export default function CoordinationPage() {
  const t = useTranslations('CoordinationPage');
  const [mounted, setMounted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [paymentTxId, setPaymentTxId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <InitializingCoordination />;

  return (
    <DashboardUnified>
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
        {/* industrial Header */}
        <header className="relative border-b border-[#1e2430] pb-10 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <header className="border-l-2 border-reactor-cyan pl-6 py-1">
                <div className="flex items-center gap-3 text-reactor-cyan/50 text-[10px] text-mono tracking-[0.4em] mb-4 uppercase font-bold">
                  <span className="px-2 py-0.5 bg-reactor-cyan/10 border border-reactor-cyan/20 rounded-[1px]">
                    {t('Header.phase')}
                  </span>
                </div>
                <h2 className="title-orbitron text-4xl font-bold mb-4 drop-shadow-[0_0_15px_rgba(0,212,255,0.1)]">
                  {t('Header.title')}
                </h2>
                <p className="text-gray-500 font-sans text-sm max-w-2xl leading-relaxed italic opacity-80">
                  {t('Header.subtitle')}
                </p>
              </header>
            </div>

              <div className="flex flex-col md:flex-row items-center gap-6">
                <WalletConnector />
                
                {!isUnlocked ? (
                  <X402Gate 
                    scorecardId="PROTOCOL-INIT-V1" 
                    onUnlocked={(txId) => {
                      setIsUnlocked(true);
                      setPaymentTxId(txId);
                    }}
                    price="0.001 ALGO"
                  />
                ) : (
                  <div className="panel p-4 min-w-[200px] border-l-green-500/40 bg-green-500/5 transition-all animate-in zoom-in-95">
                    <div className="panel-corner tl !bg-green-500"></div>
                    <div className="panel-corner tr !bg-green-500"></div>
                    <div className="panel-corner bl !bg-green-500"></div>
                    <div className="panel-corner br !bg-green-500"></div>
                    <p className="text-[10px] text-green-500 text-mono uppercase tracking-[0.2em] font-bold mb-1">
                      PROTOCOL_UNLOCKED
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] text-gray-400 font-mono break-all opacity-60">TX: {paymentTxId}</span>
                    </div>
                  </div>
                )}
              </div>
          </div>

          {/* Sub-Navigation */}
          <nav className="flex items-center gap-8 mt-10">
            <Link
              href="/coordination"
              className="group flex items-center gap-2 text-[10px] text-mono font-bold text-reactor-cyan border-b border-reactor-cyan pb-3 tracking-[0.2em] uppercase"
            >
              <ClipboardList className="w-3 h-3" />
              {t('Nav.scorecard')}
            </Link>
            <Link
              href="/registry"
              className="group flex items-center gap-2 text-[10px] text-mono font-bold text-gray-500 hover:text-reactor-cyan transition-all pb-3 tracking-[0.2em] uppercase"
            >
              <Activity className="w-3 h-3" />
              {t('Nav.registry')}
            </Link>
            <Link
              href="/coordination/validate"
              className="group flex items-center gap-2 text-[10px] text-mono font-bold text-gray-500 hover:text-reactor-cyan transition-all pb-3 tracking-[0.2em] uppercase"
            >
              <ShieldCheck className="w-3 h-3" />
              {t('Nav.validate')}
            </Link>
          </nav>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-3">
            <div className="panel p-0 bg-[#0d0f14]/80 backdrop-blur-xl">
              <div className="panel-corner tl"></div>
              <div className="panel-corner tr"></div>
              <div className="panel-corner bl"></div>
              <div className="panel-corner br"></div>
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/10 to-transparent" />
              <ScorecardForm isUnlocked={isUnlocked} />
            </div>
          </div>

          {/* Sidebar Area */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Protocol Flow Container */}
            <div className="panel p-6 bg-[#0d0f14]">
              <div className="panel-corner tl"></div>
              <div className="panel-corner tr"></div>
              <div className="panel-corner bl"></div>
              <div className="panel-corner br"></div>
              <div className="flex items-center gap-3 mb-6">
                <Beaker className="w-4 h-4 text-reactor-cyan" />
                <h3 className="title-orbitron text-[11px] font-bold text-gray-300 tracking-[0.2em]">
                  {t('Flow.title')}
                </h3>
              </div>

              <div className="text-reactor-cyan/40 text-[9px] text-mono font-bold mt-4 flex items-center gap-4 uppercase">
                <span>{t('Header.protocolFee')}: 0.001 ETH</span>
                <span className="w-1 h-1 bg-white/10 rounded-full" />
                <span className="bg-amber-500/5 text-amber-500/60 px-2 py-0.5 rounded-[1px] border border-amber-500/20">
                  {t('Header.reimburse')}
                </span>
              </div>

              <div className="space-y-6 relative ml-4 border-l border-[#1e2430] pl-6 mt-8">
                {[
                  { id: '01', title: t('Flow.step1'), desc: t('Flow.step1Desc') },
                  { id: '02', title: t('Flow.step2'), desc: t('Flow.step2Desc') },
                  { id: '03', title: t('Flow.step3'), desc: t('Flow.step3Desc') },
                  { id: '04', title: t('Flow.step4'), desc: t('Flow.step4Desc') }
                ].map((step) => (
                  <div key={step.id} className="relative group">
                    <div className="absolute -left-[31px] top-1 w-2 h-2 rounded-full bg-[#0a0b0e] border border-reactor-cyan/30 group-hover:border-reactor-cyan group-hover:shadow-[0_0_8px_rgba(0,212,255,0.4)] transition-all duration-300" />
                    <h4 className="text-[10px] text-mono font-bold text-reactor-cyan opacity-80 tracking-widest uppercase">{step.title}</h4>
                    <p className="text-[9px] text-gray-600 font-sans uppercase mt-1 tracking-wider leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-[#1e2430] space-y-3">
                <p className="text-[9px] text-gray-600 text-mono uppercase tracking-[0.15em] font-bold">{t('Flow.supportedNetworks')}</p>
                <div className="flex flex-wrap gap-2">
                  {['ETH', 'POL', 'AVA', 'SOL'].map(chain => (
                    <span key={chain} className="px-2 py-0.5 bg-reactor-cyan/5 border border-reactor-cyan/10 text-[9px] text-mono text-reactor-cyan/60 rounded-[1px] uppercase tracking-tighter">
                      {chain}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick API Links */}
            <div className="panel p-6 bg-[#0d0f14]">
              <div className="panel-corner tl"></div>
              <div className="panel-corner tr"></div>
              <div className="panel-corner bl"></div>
              <div className="panel-corner br"></div>
              <h3 className="title-orbitron text-[11px] font-bold text-gray-400 tracking-[0.2em] mb-4">
                {t('Api.title')}
              </h3>
              <div className="space-y-2">
                {[
                  { label: t('actions.testChallenge'), path: '/api/coordination/challenge', color: 'border-reactor-cyan/10 text-reactor-cyan hover:bg-reactor-cyan/5' },
                  { label: t('Nav.validate'), path: '/api/coordination/validate', color: 'border-green-500/10 text-green-500 hover:bg-green-500/5' },
                  { label: t('actions.submitRegistry'), path: '/api/coordination/publish', color: 'border-purple-500/10 text-purple-500 hover:bg-purple-500/5' }
                ].map(api => (
                  <a
                    key={api.label}
                    href={api.path}
                    target="_blank"
                    className={`block p-3 rounded-[1px] border ${api.color} transition-all duration-200 group relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-[9px] text-mono font-bold tracking-[0.15em] uppercase">{api.label}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* industrial Footer */}
        <footer className="mt-20 pt-10 border-t border-[#1e2430]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            <div>
              <h4 className="title-orbitron text-[10px] font-bold text-gray-500 mb-4 opacity-60 tracking-[0.3em]">{t('Footer.originStatus')}</h4>
              <p className="text-[11px] text-gray-600 text-mono uppercase leading-relaxed tracking-wider">
                Andromeda Core v1.0<br />{t('Footer.foundational')}<br />{t('Footer.status')}
              </p>
            </div>
            <div>
              <h4 className="title-orbitron text-[10px] font-bold text-reactor-cyan/60 mb-4 tracking-[0.3em]">{t('Footer.coreMetric')}</h4>
              <p className="title-orbitron text-2xl font-bold text-gray-300 tracking-tighter mb-1 select-none">{t('Footer.clarityDelta')}</p>
              <p className="text-[9px] text-gray-600 text-mono uppercase tracking-[0.2em] font-bold">{t('Footer.validationStandard')}</p>
            </div>
            <div>
              <h4 className="title-orbitron text-[10px] font-bold text-gray-500 mb-4 opacity-60 tracking-[0.3em]">{t('Footer.nextDirectives')}</h4>
              <p className="text-[11px] text-gray-600 text-mono uppercase leading-relaxed tracking-wider">
                {t('Footer.governance')}<br />{t('Footer.multisig')}<br />{t('Footer.orchestration')}
              </p>
            </div>
          </div>
          <div className="text-center mt-16 pb-12">
            <span className="text-[9px] text-mono text-gray-700 tracking-[0.5em] uppercase opacity-40 font-bold">
              © 2024 ANDROMEDA_COMPUTER // {t('phrases.allProcessesOnChainVerifiable')}
            </span>
          </div>
        </footer>
      </div>
    </DashboardUnified>
  );
}
