"use client";
import { Suspense, useState, useEffect } from 'react';
import ScorecardForm from "@/components/coordination/scorecards/ScorecardForm";
import DashboardUnified from '@/components/layout/DashboardUnified';
import Link from 'next/link';
import { Activity, Beaker, ClipboardList, ShieldCheck } from 'lucide-react';
import WalletConnector from '@/components/coordination/governance/WalletConnector';

// Componente de carga industrial
function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-reactor-cyan/30 border-t-reactor-cyan rounded-full animate-spin"></div>
        <div className="text-sm font-mono-display text-reactor-cyan animate-pulse tracking-[0.2em]">
          INITIALIZING_COORDINATION_LAYER...
        </div>
      </div>
    </div>
  );
}

export default function CoordinationPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <Loading />;

  return (
    <DashboardUnified>
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
        {/* industrial Header */}
        <header className="relative border-b border-reactor-cyan/20 pb-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-reactor-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse" />
                <span className="text-[10px] font-mono-display font-medium text-reactor-cyan bg-reactor-cyan/10 border border-reactor-cyan/20 px-3 py-1 rounded-[2px] tracking-widest leading-none">
                  PHASE_01: COORDINATION_PROTOCOLS
                </span>
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl font-mono-display font-bold text-gray-100 tracking-tighter mb-2">
                  COORDINATION <span className="text-reactor-cyan">LAYER</span>
                </h1>
                <p className="text-gray-500 font-mono-display text-xs max-w-2xl leading-relaxed uppercase tracking-wider">
                  Transformation of collective intent into technically comparable artifacts.
                  <span className="text-reactor-cyan/60 ml-2">// FORMAT_IS_THE_PRODUCT</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6">
              <WalletConnector />
              <div className="flex flex-col items-end gap-2 bg-black/40 border border-reactor-cyan/10 p-4 rounded-[2px] min-w-[200px]">
                <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest">Protocol Fee</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono-display font-bold text-gray-100 tabular-nums">250</span>
                  <span className="text-xs text-reactor-cyan font-bold font-mono-display">USDC</span>
                </div>
                <p className="text-[9px] text-reactor-cyan/60 font-mono-display">REIMBURSE_80%_ON_REJECTION</p>
              </div>
            </div>
          </div>

          {/* Sub-Navigation */}
          <nav className="flex items-center gap-6 mt-8">
            <Link
              href="/coordination"
              className="group flex items-center gap-2 text-[10px] font-mono-display font-bold text-reactor-cyan border-b-2 border-reactor-cyan pb-2 tracking-widest"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              SCORECARD
            </Link>
            <Link
              href="/registry"
              className="group flex items-center gap-2 text-[10px] font-mono-display font-bold text-gray-500 hover:text-reactor-cyan transition-all pb-2 tracking-widest"
            >
              <Activity className="w-3.5 h-3.5" />
              REGISTRY
            </Link>
            <Link
              href="/coordination/validate"
              className="group flex items-center gap-2 text-[10px] font-mono-display font-bold text-gray-500 hover:text-reactor-cyan transition-all pb-2 tracking-widest"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              VALIDATE
            </Link>
          </nav>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-3">
            <div className="relative group rounded-[2px] border border-reactor-cyan/10 bg-black/40 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-reactor-cyan/30">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/20 to-transparent" />
              <ScorecardForm />
            </div>
          </div>

          {/* Sidebar Area */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Protocol Flow Container */}
            <div className="bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Beaker className="w-4 h-4 text-reactor-cyan" />
                <h3 className="text-xs font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                  Andromeda_Flow
                </h3>
              </div>

              <div className="space-y-6 relative ml-4 border-l border-reactor-cyan/20 pl-6">
                {[
                  { id: '01', title: 'DEFINE_SCORECARD', desc: 'Technical decomposition' },
                  { id: '02', title: 'VALIDATION', desc: 'Clarity Delta > 0.7' },
                  { id: '03', title: 'SIGN_CHALLENGE', desc: 'EIP-712 Attestation' },
                  { id: '04', title: 'IPFS_PUBLISH', desc: 'Registry sync' }
                ].map((step) => (
                  <div key={step.id} className="relative group">
                    <div className="absolute -left-[31px] top-0 w-2.5 h-2.5 rounded-full bg-black border border-reactor-cyan/40 group-hover:bg-reactor-cyan/40 transition-all duration-300" />
                    <h4 className="text-[10px] font-mono-display font-bold text-reactor-cyan tracking-widest">{step.title}</h4>
                    <p className="text-[9px] text-gray-600 font-mono-display uppercase mt-1">{step.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-reactor-cyan/10 space-y-2">
                <p className="text-[9px] text-gray-500 font-mono-display uppercase tracking-wider">Supported Networks:</p>
                <div className="flex flex-wrap gap-2">
                  {['ETH', 'POL', 'AVA', 'SOL'].map(chain => (
                    <span key={chain} className="px-2 py-0.5 bg-reactor-cyan/5 border border-reactor-cyan/10 text-[9px] font-mono-display text-reactor-cyan/70">
                      {chain}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick API Links */}
            <div className="bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6">
              <h3 className="text-xs font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase mb-4">
                Rapid_Access_API
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'CHALLENGE', path: '/api/coordination/challenge', color: 'border-reactor-cyan/20 text-reactor-cyan hover:bg-reactor-cyan/5' },
                  { label: 'VALIDATE', path: '/api/coordination/validate', color: 'border-green-500/20 text-green-500 hover:bg-green-500/5' },
                  { label: 'PUBLISH', path: '/api/coordination/publish', color: 'border-purple-500/20 text-purple-500 hover:bg-purple-500/5' }
                ].map(api => (
                  <a
                    key={api.label}
                    href={api.path}
                    target="_blank"
                    className={`block p-3 rounded-[2px] border ${api.color} transition-all duration-200 group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-display font-bold tracking-widest">{api.label}</span>
                      <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* industrial Footer */}
        <footer className="mt-16 pt-8 border-t border-reactor-cyan/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            <div>
              <h4 className="text-[10px] font-mono-display font-bold text-gray-400 tracking-[0.2em] mb-3 uppercase">Origin_Status</h4>
              <p className="text-xs text-gray-600 font-mono-display uppercase leading-relaxed">
                Andromeda Core v1.0<br />Foundational Documentation<br />Status: Alpha_Stage_Prod
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-mono-display font-bold text-reactor-cyan tracking-[0.2em] mb-3 uppercase">Core_Metric</h4>
              <p className="text-2xl font-mono-display font-bold text-gray-200 tracking-tighter uppercase mb-1">Clarity Delta</p>
              <p className="text-[10px] text-gray-600 font-mono-display uppercase tracking-widest">Single validation standard</p>
            </div>
            <div>
              <h4 className="text-[10px] font-mono-display font-bold text-gray-400 tracking-[0.2em] mb-3 uppercase">Next_Directives</h4>
              <p className="text-xs text-gray-600 font-mono-display uppercase leading-relaxed">
                DAO Governance Integration<br />Multisig Verification<br />Cross-Chain Orchestration
              </p>
            </div>
          </div>
          <div className="text-center mt-12 pb-8">
            <span className="text-[9px] font-mono-display text-gray-700 tracking-[0.3em] uppercase">
              © 2024 ANDROMEDA_COMPUTER // ALL_PROCESSES_ON_CHAIN_VERIFIABLE
            </span>
          </div>
        </footer>
      </div>
    </DashboardUnified>
  );
}
