'use client';

import React, { useState, useEffect } from 'react';
import DashboardUnified from '@/components/layout/DashboardUnified';
import {
    Shield,
    Terminal,
    Activity,
    Cpu,
    Database,
    Lock,
    Search,
    RefreshCw,
    FileSearch,
    Beaker,
    Bug
} from 'lucide-react';
import AuditReport from '@/components/coordination/AuditReport';
import VerificationDepth from '@/components/coordination/atlas/VerificationDepth';
import { useTranslations } from 'next-intl';

// industrial Loading Component
function Loading() {
    const t = useTranslations('AuditPage');
    return (
        <div className="fixed inset-0 bg-[#0a0b0e] z-[100] flex flex-col items-center justify-center p-6 overflow-hidden">
            <div className="design-andromeda-core absolute inset-0 pointer-events-none"></div>
            <div className="relative group z-10">
                <div className="w-16 h-16 mb-8 border-2 border-red-500/20 rounded-full animate-spin border-t-red-500 shadow-[0_0_30px_rgba(239,68,68,0.15)]" />
            </div>
            <div className="text-red-500 text-mono text-[10px] tracking-[0.5em] animate-pulse flex items-center gap-3 z-10 uppercase font-bold">
                {t('Loading.initializing') || 'SCANNING_SYSTEM_VULNERABILITIES...'}
            </div>
        </div>
    );
}

export default function AuditPage() {
    const t = useTranslations('AuditPage');
    const [mounted, setMounted] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const runDiagnostic = () => {
        setIsScanning(true);
        setTimeout(() => setIsScanning(false), 2000);
    };

    if (!mounted) return <Loading />;

    return (
        <DashboardUnified>
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Industrial Header */}
                <header className="relative border-b border-[#1e2430] pb-10 mb-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                                <span className="text-[10px] text-mono font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-[1px] tracking-[0.3em] uppercase">
                                    {t('Header.phase')}
                                </span>
                            </div>

                            <div>
                                <h1 className="title-orbitron text-4xl md:text-5xl font-bold mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                    SECURITY <span className="text-red-500 opacity-80">&</span> QUALITY <span className="text-reactor-cyan opacity-80">AUDIT</span>
                                </h1>
                                <p className="text-gray-500 font-sans text-sm max-w-2xl leading-relaxed italic opacity-80 border-l-2 border-red-500/30 pl-4 uppercase tracking-wider">
                                    {t('Header.subtitle')}
                                    <span className="text-red-500/60 ml-2 text-mono font-bold font-sans tracking-tight opacity-40">// TRUST_BUT_VERIFY</span>
                                </p>
                            </div>
                        </div>

                        <div className="panel p-4 min-w-[260px] bg-[#0d0f14] border-l-red-500/40">
                            <div className="panel-corner tl"></div>
                            <div className="panel-corner tr"></div>
                            <div className="panel-corner bl"></div>
                            <div className="panel-corner br"></div>
                            <div className="flex items-center justify-between w-full mb-2">
                                <span className="text-[9px] text-gray-500 text-mono uppercase tracking-[0.2em] font-bold">{t('Header.riskLevel')}</span>
                                <span className="text-[10px] text-mono font-bold text-red-500 uppercase tracking-widest">{t('Header.elevated')}</span>
                            </div>
                            <div className="w-full h-1 bg-black/60 rounded-[1px] overflow-hidden border border-[#1e2430] mb-4 shadow-inner">
                                <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" style={{ width: '75%' }} />
                            </div>
                            <button
                                onClick={runDiagnostic}
                                disabled={isScanning}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/5 border border-red-500/20 text-[10px] text-mono font-bold text-red-500 hover:bg-red-500/10 transition-all uppercase tracking-[0.2em] rounded-[1px] disabled:opacity-40"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                                {isScanning ? t('Header.runningScan') : t('Header.triggerScan')}
                            </button>
                        </div>
                    </div>

                    {/* Sub-Navigation */}
                    <nav className="flex items-center gap-8 mt-10">
                        <div className="flex items-center gap-2 text-[10px] text-mono font-bold text-red-500 border-b border-red-500 pb-3 tracking-[0.2em] uppercase cursor-default">
                            <Shield className="w-3 h-3" />
                            {t('Nav.overview')}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-mono font-bold text-gray-500 hover:text-red-400 cursor-pointer transition-all pb-3 tracking-[0.2em] uppercase group">
                            <Terminal className="w-3 h-3 group-hover:animate-pulse" />
                            {t('Nav.logs')}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-mono font-bold text-gray-500 hover:text-red-400 cursor-pointer transition-all pb-3 tracking-[0.2em] uppercase group">
                            <Bug className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                            {t('Nav.vulnerabilities')}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-mono font-bold text-gray-600 hover:text-gray-400 cursor-pointer transition-all pb-3 tracking-[0.2em] uppercase ml-auto opacity-40 hover:opacity-100">
                            <FileSearch className="w-3 h-3" />
                            {t('Nav.history')}
                        </div>
                    </nav>
                </header>

                {/* Live Diagnostic Pulse */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="panel p-4 bg-[#0d0f14] flex items-center gap-4 group">
                        <div className="panel-corner tl"></div>
                        <div className="panel-corner tr"></div>
                        <div className="panel-corner bl"></div>
                        <div className="panel-corner br"></div>
                        <div className="p-3 bg-reactor-cyan/5 rounded-[1px] border border-[#1e2430] group-hover:border-reactor-cyan/20 transition-all active:scale-95">
                            <Database className="w-5 h-5 text-reactor-cyan" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] text-gray-600 text-mono uppercase tracking-[0.15em] font-bold mb-1">{t('Diagnostics.supabase')}</p>
                            <div className="flex items-center justify-between">
                                <p className="title-orbitron text-xs font-bold text-gray-200 uppercase">{t('Diagnostics.active')}</p>
                                <span className="text-[9px] text-green-500 text-mono font-bold tracking-widest">{t('Diagnostics.healthy')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="panel p-4 bg-[#0d0f14] flex items-center gap-4 group">
                        <div className="panel-corner tl"></div>
                        <div className="panel-corner tr"></div>
                        <div className="panel-corner bl"></div>
                        <div className="panel-corner br"></div>
                        <div className="p-3 bg-amber-500/5 rounded-[1px] border border-[#1e2430] group-hover:border-amber-500/20 transition-all">
                            <Activity className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] text-gray-600 text-mono uppercase tracking-[0.15em] font-bold mb-1">{t('Diagnostics.redis')}</p>
                            <div className="flex items-center justify-between">
                                <p className="title-orbitron text-xs font-bold text-gray-200 uppercase">24MS</p>
                                <span className="text-[9px] text-amber-500 text-mono font-bold tracking-widest uppercase">{t('Header.elevated')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="panel p-4 bg-[#0d0f14] flex items-center gap-4 group">
                        <div className="panel-corner tl"></div>
                        <div className="panel-corner tr"></div>
                        <div className="panel-corner bl"></div>
                        <div className="panel-corner br"></div>
                        <div className="p-3 bg-red-500/5 rounded-[1px] border border-[#1e2430] group-hover:border-red-500/20 transition-all">
                            <Lock className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] text-gray-600 text-mono uppercase tracking-[0.15em] font-bold mb-1">{t('Diagnostics.firewall')}</p>
                            <div className="flex items-center justify-between">
                                <p className="title-orbitron text-xs font-bold text-gray-200 uppercase">{t('Diagnostics.shielded')}</p>
                                <span className="text-[9px] text-red-500 text-mono font-bold tracking-widest uppercase">{t('Diagnostics.monitoring')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit Report Content */}
                <div className="panel p-8 bg-[#0d0f14]/80 backdrop-blur-xl min-h-[700px]">
                    <div className="panel-corner tl"></div>
                    <div className="panel-corner tr"></div>
                    <div className="panel-corner bl"></div>
                    <div className="panel-corner br"></div>
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/10 to-transparent" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-reactor-cyan/5 border border-[#1e2430] rounded-[1px] shadow-inner">
                                <Beaker className="w-5 h-5 text-reactor-cyan opacity-80" />
                            </div>
                            <div>
                                <h2 className="title-orbitron text-sm font-bold text-gray-300 tracking-[0.3em] uppercase">
                                    {t('Dashboard.title')}
                                </h2>
                                <p className="text-[9px] text-gray-600 text-mono uppercase tracking-[0.15em] font-bold mt-1.5 opacity-60">
                                    {t('Dashboard.source')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group/search">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700 group-hover/search:text-reactor-cyan transition-colors" />
                                <input
                                    type="text"
                                    placeholder={t('Dashboard.filter')}
                                    className="bg-black/60 border border-[#1e2430] rounded-[1px] pl-9 pr-6 py-2.5 text-[10px] text-mono font-bold text-gray-400 focus:border-reactor-cyan/40 focus:ring-1 focus:ring-reactor-cyan/10 outline-none w-64 placeholder:text-gray-700 transition-all uppercase tracking-widest"
                                />
                            </div>
                            <button className="p-2.5 bg-black/60 border border-[#1e2430] rounded-[1px] hover:border-reactor-cyan/30 hover:bg-reactor-cyan/5 transition-all group">
                                <Cpu className="w-4 h-4 text-gray-600 group-hover:text-reactor-cyan transition-colors" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="lg:col-span-1">
                            <AuditReport />
                        </div>
                        <div className="lg:col-span-1">
                            <VerificationDepth />
                        </div>
                    </div>

                    {/* Deep Tech Decoration Overlay */}
                    <div className="absolute bottom-4 right-6 opacity-10 pointer-events-none select-none">
                        <pre className="text-[5px] font-mono leading-tight text-reactor-cyan">
                            {`
01010111 01001000 01000101 01010010 01000101
01001001 01010011 01010100 01001000 01000101
01001101 01001111 01001110 01000101 01011001
`}
                        </pre>
                    </div>
                </div>

                {/* System Logs (Footer-like area) */}
                <div className="panel p-4 bg-black/40 border-[#1e2430]">
                    <div className="flex items-center gap-6 text-[9px] text-mono text-gray-600 uppercase tracking-[0.2em] font-bold overflow-x-auto whitespace-nowrap scrollbar-hide">
                        <span className="text-green-600 flex items-center gap-2"><div className="w-1 h-1 bg-green-500 rounded-full"></div>[SYSTEM_ONLINE]</span>
                        <span className="opacity-60">{t('FooterLogs.initialized')}</span>
                        <span className="text-gray-800 opacity-20">||</span>
                        <span className="opacity-60">{t('FooterLogs.heartbeat')}</span>
                        <span className="text-gray-800 opacity-20">||</span>
                        <span className="opacity-60">{t('FooterLogs.updated')}</span>
                        <span className="text-gray-800 opacity-20">||</span>
                        <span className="text-reactor-cyan/50">{t('FooterLogs.active')}</span>
                        <span className="text-red-500 animate-pulse ml-auto bg-red-500/5 px-2 py-0.5 rounded-[1px] border border-red-500/10 font-bold">{t('FooterLogs.surveillance')}</span>
                    </div>
                </div>
            </div>
        </DashboardUnified>
    );
}
