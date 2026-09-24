'use client';

import { useState, useEffect } from 'react';

interface FESMetrics {
    count: number;
    holders: Array<{
        walletHash: string;
        balance: number;
        daysInactive: number;
        lastStakeActivity: string;
        cohort: string | null;
        message_variant: string | null;
        yieldProjection: {
            projectedYieldRIF: number;
            aprUsed: number;
            recommendedBuilders: Array<{ name: string; category: string; address: string }>;
        };
    }>;
    cohorts: {
        A: { count: number; avgDaysInactive: number; avgBalance: number };
        B: { count: number; avgDaysInactive: number; avgBalance: number };
    };
    whales: Array<{
        walletHash: string;
        balance: number;
        daysInactive: number;
    }>;
    messages: {
        control: { total: number; sample: any[] };
        treatment: { total: number; sample: any[] };
        vip: { total: number; sample: any[] };
    };
    reactivation: any;
    metadata: any;
}

const LOADING_STAGES = [
    'QUERYING REWARDS SUBGRAPH…',
    'RESOLVING RIF BALANCES VIA RPC…',
    'ASSIGNING COHORTS A / B / WHALE…',
    'PROJECTING YIELDS…',
];

function FesLoadingSkeleton() {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setStage(s => (s + 1) % LOADING_STAGES.length), 2400);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen bg-[#050608] text-gray-100 p-6 md:p-10">
            <style>{`
                @keyframes fes-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
                @keyframes fes-fadein { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
                @keyframes fes-slide { 0% { left: -35%; } 100% { left: 100%; } }
            `}</style>
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="border-b border-gray-800 pb-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-ping" />
                        <span className="text-xs font-mono font-medium text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-4 py-1.5 tracking-widest">
                            INTERNAL — FES DASHBOARD
                        </span>
                    </div>
                    <h1 className="text-3xl font-mono font-bold tracking-tighter">
                        FES PILOT <span className="text-gray-500">DASHBOARD</span>
                    </h1>
                    <p key={stage} style={{ animation: 'fes-fadein 0.4s ease-out' }} className="text-xs font-mono text-[#00f0ff]/70 mt-2">
                        ▸ {LOADING_STAGES[stage]}
                    </p>
                </header>

                {/* Status / progress */}
                <div className="border border-gray-800 bg-black/40 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-5 h-5 rounded-full border-2 border-gray-700 border-t-[#00f0ff] animate-spin shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono text-gray-400 tracking-widest">LOADING FES METRICS</span>
                                <span className="text-xs font-mono text-gray-600">{stage + 1}/{LOADING_STAGES.length}</span>
                            </div>
                            <div className="h-1.5 bg-gray-900 relative overflow-hidden">
                                <div style={{ animation: 'fes-slide 1.6s ease-in-out infinite' }} className="absolute top-0 h-full w-1/3 bg-[#00f0ff]/60" />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-1.5 mt-4">
                        {LOADING_STAGES.map((_, i) => (
                            <div key={i} className={`h-1 flex-1 ${i <= stage ? 'bg-[#00f0ff]/50' : 'bg-gray-800'}`} />
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-800">
                    {['Overview', 'Holders', 'Whales', 'Messages'].map((t, i) => (
                        <div key={t} className={`text-sm font-mono px-6 py-3 border-b-2 ${i === 0 ? 'border-[#00f0ff] text-[#00f0ff]' : 'border-transparent text-gray-700'}`}>
                            {t}
                        </div>
                    ))}
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['TOTAL HOLDERS', 'COHORT A', 'COHORT B', 'WHALES (VIP)'].map(label => (
                        <div key={label} className="border border-gray-800 bg-black/40 p-6 relative overflow-hidden">
                            <div className="text-xs font-mono text-gray-600 uppercase tracking-widest">{label}</div>
                            <div className="h-8 w-24 bg-gray-800/80 rounded-sm mt-3 animate-pulse" />
                            <div className="h-4 w-28 bg-gray-800/40 rounded-sm mt-2 animate-pulse" />
                            <div style={{ animation: 'fes-shimmer 1.8s ease-in-out infinite' }} className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                        </div>
                    ))}
                </div>

                {/* Cohort balance comparison */}
                <div className="border border-gray-800 bg-black/40 p-6">
                    <div className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-4">Cohort Balance Comparison</div>
                    <div className="space-y-4">
                        {[
                            { label: 'Cohort A', color: 'bg-[#00f0ff]/30', width: '45%' },
                            { label: 'Cohort B', color: 'bg-[#f59e0b]/30', width: '62%' },
                        ].map(row => (
                            <div key={row.label} className="flex items-center gap-4">
                                <span className="text-sm font-mono text-gray-600 w-24">{row.label}</span>
                                <div className="flex-1 h-6 bg-gray-900 relative overflow-hidden">
                                    <div style={{ width: row.width }} className={`h-full ${row.color} animate-pulse`} />
                                </div>
                                <div className="h-4 w-32 bg-gray-800/60 rounded-sm animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Strategy */}
                <div className="border border-gray-800 bg-black/40 p-6 space-y-3">
                    <div className="text-xs font-mono text-gray-600 uppercase tracking-widest">Strategy</div>
                    <div className="h-4 w-3/4 bg-gray-800/60 rounded-sm animate-pulse" />
                    <div className="h-4 w-1/2 bg-gray-800/40 rounded-sm animate-pulse" />
                </div>

            </div>
        </div>
    );
}

export default function InternalFESDashboard() {
    const [data, setData] = useState<FESMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'overview' | 'holders' | 'messages' | 'whales'>('overview');

    useEffect(() => {
        fetch('/api/fes/metrics', { credentials: 'include' })
            .then(r => r.json().then(d => ({ ok: r.ok, d })))
            .then(({ ok, d }) => {
                if (!ok || d.error) {
                    if (d.error === 'Unauthorized') {
                        window.location.href = window.location.pathname.replace('/fes', '/login');
                        return;
                    }
                    throw new Error(d.error || 'Failed to load metrics');
                }
                setData(d);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <FesLoadingSkeleton />;

    if (error) return (
        <div className="min-h-screen bg-[#050608] text-gray-100 p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="text-sm font-mono text-red-400 bg-red-400/5 border border-red-400/20 px-5 py-3">{error}</div>
            </div>
        </div>
    );

    if (!data) return null;

    const tabs = [
        { id: 'overview' as const, label: 'Overview' },
        { id: 'holders' as const, label: `Holders (${data.count})` },
        { id: 'whales' as const, label: `Whales (${data.whales.length})` },
        { id: 'messages' as const, label: 'Messages' },
    ];

    return (
        <div className="min-h-screen bg-[#050608] text-gray-100 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="border-b border-gray-800 pb-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.4)]" />
                            <span className="text-xs font-mono font-medium text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-1.5 tracking-widest">
                                INTERNAL — FES DASHBOARD
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                fetch('/api/internal/logout', { method: 'POST', credentials: 'include' }).finally(() => {
                                    window.location.href = window.location.pathname.replace('/fes', '/login');
                                });
                            }}
                            className="text-xs font-mono text-gray-600 hover:text-gray-300 border border-gray-800 hover:border-gray-600 px-3 py-1.5"
                        >
                            LOGOUT
                        </button>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-tighter">
                        FES PILOT <span className="text-gray-500">DASHBOARD</span>
                    </h1>
                    <p className="text-xs font-mono text-gray-500 mt-2">
                        Internal use only. Generated: {data.metadata?.generatedAt ? new Date(data.metadata.generatedAt).toLocaleString() : 'N/A'}
                    </p>
                </header>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-800">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`text-sm font-mono px-6 py-3 border-b-2 transition-all ${tab === t.id
                                    ? 'border-[#00f0ff] text-[#00f0ff]'
                                    : 'border-transparent text-gray-600 hover:text-gray-400'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Overview */}
                {tab === 'overview' && (
                    <div className="space-y-8">
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="border border-gray-800 bg-black/40 p-6">
                                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">Total Holders</div>
                                <div className="text-3xl font-mono font-bold text-gray-200 mt-2">{data.count}</div>
                            </div>
                            <div className="border border-gray-800 bg-black/40 p-6">
                                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">Cohort A</div>
                                <div className="text-3xl font-mono font-bold text-[#00f0ff] mt-2">{data.cohorts?.A?.count || 0}</div>
                                <div className="text-xs font-mono text-gray-500 mt-1">{data.cohorts?.A?.avgDaysInactive?.toFixed(1) || 0} avg days</div>
                            </div>
                            <div className="border border-gray-800 bg-black/40 p-6">
                                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">Cohort B</div>
                                <div className="text-3xl font-mono font-bold text-[#f59e0b] mt-2">{data.cohorts?.B?.count || 0}</div>
                                <div className="text-xs font-mono text-gray-500 mt-1">{data.cohorts?.B?.avgDaysInactive?.toFixed(1) || 0} avg days</div>
                            </div>
                            <div className="border border-gray-800 bg-black/40 p-6">
                                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">Whales (VIP)</div>
                                <div className="text-3xl font-mono font-bold text-[#ff6b6b] mt-2">{data.whales.length}</div>
                            </div>
                        </div>

                        {/* Cohort balance comparison */}
                        <div className="border border-gray-800 bg-black/40 p-6">
                            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">Cohort Balance Comparison</div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-mono font-bold text-[#00f0ff] w-24">Cohort A</span>
                                    <div className="flex-1 h-6 bg-gray-900 relative">
                                        <div
                                            className="h-full bg-[#00f0ff]/30"
                                            style={{ width: `${Math.min((data.cohorts?.A?.avgBalance || 0) / 10000, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-mono text-gray-300 w-36 text-right">
                                        {(data.cohorts?.A?.avgBalance || 0).toLocaleString()} RIF
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-mono font-bold text-[#f59e0b] w-24">Cohort B</span>
                                    <div className="flex-1 h-6 bg-gray-900 relative">
                                        <div
                                            className="h-full bg-[#f59e0b]/30"
                                            style={{ width: `${Math.min((data.cohorts?.B?.avgBalance || 0) / 10000, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-mono text-gray-300 w-36 text-right">
                                        {(data.cohorts?.B?.avgBalance || 0).toLocaleString()} RIF
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Strategy info */}
                        <div className="border border-gray-800 bg-black/40 p-6">
                            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Strategy</div>
                            <div className="text-sm font-mono text-gray-400 leading-relaxed">
                                {data.metadata?.cohortStrategy || 'Deterministic stratified alternate-pair assignment'}
                            </div>
                            <div className="text-xs font-mono text-gray-600 mt-3 leading-relaxed">
                                {data.metadata?.note || ''}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Holders */}
                {tab === 'holders' && (
                    <div className="border border-gray-800 bg-black/40 overflow-x-auto">
                        <table className="w-full text-sm font-mono">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-widest">
                                    <th className="text-left p-4">Wallet Hash</th>
                                    <th className="text-right p-4">Balance</th>
                                    <th className="text-right p-4">Days Inactive</th>
                                    <th className="text-center p-4">Cohort</th>
                                    <th className="text-right p-4">Proj. Yield</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.holders.map((h, i) => (
                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                                        <td className="p-4 text-gray-400">{h.walletHash.slice(0, 16)}...</td>
                                        <td className="p-4 text-right text-gray-200">{h.balance.toLocaleString()}</td>
                                        <td className="p-4 text-right text-gray-400">{h.daysInactive}d</td>
                                        <td className="p-4 text-center">
                                            <span className={`text-xs font-bold px-2 py-1 border ${h.cohort === 'WHALE' ? 'border-[#ff6b6b]/40 text-[#ff6b6b]'
                                                    : h.cohort === 'B' ? 'border-[#f59e0b]/40 text-[#f59e0b]'
                                                        : h.cohort === 'A' ? 'border-[#00f0ff]/40 text-[#00f0ff]'
                                                            : 'border-gray-700 text-gray-600'
                                                }`}>
                                                {h.cohort || '—'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-[#f59e0b]">
                                            {h.yieldProjection?.projectedYieldRIF
                                                ? `~${Math.round(h.yieldProjection.projectedYieldRIF).toLocaleString()} RIF`
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab: Whales */}
                {tab === 'whales' && (
                    <div className="border border-gray-800 bg-black/40 overflow-x-auto">
                        <table className="w-full text-sm font-mono">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-widest">
                                    <th className="text-left p-4">Wallet Hash</th>
                                    <th className="text-right p-4">Balance</th>
                                    <th className="text-right p-4">Days Inactive</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.whales.map((w, i) => (
                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                                        <td className="p-4 text-gray-400">{w.walletHash.slice(0, 16)}...</td>
                                        <td className="p-4 text-right text-[#ff6b6b] font-bold">{w.balance.toLocaleString()} RIF</td>
                                        <td className="p-4 text-right text-gray-400">{w.daysInactive}d</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab: Messages */}
                {tab === 'messages' && (
                    <div className="space-y-8">
                        {(['control', 'treatment', 'vip'] as const).map(variant => {
                            const msgData = data.messages[variant];
                            if (!msgData || msgData.total === 0) return null;
                            return (
                                <div key={variant} className="border border-gray-800 bg-black/40">
                                    <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
                                        <span className={`text-xs font-mono font-bold px-2 py-1 border ${variant === 'vip' ? 'border-[#ff6b6b]/40 text-[#ff6b6b]'
                                                : variant === 'treatment' ? 'border-[#f59e0b]/40 text-[#f59e0b]'
                                                    : 'border-[#00f0ff]/40 text-[#00f0ff]'
                                            }`}>
                                            {variant.toUpperCase()}
                                        </span>
                                        <span className="text-xs font-mono text-gray-500">{msgData.total} messages</span>
                                    </div>
                                    {msgData.sample.map((msg: any, i: number) => (
                                        <div key={i} className="px-6 py-4 border-b border-gray-800/50 last:border-b-0">
                                            <div className="text-sm font-mono font-bold text-gray-200 mb-2">{msg.subject}</div>
                                            <div className="text-xs font-mono text-gray-500 whitespace-pre-line leading-relaxed">
                                                {msg.body?.slice(0, 300)}...
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                <footer className="border-t border-gray-800 pt-5 pb-10">
                    <div className="text-xs font-mono text-gray-600">
                        INTERNAL DASHBOARD — Not for public access. Data source: Rewards Subgraph.
                    </div>
                </footer>

            </div>
        </div>
    );
}
