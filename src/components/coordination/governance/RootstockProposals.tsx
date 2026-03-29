'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardList, ExternalLink, ShieldCheck, Zap, ArrowRight, Clock } from 'lucide-react';
import EmbeddedDisplay from '@/components/widgets/EmbeddedDisplay';
import { logger } from '../../../lib/utils/logger';

interface Proposal {
    id: string;
    title: string;
    implementation?: string;
    blockNumber: string;
    blockTimestamp: string;
    transactionHash?: string;
}

export default function RootstockProposals() {
    const t = useTranslations('RootstockProposals');
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProposals();
    }, []);

    const fetchProposals = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/rootstock/proposals');
            const data = await response.json();
            setProposals(data.proposals || []);
        } catch (error) {
            logger.error('Error fetching Rootstock proposals:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(parseInt(timestamp) * 1000);
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="title-orbitron text-xs font-bold text-reactor-cyan tracking-widest uppercase flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    On-Chain Governance
                </h3>
                <span className="text-[10px] font-mono-display text-gray-500 bg-reactor-cyan/5 px-2 py-1 border border-reactor-cyan/20">
                    ROOTSTOCK MAINNET
                </span>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-black/40 border border-white/5 animate-pulse rounded-[2px]" />
                    ))}
                </div>
            ) : proposals.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-reactor-cyan/20 rounded-[2px]">
                    <ClipboardList className="w-8 h-8 text-gray-700 mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-mono-display text-gray-500 uppercase tracking-widest">No proposals found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {proposals.map((proposal) => (
                        <div
                            key={proposal.id}
                            className="group relative p-4 bg-[#0d0f14] border border-white/5 hover:border-reactor-cyan/30 transition-all rounded-[2px] overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink className="w-3 h-3 text-reactor-cyan" />
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan animate-pulse shadow-[0_0_8px_rgba(0,212,255,0.4)]" />
                                        <span className="text-[10px] font-mono-display font-bold text-reactor-cyan tracking-wider uppercase">
                                            Proposal {proposal.id.substring(0, 8)}...
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-100 group-hover:text-white transition-colors">
                                        {proposal.implementation ? `Upgrade to ${proposal.implementation.substring(0, 10)}...` : 'Domain Specification Change'}
                                    </h4>
                                    <div className="flex items-center gap-4 text-[10px] font-mono-display text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(proposal.blockTimestamp)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" />
                                            Block {proposal.blockNumber}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 border border-white/5 bg-black/40 rounded-[2px] text-center min-w-[80px]">
                                        <p className="text-[8px] text-gray-600 uppercase mb-1">Status</p>
                                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">EXECUTED</p>
                                    </div>
                                    <button className="p-2 bg-reactor-cyan/5 border border-reactor-cyan/20 text-reactor-cyan hover:bg-reactor-cyan/10 transition-colors rounded-[1px]">
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="pt-4 flex justify-center">
                <button
                    onClick={fetchProposals}
                    className="text-[9px] font-mono-display text-reactor-cyan/60 hover:text-reactor-cyan uppercase tracking-[0.2em] transition-colors"
                >
                    Refresh Feed
                </button>
            </div>
        </div>
    );
}
