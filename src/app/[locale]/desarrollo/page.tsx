'use client';

import React, { useState, useEffect } from 'react';
import DashboardUnified from '@/components/layout/DashboardUnified';
import {
    Terminal,
    Cpu,
    Settings,
    Activity,
    Code,
    Zap,
    Lock,
    Search,
    RefreshCw,
    Box
} from 'lucide-react';
import DeveloperMode from '@/components/andromeda/modes/DeveloperMode';
import { TerminalValidator } from '@/components/andromeda/TerminalValidator';
import { SystemDiagnostics } from '@/components/dev/SystemDiagnostics';
import { useTranslations } from 'next-intl';

// Industrial Loading Component
function Loading() {
    const t = useTranslations('DesarrolloPage');
    return (
        <div className="fixed inset-0 bg-[#0a0b0e] z-[100] flex flex-col items-center justify-center p-6 overflow-hidden">
            <div className="design-andromeda-core absolute inset-0 pointer-events-none"></div>
            <div className="relative group z-10">
                <div className="w-16 h-16 mb-8 border-2 border-green-500/20 rounded-full animate-spin border-t-green-500 shadow-[0_0_30px_rgba(34,197,94,0.15)]" />
            </div>
            <div className="text-green-500 text-mono text-[10px] tracking-[0.5em] animate-pulse flex items-center gap-3 z-10 uppercase font-bold">
                {t('Loading.booting')}
            </div>
        </div>
    );
}

export default function DesarrolloPage() {
    const t = useTranslations('DesarrolloPage');
    const [mounted, setMounted] = useState(false);
    const [kernelLogs, setKernelLogs] = useState<Array<{ts: string; level: string; msg: string}>>([]);
    const [generatingIpfs, setGeneratingIpfs] = useState(false);
    const [mintingProof, setMintingProof] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Load Kernel Logs from Activity Endpoint
    useEffect(() => {
        const loadLogs = async () => {
            try {
                const res = await fetch('/api/intelligence/activity');
                const data = await res.json();
                if (data.success && Array.isArray(data.events)) {
                    setKernelLogs(prev => {
                        const merged = [...data.events, ...prev];
                        const seen = new Set<string>();
                        return merged.filter(e => {
                            const key = `${e.ts}|${e.msg}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        }).slice(0, 5); // Keep last 5 for UI fitting
                    });
                }
            } catch {
                // Fail silently
            }
        };

        if (mounted) {
            loadLogs();
            const interval = setInterval(loadLogs, 15000);
            return () => clearInterval(interval);
        }
    }, [mounted]);

    const handleGenerateIpfs = async () => {
        setGeneratingIpfs(true);
        try {
            await fetch('/api/dev/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate_ipfs' })
            });
        } finally {
            setTimeout(() => setGeneratingIpfs(false), 800);
        }
    };

    const handleMintProof = async () => {
        setMintingProof(true);
        try {
            await fetch('/api/dev/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mint_proof' })
            });
        } finally {
            setTimeout(() => setMintingProof(false), 800);
        }
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
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                                <span className="text-[10px] text-mono font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-[1px] tracking-[0.3em] uppercase">
                                    {t('Header.phase')}
                                </span>
                            </div>

                            <div>
                                <h1 className="title-orbitron text-4xl md:text-5xl font-bold mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                                    {t('Header.system')} <span className="text-green-500 opacity-100">{t('Header.terminal')}</span> & <span className="text-reactor-cyan opacity-100">{t('Header.debugger')}</span>
                                </h1>
                                <p className="text-gray-500 font-sans text-sm max-w-2xl leading-relaxed italic opacity-100 border-l-2 border-green-500/30 pl-4 uppercase tracking-wider">
                                    {t('Header.subtitle')}
                                    <span className="text-green-500/60 ml-2 text-mono font-bold tracking-widest text-[9px] uppercase opacity-40">{t('Header.codeIsLaw')}</span>
                                </p>
                            </div>
                        </div>

                        <div className="panel p-4 min-w-[280px] bg-[#0d0f14] border-l-green-500/40">
                            <div className="panel-corner tl"></div>
                            <div className="panel-corner tr"></div>
                            <div className="panel-corner bl"></div>
                            <div className="panel-corner br"></div>
                            <div className="flex items-center justify-between w-full mb-2">
                                <span className="text-[9px] text-gray-500 text-mono uppercase tracking-[0.2em] font-bold">{t('Header.compilerHealth')}</span>
                                <span className="text-[10px] text-mono font-bold text-green-500 uppercase tracking-widest">{t('Header.nominal')}</span>
                            </div>
                            <div className="w-full h-1 bg-black/60 rounded-[1px] overflow-hidden border border-[#1e2430] mb-4 shadow-inner">
                                <div className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" style={{ width: '100%' }} />
                            </div>
                            <div className="flex items-center gap-4 w-full opacity-60">
                                <div className="flex-1 text-[9px] text-mono font-bold text-gray-600 uppercase tracking-wider">{t('Header.uptime')}</div>
                                <div className="flex-1 text-[9px] text-mono font-bold text-gray-600 text-right uppercase tracking-wider">{t('Header.fatalErr')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Sub-Navigation */}
                    <nav className="flex items-center gap-8 mt-10">
                        <div className="flex items-center gap-2 text-[10px] text-mono font-bold text-green-500 border-b border-green-500 pb-3 tracking-[0.2em] uppercase cursor-default">
                            <Terminal className="w-3 h-3" />
                            {t('Nav.terminal')}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-mono font-bold text-gray-500 hover:text-green-400 cursor-pointer transition-all pb-3 tracking-[0.2em] uppercase group">
                            <Search className="w-3 h-3 group-hover:scale-110 transition-transform" />
                            {t('Nav.inspect')}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-mono font-bold text-gray-500 hover:text-green-400 cursor-pointer transition-all pb-3 tracking-[0.2em] uppercase group">
                            <Zap className="w-3 h-3 group-hover:animate-pulse" />
                            {t('Nav.simulations')}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-mono font-bold text-gray-600 hover:text-gray-400 cursor-pointer transition-all pb-3 tracking-[0.2em] uppercase ml-auto opacity-40 hover:opacity-100">
                            <Code className="w-3 h-3" />
                            {t('Nav.documentation')}
                        </div>
                    </nav>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Main Terminal Column */}
                    <div className="xl:col-span-2 space-y-8">
                        <DeveloperMode />

                        <div className="panel p-8 bg-[#0d0f14]/80 backdrop-blur-xl">
                            <div className="panel-corner tl"></div>
                            <div className="panel-corner tr"></div>
                            <div className="panel-corner bl"></div>
                            <div className="panel-corner br"></div>
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/10 to-transparent" />

                            <div className="flex items-center gap-3 mb-8 border-b border-[#1e2430] pb-4">
                                <div className="w-2 h-2 rounded-full bg-reactor-cyan animate-pulse shadow-[0_0_8px_rgba(0,212,255,0.4)]" />
                                <h2 className="title-orbitron text-[10px] font-bold text-gray-400 tracking-[0.3em] uppercase">
                                    {t('Sections.diagnosticSuite')}
                                </h2>
                            </div>

                            <TerminalValidator />
                        </div>
                    </div>

                    {/* Right Sidebar: Diagnostics & Tools */}
                    <div className="space-y-8">
                        <SystemDiagnostics />

                        <div className="panel p-6 bg-[#0d0f14] border-l-reactor-cyan/40">
                            <div className="panel-corner tl"></div>
                            <div className="panel-corner tr"></div>
                            <div className="panel-corner bl"></div>
                            <div className="panel-corner br"></div>
                            <div className="flex items-center gap-3 mb-8 border-b border-[#1e2430] pb-3">
                                <Box className="w-4 h-4 text-gray-500" />
                                <h4 className="title-orbitron text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t('Sections.toolkit')}</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                <button 
                                    onClick={handleGenerateIpfs}
                                    disabled={generatingIpfs}
                                    className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-[#1e2430] hover:border-reactor-cyan/30 hover:bg-reactor-cyan/5 transition-all group/item rounded-[1px] disabled:opacity-50"
                                >
                                    <span className="text-[10px] text-mono font-bold text-gray-500 group-hover/item:text-gray-300 uppercase tracking-wider">{t('Sections.generateIpfs')}</span>
                                    <Zap className={`w-3 h-3 text-gray-700 group-hover/item:text-reactor-cyan shadow-[0_0_5px_rgba(0,212,255,0)] group-hover/item:shadow-[0_0_8px_rgba(0,212,255,0.4)] ${generatingIpfs ? 'animate-pulse text-reactor-cyan' : ''}`} />
                                </button>
                                <button 
                                    onClick={handleMintProof}
                                    disabled={mintingProof}
                                    className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-[#1e2430] hover:border-reactor-cyan/30 hover:bg-reactor-cyan/5 transition-all group/item rounded-[1px] disabled:opacity-50"
                                >
                                    <span className="text-[10px] text-mono font-bold text-gray-500 group-hover/item:text-gray-300 uppercase tracking-wider">{t('Sections.mintProof')}</span>
                                    <Activity className={`w-3 h-3 text-gray-700 group-hover/item:text-reactor-cyan ${mintingProof ? 'animate-spin text-reactor-cyan' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="panel p-6 bg-[#0a0c10] border-l-green-500/20">
                            <div className="panel-corner tl"></div>
                            <div className="panel-corner tr"></div>
                            <div className="panel-corner bl"></div>
                            <div className="panel-corner br"></div>
                            <div className="flex items-center gap-3 mb-6 border-b border-[#1e2430] pb-3">
                                <Lock className="w-4 h-4 text-green-500 opacity-60" />
                                <span className="title-orbitron text-[9px] font-bold text-green-500 uppercase tracking-widest opacity-100">{t('Sections.kernelLogs')}</span>
                            </div>
                            <div className="space-y-2.5 text-mono text-[9px] text-green-500/50">
                                {kernelLogs.length === 0 ? (
                                    <p className="flex justify-between items-center opacity-40 italic">Awaiting telemetry...</p>
                                ) : (
                                    kernelLogs.map((log, i) => {
                                        const cleanMsg = log.msg.replace(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\s/, '');
                                        return (
                                        <p key={i} className="flex justify-between items-center">
                                            <span className="opacity-40">[{new Date(log.ts).toLocaleTimeString()}]</span> 
                                            <span className={`text-right w-4/5 truncate ${log.level === 'warn' ? 'text-amber-500/80' : log.level === 'error' ? 'text-red-500/80' : 'text-green-500/80'}`}>
                                                {cleanMsg}
                                            </span>
                                        </p>
                                    )})
                                )}
                                <p className="animate-pulse text-green-500 font-bold mt-4 uppercase tracking-[0.2em]">{t('Sections.listening')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Global System State */}
                <div className="panel p-4 bg-black/40 border-[#1e2430]">
                    <div className="flex items-center gap-6 text-[9px] text-mono text-gray-600 uppercase tracking-[0.2em] font-bold overflow-x-auto whitespace-nowrap scrollbar-hide">
                        <span className="text-green-600 flex items-center gap-2"><div className="w-1 h-1 bg-green-500 rounded-full"></div>[KERNELLOADED]</span>
                        <span className="opacity-60">{t('FooterState.buffer')}</span>
                        <span className="text-gray-800 opacity-20">||</span>
                        <span className="opacity-60">{t('FooterState.compiler')}</span>
                        <span className="text-gray-800 opacity-20">||</span>
                        <span className="opacity-60">{t('FooterState.debug')}</span>
                        <span className="text-gray-800 opacity-20">||</span>
                        <span className="opacity-60">{t('FooterState.bypass')}</span>
                        <span className="text-green-500 shrink-0 ml-auto flex items-center gap-3 font-bold">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            {t('FooterState.pooling')}
                        </span>
                    </div>
                </div>
            </div>
        </DashboardUnified>
    );
}
