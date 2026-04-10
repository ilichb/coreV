'use client';

import React, { useState, useEffect } from 'react';
import DashboardUnified from '@/components/layout/DashboardUnified';
import Link from 'next/link';
import {
    ClipboardList,
    Activity,
    ShieldCheck,
    Database,
    Beaker,
    Zap,
    HardDrive,
    Globe
} from 'lucide-react';
import RegistryView from '@/components/coordination/RegistryView';
import AtlasExplore from '@/components/coordination/atlas/AtlasExplore';
import { useTranslations } from 'next-intl';

// industrial Loading Component
const InitializingRegistry = () => {
    const t = useTranslations('RegistryPage');
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
};

function Loading() {
    return <InitializingRegistry />;
}

export default function RegistryPage() {
    const t = useTranslations('RegistryPage');
    const [mounted, setMounted] = useState(false);
    const [activeView, setActiveView] = useState<'registry' | 'atlas'>('registry');

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <Loading />;

    return (
        <DashboardUnified>
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Industrial Header */}
                <header className="relative border-b border-[#1e2430] pb-10 mb-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan shadow-[0_0_8px_rgba(0,212,255,0.6)] animate-pulse" />
                                <span className="text-[10px] text-mono font-bold text-reactor-cyan bg-reactor-cyan/10 border border-reactor-cyan/20 px-3 py-1 rounded-[1px] tracking-[0.3em] uppercase">
                                    {t('Header.phase')}
                                </span>
                            </div>

                            <div>
                                <h1 className="title-orbitron text-4xl md:text-5xl font-bold mb-4 drop-shadow-[0_0_15px_rgba(0,212,255,0.1)]">
                                    {t('Header.onChain')} <span className="text-reactor-cyan">{t('Header.registry')}</span>
                                </h1>
                                <p className="text-gray-500 font-sans text-sm max-w-2xl leading-relaxed italic opacity-80 border-l-2 border-reactor-cyan/30 pl-4">
                                    {t('Header.subtitle')}
                                    <span className="text-reactor-cyan/60 ml-2 uppercase text-[10px] font-bold text-mono tracking-wider">{t('Header.immutability')}</span>
                                </p>
                            </div>
                        </div>

                        <div className="panel p-4 min-w-[240px] bg-[#0d0f14] border-l-reactor-cyan/40">
                            <div className="panel-corner tl"></div>
                            <div className="panel-corner tr"></div>
                            <div className="panel-corner bl"></div>
                            <div className="panel-corner br"></div>
                            <p className="text-[10px] text-gray-500 text-mono uppercase tracking-[0.2em] font-bold mb-3">{t('Header.globalStatus')}</p>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-[1px] border border-[#1e2430] flex items-center justify-center bg-black/40 shadow-inner">
                                    <Activity className="w-5 h-5 text-reactor-cyan opacity-80" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 text-reactor-cyan/50 text-[9px] text-mono tracking-[0.3em] font-bold mb-1 uppercase">
                                        ONLINE
                                    </div>
                                    <h2 className="title-orbitron text-xl font-bold text-white tracking-widest">
                                        CORE_ACTIVE
                                    </h2>
                                </div>
                            </div>
                            <p className="text-[9px] text-reactor-cyan/40 text-mono uppercase mt-2 tracking-wider font-bold">{t('Header.syncing')}</p>
                        </div>
                    </div>

                    {/* Sub-Navigation */}
                    <nav className="flex items-center gap-6 mt-8">
                        <Link
                            href="/coordination"
                            className="group flex items-center gap-2 text-[10px] font-mono-display font-bold text-gray-500 hover:text-reactor-cyan transition-all pb-2 tracking-widest"
                        >
                            <ClipboardList className="w-3.5 h-3.5" />
                            {/* Reusing Coordination Nav translations if possible, or keeping literals if they are global */}
                            {t('Tabs.scorecard')}
                        </Link>
                        <Link
                            href="/registry"
                            className="group flex items-center gap-2 text-[10px] font-mono-display font-bold text-reactor-cyan border-b-2 border-reactor-cyan pb-2 tracking-widest"
                        >
                            <Activity className="w-3.5 h-3.5" />
                            {t('Tabs.registry')}
                        </Link>
                        <Link
                            href="/coordination/validate"
                            className="group flex items-center gap-2 text-[10px] font-mono-display font-bold text-gray-500 hover:text-reactor-cyan transition-all pb-2 tracking-widest"
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {t('Tabs.validate')}
                        </Link>
                    </nav>
                </header>

                {/* Top Operational Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: t('Metrics.totalRecords'), value: '1,429', icon: Database, color: 'text-reactor-cyan' },
                        { label: t('Metrics.syncStrength'), value: '99.8%', icon: Zap, color: 'text-amber-500' },
                        { label: t('Metrics.dataIntegrity'), value: t('Metrics.verified'), icon: ShieldCheck, color: 'text-green-500' },
                        { label: t('Metrics.ipfsNodes'), value: '12', icon: HardDrive, color: 'text-purple-500' },
                    ].map((m, i) => (
                        <div key={i} className="panel p-4 bg-[#0d0f14] flex items-center justify-between group">
                            <div className="panel-corner tl"></div>
                            <div className="panel-corner tr"></div>
                            <div className="panel-corner bl"></div>
                            <div className="panel-corner br"></div>
                            <div>
                                <p className="text-[9px] text-gray-600 text-mono uppercase tracking-[0.15em] font-bold mb-1">{m.label}</p>
                                <p className={`title-orbitron text-xl font-bold ${m.color}`}>{m.value}</p>
                            </div>
                            <m.icon className={`w-5 h-5 ${m.color} opacity-20 group-hover:opacity-60 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]`} />
                        </div>
                    ))}
                </div>

                {/* View Tabs */}
                <div className="flex border-b border-[#1e2430] mb-8">
                    <button
                        onClick={() => setActiveView('registry')}
                        className={`flex items-center gap-3 px-8 py-4 text-[11px] text-mono font-bold tracking-[0.2em] uppercase transition-all duration-300 ${activeView === 'registry'
                            ? 'text-reactor-cyan border-b-2 border-reactor-cyan bg-reactor-cyan/5 shadow-[inset_0_-8px_12px_rgba(0,212,255,0.05)]'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                    >
                        <Activity className={`w-4 h-4 ${activeView === 'registry' ? 'animate-pulse' : ''}`} />
                        {t('Tabs.registry')}
                    </button>
                    <button
                        onClick={() => setActiveView('atlas')}
                        className={`flex items-center gap-3 px-8 py-4 text-[11px] text-mono font-bold tracking-[0.2em] uppercase transition-all duration-300 ${activeView === 'atlas'
                            ? 'text-reactor-cyan border-b-2 border-reactor-cyan bg-reactor-cyan/5 shadow-[inset_0_-8px_12px_rgba(0,212,255,0.05)]'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                    >
                        <Globe className={`w-4 h-4 ${activeView === 'atlas' ? 'animate-spin-slow' : ''}`} />
                        {t('Tabs.atlas')}
                    </button>
                </div>

                {/* Main Registry/Atlas View */}
                <div className="panel p-8 bg-[#0d0f14]/80 backdrop-blur-xl min-h-[600px]">
                    <div className="panel-corner tl"></div>
                    <div className="panel-corner tr"></div>
                    <div className="panel-corner bl"></div>
                    <div className="panel-corner br"></div>
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/10 to-transparent" />

                    <div className="flex items-center gap-3 mb-10 pb-4 border-[#1e2430]">
                        <Beaker className="w-5 h-5 text-reactor-cyan opacity-80" />
                        <h2 className="title-orbitron text-xs font-bold text-gray-400 tracking-[0.3em] uppercase">
                            {activeView === 'registry' ? t('Explorer.registryTitle') : t('Explorer.atlasTitle')}
                        </h2>
                    </div>

                    <div className="relative z-10">
                        {activeView === 'registry' ? <RegistryView /> : <AtlasExplore />}
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-20 pt-10 border-t border-[#1e2430]">
                    <div className="text-center pb-12">
                        <span className="text-[9px] text-mono text-gray-700 tracking-[0.5em] uppercase opacity-40 font-bold">
                            © 2024 ANDROMEDA_COMPUTER // {t('phrases.persistentRecordSystem')}
                        </span>
                    </div>
                </footer>
            </div>
        </DashboardUnified>
    );
}
