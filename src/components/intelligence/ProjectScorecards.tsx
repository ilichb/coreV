'use client';

import { useScorecards } from '@/hooks/coordination/state/useScorecards';
import { Activity, Beaker, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export function ProjectScorecards() {
    const { scorecards, loading, error } = useScorecards({ limit: 10 });

    if (loading) {
        return (
            <div className="space-y-3 p-2">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-black/40 border border-gray-800/30 animate-pulse rounded-[2px]" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-black/60 border border-warning-orange/30 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning-orange" />
                    <p className="text-xs font-mono-display text-warning-orange tracking-tight uppercase">
                        COMMUNICATION FAILURE WITH COORDINATION LAYER
                    </p>
                </div>
                <p className="text-[10px] text-gray-500 font-mono-display pl-8">
                    Check system diagnostic for status: <a href="/api/coordination/diagnostic" className="text-reactor-cyan underline">/diagnostic</a>
                </p>
            </div>
        );
    }

    if (!scorecards || scorecards.length === 0) {
        return (
            <div className="p-8 text-center border border-dashed border-gray-800 rounded-[2px]">
                <p className="text-xs font-mono-display text-gray-600 uppercase tracking-widest">
                    No projects detected in coordination layer
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3 p-2 h-[450px] overflow-y-auto custom-scrollbar">
            {scorecards.map((sc) => (
                <div
                    key={sc.id}
                    className="group relative bg-black/60 border border-reactor-cyan/20 hover:border-reactor-cyan/50 p-3 rounded-[2px] transition-all duration-300"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-reactor-cyan/10 border border-reactor-cyan/30 rounded-[2px]">
                                <Beaker className="w-3.5 h-3.5 text-reactor-cyan" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-mono-display font-bold text-white tracking-wider truncate max-w-[150px]">
                                    {sc.id.substring(0, 12).toUpperCase()}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] font-mono-display text-gray-500 uppercase">
                                        PROPOSER: {sc.proposer?.substring(0, 8)}...
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={`px-2 py-0.5 border rounded-[2px] text-[9px] font-mono-display font-bold
              ${sc.status === 'validated' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                                sc.status === 'rejected' ? 'border-warning-orange/30 text-warning-orange bg-warning-orange/5' :
                                    'border-reactor-cyan/30 text-reactor-cyan bg-reactor-cyan/5'}`}
                        >
                            {sc.status?.toUpperCase() || 'UNKNOWN'}
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-black/40 p-2 border border-gray-800/50">
                            <p className="text-[8px] text-gray-600 font-mono-display uppercase tracking-widest mb-1">CLARITY DELTA</p>
                            <p className="text-sm font-bold font-mono-display text-reactor-cyan tabular-nums">
                                {sc.clarity_delta ? `${(sc.clarity_delta * 100).toFixed(1)}%` : '---'}
                            </p>
                        </div>
                        <div className="bg-black/40 p-2 border border-gray-800/50">
                            <p className="text-[8px] text-gray-600 font-mono-display uppercase tracking-widest mb-1">SYSTEM SCORE</p>
                            <p className="text-sm font-bold font-mono-display text-green-400 tabular-nums">
                                {sc.system_score?.overall || '---'}
                            </p>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-[9px] font-mono-display">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(sc.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-reactor-cyan/70 hover:text-reactor-cyan cursor-pointer transition-colors">
                            <Activity className="w-3 h-3" />
                            <span className="underline decoration-dotted">VIEW ON IPFS</span>
                        </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-reactor-cyan/0 via-reactor-cyan/5 to-reactor-cyan/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
            ))}
        </div>
    );
}
