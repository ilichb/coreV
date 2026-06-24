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

export default function InternalFESDashboard() {
    const [data, setData] = useState<FESMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'overview' | 'holders' | 'messages' | 'whales'>('overview');

    useEffect(() => {
        fetch('/api/fes/metrics')
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);
                setData(d);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-[#050608] text-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-[10px] font-mono text-gray-500 animate-pulse">LOADING FES METRICS...</div>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[#050608] text-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-[10px] font-mono text-red-400 bg-red-400/5 border border-red-400/20 px-4 py-2">{error}</div>
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
        <div className="min-h-screen bg-[#050608] text-gray-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <header className="border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.4)]" />
                        <span className="text-[10px] font-mono font-medium text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-1 tracking-widest">
                            INTERNAL — FES DASHBOARD
                        </span>
                    </div>
                    <h1 className="text-xl font-mono font-bold tracking-tighter">
                        FES PILOT <span className="text-gray-500">DASHBOARD</span>
                    </h1>
                    <p className="text-[9px] font-mono text-gray-700 mt-1">
                        Internal use only. Generated: {data.metadata?.generatedAt ? new Date(data.metadata.generatedAt).toLocaleString() : 'N/A'}
                    </p>
                </header>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-800">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`text-[10px] font-mono px-4 py-2 border-b-2 transition-all ${tab === t.id
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
                    <div className="space-y-6">
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="border border-gray-800 bg-black/40 p-4">
                                <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Total Holders</div>
                                <div className="text-lg font-mono font-bold text-gray-200 mt-1">{data.count}</div>
                            </div>
                            <div className="border border-gray-800 bg-black/40 p-4">
                                <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Cohort A</div>
                                <div className="text-lg font-mono font-bold text-[#00f0ff] mt-1">{data.cohorts?.A?.count || 0}</div>
                                <div className="text-[8px] font-mono text-gray-700">{data.cohorts?.A?.avgDaysInactive?.toFixed(1) || 0} avg days</div>
                            </div>
                            <div className="border border-gray-800 bg-black/40 p-4">
                                <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Cohort B</div>
                                <div className="text-lg font-mono font-bold text-[#f59e0b] mt-1">{data.cohorts?.B?.count || 0}</div>
                                <div className="text-[8px] font-mono text-gray-700">{data.cohorts?.B?.avgDaysInactive?.toFixed(1) || 0} avg days</div>
                            </div>
                            <div className="border border-gray-800 bg-black/40 p-4">
                                <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Whales (VIP)</div>
                                <div className="text-lg font-mono font-bold text-[#ff6b6b] mt-1">{data.whales.length}</div>
                            </div>
                        </div>

                        {/* Cohort balance comparison */}
                        <div className="border border-gray-800 bg-black/40 p-4">
                            <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-3">Cohort Balance Comparison</div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-[#00f0ff] w-16">Cohort A</span>
                                    <div className="flex-1 h-4 bg-gray-900 relative">
                                        <div
                                            className="h-full bg-[#00f0ff]/30"
                                            style={{ width: `${Math.min((data.cohorts?.A?.avgBalance || 0) / 10000, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400 w-24 text-right">
                                        {(data.cohorts?.A?.avgBalance || 0).toLocaleString()} RIF
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-[#f59e0b] w-16">Cohort B</span>
                                    <div className="flex-1 h-4 bg-gray-900 relative">
                                        <div
                                            className="h-full bg-[#f59e0b]/30"
                                            style={{ width: `${Math.min((data.cohorts?.B?.avgBalance || 0) / 10000, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400 w-24 text-right">
                                        {(data.cohorts?.B?.avgBalance || 0).toLocaleString()} RIF
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Strategy info */}
                        <div className="border border-gray-800 bg-black/40 p-4">
                            <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-2">Strategy</div>
                            <div className="text-[10px] font-mono text-gray-500">
                                {data.metadata?.cohortStrategy || 'Deterministic stratified alternate-pair assignment'}
                            </div>
                            <div className="text-[9px] font-mono text-gray-700 mt-2">
                                {data.metadata?.note || ''}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Holders */}
                {tab === 'holders' && (
                    <div className="border border-gray-800 bg-black/40 overflow-x-auto">
                        <table className="w-full text-[10px] font-mono">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-600 uppercase tracking-widest">
                                    <th className="text-left p-3">Wallet Hash</th>
                                    <th className="text-right p-3">Balance</th>
                                    <th className="text-right p-3">Days Inactive</th>
                                    <th className="text-center p-3">Cohort</th>
                                    <th className="text-right p-3">Proj. Yield</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.holders.map((h, i) => (
                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                                        <td className="p-3 text-gray-400">{h.walletHash.slice(0, 16)}...</td>
                                        <td className="p-3 text-right text-gray-200">{h.balance.toLocaleString()}</td>
                                        <td className="p-3 text-right text-gray-400">{h.daysInactive}d</td>
                                        <td className="p-3 text-center">
                                            <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${h.cohort === 'WHALE' ? 'border-[#ff6b6b]/40 text-[#ff6b6b]'
                                                    : h.cohort === 'B' ? 'border-[#f59e0b]/40 text-[#f59e0b]'
                                                        : h.cohort === 'A' ? 'border-[#00f0ff]/40 text-[#00f0ff]'
                                                            : 'border-gray-700 text-gray-600'
                                                }`}>
                                                {h.cohort || '—'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right text-[#f59e0b]">
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
                        <table className="w-full text-[10px] font-mono">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-600 uppercase tracking-widest">
                                    <th className="text-left p-3">Wallet Hash</th>
                                    <th className="text-right p-3">Balance</th>
                                    <th className="text-right p-3">Days Inactive</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.whales.map((w, i) => (
                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                                        <td className="p-3 text-gray-400">{w.walletHash.slice(0, 16)}...</td>
                                        <td className="p-3 text-right text-[#ff6b6b] font-bold">{w.balance.toLocaleString()} RIF</td>
                                        <td className="p-3 text-right text-gray-400">{w.daysInactive}d</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab: Messages */}
                {tab === 'messages' && (
                    <div className="space-y-6">
                        {(['control', 'treatment', 'vip'] as const).map(variant => {
                            const msgData = data.messages[variant];
                            if (!msgData || msgData.total === 0) return null;
                            return (
                                <div key={variant} className="border border-gray-800 bg-black/40">
                                    <div className="border-b border-gray-800 px-4 py-3 flex items-center gap-2">
                                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border ${variant === 'vip' ? 'border-[#ff6b6b]/40 text-[#ff6b6b]'
                                                : variant === 'treatment' ? 'border-[#f59e0b]/40 text-[#f59e0b]'
                                                    : 'border-[#00f0ff]/40 text-[#00f0ff]'
                                            }`}>
                                            {variant.toUpperCase()}
                                        </span>
                                        <span className="text-[9px] font-mono text-gray-600">{msgData.total} messages</span>
                                    </div>
                                    {msgData.sample.map((msg: any, i: number) => (
                                        <div key={i} className="px-4 py-3 border-b border-gray-800/50 last:border-b-0">
                                            <div className="text-[10px] font-mono font-bold text-gray-300 mb-1">{msg.subject}</div>
                                            <div className="text-[9px] font-mono text-gray-600 whitespace-pre-line leading-relaxed">
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
                <footer className="border-t border-gray-800 pt-4 pb-8">
                    <div className="text-[9px] font-mono text-gray-700">
                        INTERNAL DASHBOARD — Not for public access. Data source: Rewards Subgraph.
                    </div>
                </footer>

            </div>
        </div>
    );
}
