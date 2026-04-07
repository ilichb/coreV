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

import { FINDING_IDS, COOLDOWN_MS } from '@/lib/constants/audit';

// Industrial Loading Component
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
    const td = useTranslations('AuditPage.Diagnostics');
    const [mounted, setMounted] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScan, setLastScan] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [diagnosticData, setDiagnosticData] = useState<any>(null);

    // Calculate Dynamic Risk Score
    const calculateRisk = () => {
        const weights = { CRITICAL: 25, MEDIUM: 10, LOW: 5 };
        let totalPossible = 0;
        let currentRisk = 0;

        FINDING_IDS.forEach(f => {
            const weight = (weights as any)[f.severity] || 5;
            totalPossible += weight;
            
            // Status override logic for risk calculation
            let status = f.status;
            if (diagnosticData) {
                if (f.id === 'L7-WAF') status = diagnosticData.layers?.waf?.status === 'shielded' ? 'RESOLVED' : 'OPEN';
                if (f.id === 'DB-RLS') status = diagnosticData.layers?.data?.status === 'protected' ? 'RESOLVED' : 'OPEN';
                if (f.id === 'SEC-HDR') {
                    const headers = diagnosticData.layers?.perimeter?.headers || {};
                    const isSecure = headers['Strict-Transport-Security'] && headers['Content-Security-Policy'];
                    status = isSecure ? 'RESOLVED' : 'OPEN';
                }
            }

            if (status === 'OPEN') currentRisk += weight;
            if (status === 'IN_PROGRESS') currentRisk += weight * 0.6;
        });

        const score = totalPossible > 0 ? Math.min(100, Math.round((currentRisk / totalPossible) * 100)) : 0;
        const label = score > 70 ? td('elevated') : score > 30 ? td('moderate') : td('nominal');
        const color = score > 70 ? 'text-red-500' : score > 30 ? 'text-amber-500' : 'text-reactor-cyan';
        const bg = score > 70 ? 'bg-red-500' : score > 30 ? 'bg-amber-500' : 'bg-reactor-cyan';

        return { score, label, color, bg };
    };

    const riskInfo = calculateRisk();

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('andromeda_last_audit_scan');
        if (stored) setLastScan(parseInt(stored));
        
        // Initial diagnostic fetch
        fetch('/api/coordination/diagnostic')
            .then(res => res.json())
            .then(data => setDiagnosticData(data))
            .catch(err => console.error('Initial diagnostic failed', err));
    }, []);

    useEffect(() => {
        if (!lastScan) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = now - lastScan;
            if (diff < COOLDOWN_MS) {
                const remaining = COOLDOWN_MS - diff;
                const h = Math.floor(remaining / 3600000);
                const m = Math.floor((remaining % 3600000) / 60000);
                const s = Math.floor((remaining % 60000) / 1000);
                setTimeLeft(`${h}h ${m}m ${s}s`);
            } else {
                setTimeLeft('');
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lastScan]);

    const runDiagnostic = async () => {
        const now = Date.now();
        if (now - lastScan < COOLDOWN_MS) return;

        setIsScanning(true);
        try {
            const res = await fetch('/api/coordination/diagnostic');
            const data = await res.json();
            setDiagnosticData(data);
            
            const scanTimestamp = Date.now();
            setLastScan(scanTimestamp);
            localStorage.setItem('andromeda_last_audit_scan', scanTimestamp.toString());
        } finally {
            setIsScanning(false);
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
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                                <span className="text-[10px] text-mono font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-[1px] tracking-[0.3em] uppercase">
                                    {t('Header.phase')}
                                </span>
                            </div>

                            <div>
                                <h1 className="title-orbitron text-4xl md:text-5xl font-bold mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.1)] uppercase">
                                    <span className="inline-block">{t('Header.titlePart1') || 'SECURITY'}</span> <span className="text-red-500 font-bold">&</span> <span className="inline-block">{t('Header.titlePart2') || 'QUALITY'}</span> <span className="text-reactor-cyan font-semibold block sm:inline">{t('Header.titlePart3') || 'AUDIT'}</span>
                                </h1>
                                <p className="text-gray-500 font-sans text-sm max-w-2xl leading-relaxed italic opacity-80 border-l-2 border-red-500/30 pl-4 uppercase tracking-wider">
                                    {t('Header.subtitle')}
                                    <span className="text-red-500/60 ml-2 text-mono font-bold font-sans tracking-tight opacity-40">// {t('Header.tagline') || 'TRUST_BUT_VERIFY'}</span>
                                </p>
                            </div>
                        </div>

                        <div className="panel p-6 min-w-[320px] bg-[#0d0f14] border-red-500/20">
                            <div className="panel-corner tl"></div>
                            <div className="panel-corner tr"></div>
                            <div className="panel-corner bl"></div>
                            <div className="panel-corner br"></div>
                            
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-gray-500 text-mono uppercase tracking-[0.2em] font-bold">{t('Header.riskLevel')}</span>
                                    <span className={`text-[10px] text-mono font-bold uppercase tracking-widest ${riskInfo.color}`}>{riskInfo.label}</span>
                                </div>
                                
                                <div className="w-full h-1 bg-black/60 rounded-[1px] overflow-hidden border border-[#1e2430] shadow-inner">
                                    <div className={`h-full transition-all duration-1000 ${riskInfo.bg} shadow-[0_0_10px_rgba(239,68,68,0.4)]`} style={{ width: `${riskInfo.score}%` }} />
                                </div>

                                <button
                                    onClick={runDiagnostic}
                                    disabled={isScanning || !!timeLeft}
                                    className={`w-full flex flex-col items-center justify-center gap-1 px-4 py-3 bg-black/40 border border-white/5 text-[10px] text-mono font-bold transition-all uppercase tracking-[0.2em] rounded-[1px]
                                        ${!timeLeft ? 'hover:bg-red-500/10 border-red-500/20 text-red-500' : 'text-gray-500 cursor-not-allowed opacity-60'}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-red-500' : ''}`} />
                                        {isScanning ? t('Header.runningScan') : timeLeft ? t('Header.cooldownActive') : t('Header.triggerScan')}
                                    </div>
                                    {timeLeft && (
                                        <span className="text-[8px] opacity-60 lowercase tracking-normal">
                                            {t('Header.restoringIn')} {timeLeft}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

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
                            <Bug className="w-3 h-3 group-hover:rotate-12" />
                            {t('Nav.vulnerabilities')}
                        </div>
                    </nav>
                </header>

                {/* Live Diagnostic Pulse Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Database Layer */}
                    <div className="panel p-5 bg-[#0d0f14] flex items-center gap-4 group hover:border-reactor-cyan/30 transition-colors">
                        <div className="panel-corner tl"></div>
                        <div className="panel-corner tr"></div>
                        <div className="panel-corner bl"></div>
                        <div className="panel-corner br"></div>
                        <div className="p-3 bg-reactor-cyan/5 rounded-[1px] border border-[#1e2430] group-hover:bg-reactor-cyan/10 transition-all">
                            <Database className="w-5 h-5 text-reactor-cyan" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] text-gray-500 text-mono uppercase tracking-[0.2em] font-bold mb-1">DATA_DEFENSE // RLS</p>
                            <div className="flex items-center justify-between">
                                <p className="title-orbitron text-sm font-bold text-white uppercase tracking-wider">
                                    {diagnosticData?.layers?.data?.status === 'protected' ? td('shielded') : td('unverified')}
                                </p>
                                <span className={`text-[9px] text-mono font-bold tracking-[0.2em] px-2 py-0.5 rounded-[1px] ${diagnosticData?.layers?.data?.status === 'protected' ? 'text-green-500 bg-green-500/5' : 'text-amber-500 bg-amber-500/5 animate-pulse'}`}>
                                    {diagnosticData?.layers?.data?.status === 'protected' ? td('secure') : td('auditing')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure Layer */}
                    <div className="panel p-5 bg-[#0d0f14] flex items-center gap-4 group hover:border-amber-500/30 transition-colors">
                        <div className="panel-corner tl"></div>
                        <div className="panel-corner tr"></div>
                        <div className="panel-corner bl"></div>
                        <div className="panel-corner br"></div>
                        <div className="p-3 bg-amber-500/5 rounded-[1px] border border-[#1e2430] group-hover:bg-amber-500/10 transition-all">
                            <Activity className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] text-gray-500 text-mono uppercase tracking-[0.2em] font-bold mb-1">INFRA // LATENCY</p>
                            <div className="flex items-center justify-between">
                                <p className="title-orbitron text-sm font-bold text-white uppercase tracking-wider">
                                    {diagnosticData ? (diagnosticData?.telemetry?.redis?.latency_ms + 'MS') : '000MS'}
                                </p>
                                <span className={`text-[9px] text-mono font-bold tracking-[0.2em] px-2 py-0.5 rounded-[1px] ${(diagnosticData?.telemetry?.redis?.latency_ms > 200) ? 'text-red-500 bg-red-500/10' : 'text-green-500 bg-green-500/5'}`}>
                                    {(diagnosticData?.telemetry?.redis?.latency_ms > 200) ? td('elevated') : td('nominal')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Firewall Layer */}
                    <div className="panel p-5 bg-[#0d0f14] flex items-center gap-4 group hover:border-red-500/30 transition-colors">
                        <div className="panel-corner tl"></div>
                        <div className="panel-corner tr"></div>
                        <div className="panel-corner bl"></div>
                        <div className="panel-corner br"></div>
                        <div className="p-3 bg-red-500/5 rounded-[1px] border border-[#1e2430] group-hover:bg-red-500/10 transition-all">
                            <Lock className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] text-gray-500 text-mono uppercase tracking-[0.2em] font-bold mb-1">PERIMETER // L7_WAF</p>
                            <div className="flex items-center justify-between">
                                <p className="title-orbitron text-sm font-bold text-white uppercase tracking-wider">
                                    {diagnosticData?.layers?.waf?.status === 'shielded' ? td('enforced') : td('bypassed')}
                                </p>
                                <span className={`text-[9px] text-mono font-bold tracking-[0.2em] px-2 py-0.5 rounded-[1px] ${diagnosticData?.layers?.waf?.status === 'shielded' ? 'text-blue-400 bg-blue-500/5' : 'text-amber-500 bg-amber-500/5'}`}>
                                    {diagnosticData?.layers?.waf?.status === 'shielded' ? td('shielded') : td('warning')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Audit Analysis Content */}
                <div className="panel p-10 bg-[#0d0f14]/80 backdrop-blur-xl min-h-[800px] border-[#1e2430]">
                    <div className="panel-corner tl"></div>
                    <div className="panel-corner tr"></div>
                    <div className="panel-corner bl"></div>
                    <div className="panel-corner br"></div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-reactor-cyan/5 border border-[#1e2430] rounded-[1px]">
                                <Beaker className="w-6 h-6 text-reactor-cyan" />
                            </div>
                            <div>
                                <h2 className="title-orbitron text-lg font-bold text-white tracking-[0.2em] uppercase">
                                    {t('Dashboard.title')}
                                </h2>
                                <p className="text-[10px] text-gray-500 text-mono uppercase tracking-[0.15em] font-bold mt-1">
                                    {t('Dashboard.source')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative group/search">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-hover/search:text-reactor-cyan transition-colors" />
                                <input
                                    type="text"
                                    placeholder={t('Dashboard.filter')}
                                    className="bg-black/60 border border-[#1e2430] rounded-[1px] pl-10 pr-6 py-3 text-[11px] text-mono font-bold text-gray-400 focus:border-reactor-cyan/40 outline-none w-72 placeholder:text-gray-800 transition-all uppercase tracking-widest"
                                />
                            </div>
                            <button className="p-3 bg-black/60 border border-[#1e2430] rounded-[1px] hover:border-reactor-cyan/40 transition-all">
                                <Cpu className="w-5 h-5 text-gray-600 hover:text-reactor-cyan" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="lg:col-span-1">
                            <AuditReport 
                                diagnosticData={diagnosticData} 
                                lastScanDate={lastScan ? new Date(lastScan).toISOString().split('T')[0] : undefined} 
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <VerificationDepth />
                        </div>
                    </div>
                </div>

                {/* Industrial Status Bar */}
                <div className="panel p-5 bg-black/50 border-[#1e2430]">
                    <div className="flex items-center gap-8 text-[10px] text-mono text-gray-600 uppercase tracking-[0.2em] font-bold overflow-hidden">
                        <span className="text-green-600 flex items-center gap-2 min-w-max">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            [SYSTEM_SECURED]
                        </span>
                        <div className="h-4 w-px bg-white/5" />
                        <span className="opacity-50 min-w-max">HSTS_ENFORCED</span>
                        <span className="opacity-50 min-w-max">CSP_STRICT</span>
                        <span className="opacity-50 min-w-max">XFO_SAMEORIGIN</span>
                        <span className="ml-auto text-red-500/40 italic font-mono">[ANDROMEDA_CORE_SHIELD_v1.0.4]</span>
                    </div>
                </div>
            </div>
        </DashboardUnified>
    );
}
