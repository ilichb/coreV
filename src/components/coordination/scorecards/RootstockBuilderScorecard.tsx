'use client';

import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, Users, FolderGit2, Zap, Clock, Activity, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface BuilderScorecard {
  address: string;
  name?: string;
  category?: string;
  did: string;
  reputation: number;
  stats: {
    proposals: number;
    totalStaked: number;
    activeGauges: number;
    timeInEcosystem: number;
  };
  proposals: Array<{
    id: string;
    title: string;
    status: string;
    relevance: string;
  }>;
  staking: {
    allocation: string;
    gauges: string[];
  };
}

function ReputationBar({ value }: { value: number }) {
  const pct = Math.min((value / 999) * 100, 100);
  const color = pct >= 75 ? 'bg-reactor-cyan' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] font-mono-display uppercase tracking-widest text-gray-600">
        <span>Reputation Score</span>
        <span className="text-reactor-cyan font-bold">{value} / 999</span>
      </div>
      <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <div className="panel p-5 bg-[#0d0f14] border border-white/5 group hover:border-reactor-cyan/20 transition-all">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">{label}</p>
          <p className={`title-orbitron text-xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-[9px] text-gray-600">{sub}</p>}
        </div>
        <div className="p-2 bg-black/40 border border-white/5 rounded-[2px] group-hover:scale-110 transition-transform">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 py-4 text-gray-600">
      <AlertCircle className="w-4 h-4 text-gray-700" />
      <span className="text-[10px] font-mono-display italic">{message}</span>
    </div>
  );
}

export default function RootstockBuilderScorecard({ address }: { address: string }) {
  const [scorecard, setScorecard] = useState<BuilderScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) fetchScorecard();
  }, [address]);

  const fetchScorecard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/rootstock/builders?address=${address}`);
      if (!response.ok) throw new Error('Builder not found');
      const data = await response.json();
      if (!data.address) throw new Error('No data returned');
      setScorecard(data);
    } catch (err: any) {
      setError(err.message || 'Could not load scorecard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6 bg-[#0d0f14] border border-white/5 rounded-[2px]">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gray-800 rounded-[2px]" />
          <div className="space-y-4 flex-1">
            <div className="h-4 bg-gray-800 w-1/3" />
            <div className="h-10 bg-gray-800 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-800" />)}
        </div>
        <p className="text-[10px] text-center text-gray-600 font-mono-display animate-pulse">
          Consulting Rootstock Subgraphs and Snapshot...
        </p>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="p-8 bg-[#0d0f14] border border-red-500/20 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500/50 mx-auto" />
        <p className="text-xs font-mono-display text-gray-500">Builder not found in Rootstock Collective</p>
        <p className="text-[10px] text-gray-700">{address}</p>
        <p className="text-[10px] text-gray-600">This address does not have on-chain activity in the Rootstock Rewards or Governance subgraphs.</p>
      </div>
    );
  }

  const allocationNum = parseFloat(scorecard.staking.allocation) || 0;
  const allocationDisplay = allocationNum > 1e15
    ? `${(allocationNum / 1e18).toPrecision(4)} rBTC`
    : `${allocationNum.toFixed(2)} wei`;

  const reputationTier =
    scorecard.reputation >= 900 ? { label: 'ELITE', color: 'text-reactor-cyan', bg: 'bg-reactor-cyan/10 border-reactor-cyan/30' } :
    scorecard.reputation >= 750 ? { label: 'VERIFIED', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' } :
    scorecard.reputation >= 600 ? { label: 'ACTIVE', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' } :
                                   { label: 'EMERGING', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30' };

  const projectName = scorecard.name || `Builder ${scorecard.address.substring(0, 8)}...`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="relative p-8 bg-gradient-to-br from-[#0d0f14] to-[#0a0b0e] border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-reactor-cyan/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          <div className="w-20 h-20 border border-reactor-cyan/20 flex items-center justify-center bg-black/40">
            <Users className="w-10 h-10 text-reactor-cyan/40" />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 tracking-wider uppercase">
                Rootstock Builder
              </span>
              {scorecard.category && (
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 tracking-wider uppercase">
                  {scorecard.category}
                </span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 border tracking-wider uppercase ${reputationTier.bg} ${reputationTier.color}`}>
                {reputationTier.label}
              </span>
            </div>

            <div>
              <h2 className="title-orbitron text-2xl md:text-3xl font-bold text-white tracking-tight">{projectName}</h2>
              <p className="text-xs font-mono-display text-gray-600 mt-1 select-all">{scorecard.address}</p>
              <p className="text-[9px] font-mono-display text-gray-700 mt-0.5 truncate">{scorecard.did}</p>
            </div>

            <ReputationBar value={scorecard.reputation} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Governance Proposals"
          value={scorecard.stats.proposals}
          sub={scorecard.stats.proposals === 0 ? 'No proposals authored' : 'On Snapshot'}
          icon={FolderGit2}
          color="text-reactor-cyan"
        />
        <StatCard
          label="Votes Cast"
          value={(scorecard as any).stats?.votesCast ?? 0}
          sub={(scorecard as any).stats?.votesCast > 0 ? 'Governance participation' : 'No votes recorded'}
          icon={Shield}
          color="text-blue-400"
        />
        <StatCard
          label="Staked Allocation"
          value={allocationDisplay}
          sub="From Rewards Subgraph"
          icon={Zap}
          color="text-orange-500"
        />
        <StatCard
          label="Days in Ecosystem"
          value={scorecard.stats.timeInEcosystem > 0 ? `${scorecard.stats.timeInEcosystem}D` : 'N/A'}
          sub="Calculated from staking history"
          icon={Clock}
          color="text-green-500"
        />
      </div>

      {/* Governance + Staking Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Proposal History */}
        <div className="bg-[#0d0f14] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <h3 className="title-orbitron text-xs font-bold text-gray-300 tracking-widest uppercase">Governance Activity</h3>
            <a
              href={(scorecard as any).governanceUrl || 'https://app.rootstockcollective.xyz/proposals'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[9px] text-reactor-cyan/60 hover:text-reactor-cyan transition-colors"
            >
              <span>ROOTSTOCK GOVERNOR</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="p-6 space-y-3">
            {scorecard.proposals.length > 0 ? (
              scorecard.proposals.map((p: any, i: number) => (
                <div key={i} className="flex items-start gap-4 group pb-3 border-b border-white/5 last:border-0">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    p.status === 'Executed' || p.status === 'Succeeded' ? 'bg-green-500' :
                    p.status === 'Defeated' ? 'bg-red-500' :
                    p.status === 'Active' ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors flex-1">{p.title}</p>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <ExternalLink className="w-2.5 h-2.5 text-gray-700 hover:text-reactor-cyan transition-colors" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold uppercase ${
                        p.status === 'Executed' || p.status === 'Succeeded' ? 'text-green-500' :
                        p.status === 'Defeated' ? 'text-red-400' :
                        p.status === 'Active' ? 'text-amber-400' : 'text-gray-600'
                      }`}>{p.status}</span>
                      {p.forVotes && p.forVotes !== '0' && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/10" />
                          <span className="text-[9px] text-green-500 font-mono-display">FOR: {parseInt(p.forVotes).toLocaleString()}</span>
                          <span className="text-[9px] text-red-400 font-mono-display">AGAINST: {parseInt(p.againstVotes || '0').toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-3">
                <EmptyState message="No on-chain proposals found for this address in the Rootstock Governor contract." />
                <p className="text-[9px] text-gray-700 leading-relaxed">
                  This builder may have activity on the Rootstock Discourse forum (pre-governance phase) or participate in governance through staking without formal proposals.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Staking Detail */}
        <div className="bg-[#0d0f14] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <h3 className="title-orbitron text-xs font-bold text-gray-300 tracking-widest uppercase">Rewards & Staking</h3>
            <span className="text-[9px] text-gray-600 font-mono-display">ROOTSTOCK SUBGRAPH</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Total Allocation</p>
              <p className="title-orbitron text-lg font-bold text-orange-400">{allocationDisplay}</p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Active Gauge Addresses</p>
              {scorecard.staking.gauges.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {scorecard.staking.gauges.map((g, i) => (
                    <div key={i} className="p-2 bg-black/40 border border-white/5 flex items-center gap-3">
                      <Zap className="w-3 h-3 text-purple-500 flex-shrink-0" />
                      <span className="text-[9px] text-gray-400 font-mono-display truncate">{g}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No gauge allocations found. Builder may only hold tokens without staking." />
              )}
            </div>

            {/* AVIP Score explanation */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Reputation Formula (AVIP)</p>
              <div className="space-y-1.5 font-mono-display text-[9px] text-gray-600">
                <div className="flex justify-between">
                  <span>Base Score</span><span className="text-gray-400">600</span>
                </div>
                <div className="flex justify-between">
                  <span>Governance Bonus</span>
                  <span className="text-reactor-cyan">+{Math.min(scorecard.stats.proposals * 25, 150)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Staking Bonus</span>
                  <span className="text-orange-400">+{Math.min(Math.round(scorecard.stats.totalStaked * 0.1), 150)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gauge Bonus</span>
                  <span className="text-purple-400">+{Math.min(scorecard.stats.activeGauges * 10, 100)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1.5 mt-1.5">
                  <span className="text-white font-bold">Final Score</span>
                  <span className={`font-bold ${reputationTier.color}`}>{scorecard.reputation}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why This Matters — Ecosystem Value Banner */}
      <div className="p-5 bg-black/40 border border-reactor-cyan/10 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-reactor-cyan" />
          <h4 className="text-[10px] font-bold text-reactor-cyan uppercase tracking-widest">Andromeda AVIP Score — What It Means</h4>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          This scorecard is generated in real time from on-chain data (Rootstock Rewards Subgraph) and off-chain governance activity (Snapshot). It allows any DAO, investor, or ecosystem participant to objectively evaluate this builder's track record — from staking commitment to governance participation — using a single verifiable score anchored to Andromeda's AVIP standard.
        </p>
      </div>
    </div>
  );
}
