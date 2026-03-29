'use client';

import React, { useState } from 'react';
import {
    AlertTriangle,
    ShieldAlert,
    ShieldCheck,
    Info,
    ChevronRight,
    ChevronDown,
    Terminal,
    Clock,
    ExternalLink,
    CheckCircle2,
    Lock,
    Eye,
    Settings
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Finding {
    id: string;
    severity: 'CRITICAL' | 'MEDIUM' | 'LOW';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}

const FINDING_IDS: Finding[] = [
    { id: 'C-01', severity: 'CRITICAL', status: 'RESOLVED' },
    { id: 'C-02', severity: 'CRITICAL', status: 'IN_PROGRESS' },
    { id: 'M-01', severity: 'MEDIUM', status: 'IN_PROGRESS' },
    { id: 'M-02', severity: 'MEDIUM', status: 'RESOLVED' },
    { id: 'B-01', severity: 'LOW', status: 'OPEN' },
    { id: 'B-02', severity: 'LOW', status: 'RESOLVED' }
];

export default function AuditReport() {
    const t = useTranslations('AuditReport');
    const [expanded, setExpanded] = useState<string | null>(null);

    const stats = {
        critical: FINDING_IDS.filter(f => f.severity === 'CRITICAL').length,
        medium: FINDING_IDS.filter(f => f.severity === 'MEDIUM').length,
        low: FINDING_IDS.filter(f => f.severity === 'LOW').length,
        resolved: FINDING_IDS.filter(f => f.status === 'RESOLVED').length
    };

    return (
        <div className="space-y-8">
            {/* Risk Assessment Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-black/40 border border-red-500/20 p-5 rounded-[2px] group hover:border-red-500/40 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <span className="text-[10px] font-mono-display text-red-500/70">{t('Matrix.critical')}</span>
                    </div>
                    <p className="text-3xl font-mono-display font-bold text-red-500">{stats.critical}</p>
                    <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-wider mt-2">{t('Matrix.activeExploits')}</p>
                </div>

                <div className="bg-black/40 border border-amber-500/20 p-5 rounded-[2px] group hover:border-amber-500/40 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <span className="text-[10px] font-mono-display text-amber-500/70">{t('Matrix.medium')}</span>
                    </div>
                    <p className="text-3xl font-mono-display font-bold text-amber-500">{stats.medium}</p>
                    <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-wider mt-2">{t('Matrix.systemLeaks')}</p>
                </div>

                <div className="bg-black/40 border border-blue-500/20 p-5 rounded-[2px] group hover:border-blue-500/40 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <Info className="w-5 h-5 text-blue-500" />
                        <span className="text-[10px] font-mono-display text-blue-500/70">{t('Matrix.low')}</span>
                    </div>
                    <p className="text-3xl font-mono-display font-bold text-blue-500">{stats.low}</p>
                    <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-wider mt-2">{t('Matrix.codeInconsistencies')}</p>
                </div>

                <div className="bg-black/40 border border-green-500/20 p-5 rounded-[2px] group hover:border-green-500/40 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                        <span className="text-[10px] font-mono-display text-green-500/70">{t('Matrix.mitigated')}</span>
                    </div>
                    <p className="text-3xl font-mono-display font-bold text-green-500">{stats.resolved}</p>
                    <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-wider mt-2">{t('Matrix.remediatedIssues')}</p>
                </div>
            </div>

            {/* Main findings table */}
            <div className="bg-black/40 border border-reactor-cyan/10 rounded-[2px] overflow-hidden">
                <div className="bg-reactor-cyan/5 border-b border-reactor-cyan/10 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-reactor-cyan" />
                        <span className="text-[10px] font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">{t('Manifest.title')}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-[9px] font-mono-display text-gray-500 uppercase">{t('Manifest.lastScan')}: 2026-02-10</span>
                        <span className="text-[9px] font-mono-display text-reactor-cyan cursor-pointer hover:underline uppercase">{t('Manifest.exportPdf')}</span>
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    {FINDING_IDS.map((finding) => (
                        <div key={finding.id} className={`transition-all duration-300 ${expanded === finding.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
                            <div
                                className="px-6 py-4 flex items-center justify-between cursor-pointer"
                                onClick={() => setExpanded(expanded === finding.id ? null : finding.id)}
                            >
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    <div className="w-12">
                                        <span className="text-[10px] font-mono-display font-bold text-gray-400">{finding.id}</span>
                                    </div>

                                    <div className={`px-2 py-0.5 border text-[8px] font-mono-display font-bold rounded-[2px] w-20 text-center
                    ${finding.severity === 'CRITICAL' ? 'border-red-500/50 text-red-500 bg-red-500/5' :
                                            finding.severity === 'MEDIUM' ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' :
                                                'border-blue-500/50 text-blue-500 bg-blue-500/5'}
                   `}>
                                        {finding.severity}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[11px] font-mono-display font-bold text-gray-200 uppercase tracking-wide truncate">
                                            {t(`findings.${finding.id}.title`)}
                                        </h4>
                                        <p className="text-[9px] text-gray-500 font-mono-display mt-1 font-medium truncate">
                                            {t('Finding.target')}: {finding.id.startsWith('C') ? '.env.local' : finding.id.startsWith('M') ? 'src/lib/services/coordination/' : '/api/coordination/'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 pl-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${finding.status === 'RESOLVED' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' :
                                            finding.status === 'IN_PROGRESS' ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' :
                                                'bg-gray-600'
                                            }`} />
                                        <span className={`text-[9px] font-mono-display font-bold ${finding.status === 'RESOLVED' ? 'text-green-500' :
                                            finding.status === 'IN_PROGRESS' ? 'text-amber-500' :
                                                'text-gray-500'
                                            }`}>
                                            {finding.status}
                                        </span>
                                    </div>
                                    {expanded === finding.id ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                                </div>
                            </div>

                            {expanded === finding.id && (
                                <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top duration-300">
                                    <div className="ml-16 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-red-400">
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span className="text-[9px] font-mono-display font-bold uppercase tracking-widest">{t('Finding.observationDetails')}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 leading-relaxed bg-black/40 border border-white/5 p-3 rounded-[2px]">
                                                    {t(`findings.${finding.id}.detail`)}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-amber-400">
                                                    <Lock className="w-3.5 h-3.5" />
                                                    <span className="text-[9px] font-mono-display font-bold uppercase tracking-widest">{t('Finding.operationalRisk')}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 leading-relaxed bg-black/40 border border-white/5 p-3 rounded-[2px]">
                                                    {t(`findings.${finding.id}.risk`)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-green-400">
                                                <Settings className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-mono-display font-bold uppercase tracking-widest">{t('Finding.remediationStrategy')}</span>
                                            </div>
                                            <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-[2px] flex items-start gap-3">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <p className="text-[10px] text-green-500/80 leading-relaxed">
                                                    {t(`findings.${finding.id}.remediation`) || t('Finding.remediationPending')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button className="flex items-center gap-2 px-4 py-2 bg-reactor-cyan/10 border border-reactor-cyan/30 text-[9px] font-mono-display font-bold text-reactor-cyan hover:bg-reactor-cyan/20 transition-all uppercase tracking-widest rounded-[2px]">
                                                {t('Finding.verifyPatch')} <ExternalLink className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Readiness Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/40 border border-reactor-cyan/10 p-6 rounded-[2px]">
                    <h3 className="text-xs font-mono-display font-bold text-gray-300 uppercase tracking-[0.2em] mb-6">{t('Readiness.logicalTitle')}</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono-display text-gray-500 italic">
                                <span>{t('Readiness.businessIntegrity')}</span>
                                <span className="text-reactor-cyan">95%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-reactor-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all duration-1000" style={{ width: '95%' }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono-display text-gray-500 italic">
                                <span>{t('Readiness.coordinationStability')}</span>
                                <span className="text-reactor-cyan">88%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-reactor-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all duration-1000" style={{ width: '88%' }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-black/40 border border-red-500/10 p-6 rounded-[2px]">
                    <h3 className="text-xs font-mono-display font-bold text-gray-300 uppercase tracking-[0.2em] mb-6">{t('Readiness.operationalTitle')}</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono-display text-gray-500 italic">
                                <span>{t('Readiness.secretManagement')}</span>
                                <span className="text-red-500">40%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all duration-1000" style={{ width: '40%' }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono-display text-gray-500 italic">
                                <span>{t('Readiness.blockchainRealism')}</span>
                                <span className="text-red-500">15%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all duration-1000" style={{ width: '15%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
