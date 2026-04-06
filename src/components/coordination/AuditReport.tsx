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

import { FINDING_IDS } from '@/lib/constants/audit';


interface AuditReportProps {
    diagnosticData?: any;
    lastScanDate?: string;
}

export default function AuditReport({ diagnosticData, lastScanDate }: AuditReportProps) {
    const t = useTranslations('AuditReport');
    const td = useTranslations('AuditPage.Diagnostics');
    const [expanded, setExpanded] = useState<string | null>(null);

    // Dynamic Findings Logic: Override static statuses with real-time diagnostic data
    const getDynamicFindings = () => {
        return FINDING_IDS.map(finding => {
            const dynamic = { ...finding };
            
            if (diagnosticData) {
                // WAF Status Mapping
                if (finding.id === 'L7-WAF') {
                    dynamic.status = diagnosticData.layers?.waf?.status === 'shielded' ? 'RESOLVED' : 'OPEN';
                }
                // RLS Status Mapping
                if (finding.id === 'DB-RLS') {
                    dynamic.status = diagnosticData.layers?.data?.status === 'protected' ? 'RESOLVED' : 'OPEN';
                }
                // Security Headers Mapping
                if (finding.id === 'SEC-HDR') {
                    dynamic.status = diagnosticData.layers?.perimeter?.verified ? 'RESOLVED' : 'OPEN';
                }
                // Blockchain Consensus Mapping (C-01)
                if (finding.id === 'C-01') {
                    dynamic.status = (diagnosticData.layers as any)?.blockchain?.consensus === 'healthy' ? 'RESOLVED' : 'OPEN';
                }
                // Unified Registry Mapping (C-02)
                if (finding.id === 'C-02') {
                    dynamic.status = (diagnosticData.layers as any)?.blockchain?.status === 'connected' ? 'RESOLVED' : 'OPEN';
                }
            }
            
            return dynamic;
        });
    };

    const dynamicFindings = getDynamicFindings();

    const stats = {
        critical: dynamicFindings.filter(f => f.severity === 'CRITICAL' && f.status !== 'RESOLVED').length,
        medium: dynamicFindings.filter(f => f.severity === 'MEDIUM' && f.status !== 'RESOLVED').length,
        low: dynamicFindings.filter(f => f.severity === 'LOW' && f.status !== 'RESOLVED').length,
        mitigated: dynamicFindings.filter(f => f.status === 'RESOLVED').length
    };

    const getLayerName = (id: string) => {
        if (id.startsWith('L7')) return t('layers.application');
        if (id.startsWith('DB')) return t('layers.data');
        if (id.startsWith('SEC')) return t('layers.perimeter');
        if (id.startsWith('C')) return t('layers.infrastructure');
        return t('layers.infrastructure');
    };

    // Calculate Readiness Percentages
    const secretReadiness = (diagnosticData?.layers?.data?.status === 'protected' && !!diagnosticData?.layers?.perimeter?.headers) ? 100 : 45;
    const blockchainRealism = ((diagnosticData?.layers as any)?.blockchain?.status === 'connected') ? 100 : 0;
    const coordinationReadiness = (diagnosticData?.telemetry?.redis?.status === 'healthy') ? 95 : 15;
    const logicIntegrity = ((diagnosticData?.layers as any)?.logic?.status === 'operational') ? 100 : 20;

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
                    <p className="text-3xl font-mono-display font-bold text-green-500">{stats.mitigated}</p>
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
                        <span className="text-[9px] font-mono-display text-gray-500 uppercase">{t('Manifest.lastScan')}: {lastScanDate || '---'}</span>
                        <span className="text-[9px] font-mono-display text-reactor-cyan cursor-pointer hover:underline uppercase">{t('Manifest.exportPdf')}</span>
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    {dynamicFindings.map((finding) => (
                        <div key={finding.id} className={`transition-all duration-300 ${expanded === finding.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
                            <div
                                className="px-6 py-4 flex items-center justify-between cursor-pointer"
                                onClick={() => setExpanded(expanded === finding.id ? null : finding.id)}
                            >
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    <div className="w-16">
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
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[8px] font-mono-display text-reactor-cyan border border-reactor-cyan/20 px-1.5 py-0.5 rounded-[1px] tracking-widest uppercase">
                                                {getLayerName(finding.id)}
                                            </span>
                                        </div>
                                        <h4 className="text-[11px] font-mono-display font-bold text-gray-200 uppercase tracking-wide truncate">
                                            {t(`findings.${finding.id}.title`)}
                                        </h4>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 pl-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${finding.status === 'RESOLVED' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' :
                                            finding.status === 'IN_PROGRESS' ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' :
                                                'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]'
                                            }`} />
                                        <span className={`text-[9px] font-mono-display font-bold ${finding.status === 'RESOLVED' ? 'text-green-500' :
                                            finding.status === 'IN_PROGRESS' ? 'text-amber-500' :
                                                'text-red-500'
                                            }`}>
                                            {finding.status === 'RESOLVED' ? td('healthy') : 
                                             finding.status === 'OPEN' ? td('unverified') : 
                                             finding.status === 'IN_PROGRESS' ? td('auditing') : finding.status}
                                        </span>
                                    </div>
                                    {expanded === finding.id ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                                </div>
                            </div>

                            {expanded === finding.id && (
                                <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top duration-300">
                                    <div className="ml-24 space-y-4">
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
                                <span className={logicIntegrity > 50 ? "text-reactor-cyan" : "text-red-500"}>{logicIntegrity}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className={`h-full ${logicIntegrity > 50 ? 'bg-reactor-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'} transition-all duration-1000`} style={{ width: `${logicIntegrity}%` }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono-display text-gray-500 italic">
                                <span>{t('Readiness.coordinationStability')}</span>
                                <span className={coordinationReadiness > 50 ? "text-reactor-cyan" : "text-amber-500"}>{coordinationReadiness}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className={`h-full ${coordinationReadiness > 50 ? 'bg-reactor-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'} transition-all duration-1000`} style={{ width: `${coordinationReadiness}%` }} />
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
                                <span className={secretReadiness > 50 ? "text-green-500" : "text-red-500"}>{secretReadiness}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className={`h-full ${secretReadiness > 50 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'} transition-all duration-1000`} style={{ width: `${secretReadiness}%` }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono-display text-gray-500 italic">
                                <span>{t('Readiness.blockchainRealism')}</span>
                                <span className={blockchainRealism > 50 ? "text-green-500" : "text-red-500"}>{blockchainRealism}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className={`h-full ${blockchainRealism > 50 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'} transition-all duration-1000`} style={{ width: `${blockchainRealism}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
