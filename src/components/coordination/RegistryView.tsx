'use client';

import React, { useState } from 'react';
import { useScorecards } from '@/hooks/coordination/state/useScorecards';
import { useTranslations } from 'next-intl';
import {
    Search,
    Filter,
    ArrowUpDown,
    ExternalLink,
    RefreshCcw,
    ShieldCheck,
    AlertTriangle,
    Beaker,
    Database,
    SearchCode,
    Globe
} from 'lucide-react';

export default function RegistryView() {
    const t = useTranslations('RegistryView');
    const [filter, setFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const { scorecards, loading, error, refetch } = useScorecards({ limit: 50 });

    const filteredScorecards = scorecards?.filter(sc => {
        const matchesFilter = filter === 'ALL' || sc.status?.toUpperCase() === filter;
        const matchesSearch = !searchQuery ||
            sc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sc.proposer?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const filterLabels: Record<string, string> = {
        'ALL': t('filterAll'),
        'VALIDATED': t('filterValidated'),
        'PENDING': t('filterPending')
    };

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/40 border border-reactor-cyan/10 p-4 rounded-[2px] backdrop-blur-md">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-reactor-cyan/50" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/40 border border-reactor-cyan/20 rounded-[2px] pl-9 pr-4 py-2 text-[10px] font-mono-display text-gray-100 focus:border-reactor-cyan/50 outline-none w-full min-w-[200px] placeholder:text-gray-700"
                        />
                    </div>

                    <div className="flex gap-2">
                        {['ALL', 'VALIDATED', 'PENDING'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-2 text-[9px] font-mono-display font-bold rounded-[2px] transition-all border ${filter === f
                                    ? 'bg-reactor-cyan/10 border-reactor-cyan text-reactor-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                                    : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
                                    }`}
                            >
                                {filterLabels[f]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2 border border-reactor-cyan/20 rounded-[2px] text-reactor-cyan/60 hover:text-reactor-cyan hover:bg-reactor-cyan/5 transition-all"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                    <div className="h-8 w-[1px] bg-reactor-cyan/10 hidden md:block" />
                    <div className="text-right">
                        <p className="text-[8px] text-gray-500 font-mono-display uppercase tracking-widest">{t('activeRecords')}</p>
                        <p className="text-xs font-mono-display font-bold text-reactor-cyan">{filteredScorecards?.length || 0}</p>
                    </div>
                </div>
            </div>

            {/* Registry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-[200px] bg-black/40 border border-reactor-cyan/5 animate-pulse rounded-[2px]" />
                    ))
                ) : error ? (
                    <div className="col-span-full p-12 text-center bg-red-500/5 border border-red-500/20 rounded-[2px]">
                        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                        <p className="text-xs font-mono-display text-red-400 uppercase tracking-widest">{t('syncFailure')}</p>
                        <button onClick={() => refetch()} className="mt-4 text-[10px] text-reactor-cyan underline font-mono-display">{t('retry')}</button>
                    </div>
                ) : filteredScorecards?.length === 0 ? (
                    <div className="col-span-full p-12 text-center bg-black/40 border border-white/5 rounded-[2px]">
                        <SearchCode className="w-8 h-8 text-gray-600 mx-auto mb-4" />
                        <p className="text-xs font-mono-display text-gray-500 uppercase tracking-widest">{t('noResults')}</p>
                    </div>
                ) : (
                    filteredScorecards.map((sc) => (
                        <div
                            key={sc.id}
                            className="group relative bg-black/40 border border-white/10 hover:border-reactor-cyan/40 p-5 rounded-[2px] transition-all duration-300"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Globe className="w-3.5 h-3.5 text-reactor-cyan" />
                            </div>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-reactor-cyan/5 border border-reactor-cyan/20 rounded-[2px]">
                                    <Database className="w-4 h-4 text-reactor-cyan" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[10px] font-mono-display font-bold text-gray-100 tracking-[0.1em] truncate">
                                        {sc.id.toUpperCase()}
                                    </h4>
                                    <p className="text-[8px] text-gray-500 font-mono-display truncate">
                                        {t('proposer')}: <span className="text-reactor-cyan/70">{sc.proposer || t('anonymous')}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-black/60 p-3 border border-white/5 rounded-[2px]">
                                    <p className="text-[8px] text-gray-600 font-mono-display mb-1">{t('clarityScore')}</p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-lg font-mono-display font-bold text-gray-200">
                                            {sc.clarity_delta ? (sc.clarity_delta * 100).toFixed(0) : '---'}
                                        </p>
                                        <span className="text-[9px] text-reactor-cyan">pts</span>
                                    </div>
                                </div>
                                <div className="bg-black/60 p-3 border border-white/5 rounded-[2px]">
                                    <p className="text-[8px] text-gray-600 font-mono-display mb-1">{t('status')}</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${sc.status === 'validated' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]'
                                            }`} />
                                        <p className={`text-[9px] font-mono-display font-bold ${sc.status === 'validated' ? 'text-green-500' : 'text-amber-500'
                                            }`}>
                                            {sc.status === 'validated' ? t('filterValidated') : sc.status === 'pending' ? t('filterPending') : t('unknown')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <span className="text-[8px] font-mono-display text-gray-600">
                                    {t('stamp')}: {new Date(sc.created_at).toLocaleDateString()}
                                </span>
                                <a
                                    href={`/api/coordination/scorecards/${sc.id}`}
                                    target="_blank"
                                    className="flex items-center gap-1 text-[9px] font-mono-display font-bold text-reactor-cyan hover:underline transition-all"
                                >
                                    {t('jsonCore')} <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>

                            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-reactor-cyan group-hover:w-full transition-all duration-500" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
