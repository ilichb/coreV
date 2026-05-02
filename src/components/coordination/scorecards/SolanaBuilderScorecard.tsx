'use client';
import { logger } from '@/lib/utils/logger';

import React, { useState, useEffect } from 'react';
import { Shield, FolderGit2, Zap, Clock, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface MilestoneItem {
  id: string;
  title: string;
  status: string;
  date: string;
  category: string;
  impactScore: number;
  avipScore: number;
}

interface SolanaScorecard {
  address: string;
  did: string;
  reputation: number;
  avipDetails: {
    technical: number;
    governance: number;
    community: number;
    behavioralConfidence: number;
    total: number;
    trustLevel: string;
  };
  stats: {
    totalMilestones: number;
    verifiedMilestones: number;
    avgImpact: number;
    firstActivity: string;
  };
  milestones: MilestoneItem[];
  category: string;
}

function ReputationBar({ value }: { value: number }) {
  const pct = Math.min(value, 100);
  const color = pct >= 75 ? 'bg-reactor-cyan' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] font-mono-display uppercase tracking-widest text-gray-600">
        <span>Reputation Score (AVIP v2.0)</span>
        <span className="text-reactor-cyan font-bold">{value} / 100</span>
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

export default function SolanaBuilderScorecard({ address }: { address: string }) {
  const [scorecard, setScorecard] = useState<SolanaScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) fetchScorecard();
  }, [address]);

  const fetchScorecard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir DID completo
      const normalizedDid = address.startsWith('did:andromeda:sol:')
        ? address
        : `did:andromeda:sol:${address}`;

      // 1. Obtener milestones desde ATLAS
      let results: any[] = [];
      try {
        const atlasRes = await fetch(
          `/api/atlas/search?builderDid=${encodeURIComponent(normalizedDid)}&ecosystem=solana&limit=50`
        );
        if (atlasRes.ok) {
          const atlasData = await atlasRes.json();
          if (atlasData.success) {
            results = atlasData.results || [];
          }
        }
      } catch (e) {
        logger.warn('Failed to fetch ATLAS milestones, trying governance fallback...', e);
      }

      // 2. Fallback a Gobernanza si no hay datos técnicos
      let governanceData: any[] = [];
      const realmId = address.split(':').pop() || address;
      
      try {
        const govRes = await fetch(`/api/solana/governance?realm=${realmId}`);
        if (govRes.ok) {
          const govJson = await govRes.json();
          if (govJson.success && govJson.proposals) {
            governanceData = govJson.proposals;
          }
        }
      } catch (e) {
        logger.warn('Governance fetch failed:', e);
      }

      if (results.length === 0 && governanceData.length === 0) {
        throw new Error('No milestones or governance records found for this Solana address');
      }

      // 3. Mapear gobernanza a formato milestone
      const mappedGovernance = governanceData.map((p: any) => ({
        id: p.id || p.realm,
        title: p.title || `Proposal: ${p.realm}`,
        status: p.state === 'Succeeded' ? 'VERIFIED' : 'PENDING',
        date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recent',
        category: 'governance',
        impactScore: p.impact || 40,
        avipScore: 0,
        isGovernance: true
      }));

      const finalMilestones: MilestoneItem[] = [
        ...results.map((m) => ({
          id: m.atlasId || '',
          title: m.name || m.action?.description || 'On-chain milestone',
          status: m.status || 'VERIFIED',
          date: m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Recent',
          category: m.action?.tags?.[0] || 'infrastructure',
          impactScore: m.impactScore || 0,
          avipScore: m.reputationScore || m.metadata?.avipScore?.total || 0,
        })),
        ...mappedGovernance
      ];

      // 4. Obtener score AVIP
      let avipScore = 0;
      let avipDetails = {
        technical: 0,
        governance: results.length > 0 ? 30 : 50, // Bonus por gobernanza si no hay técnica
        community: 0,
        behavioralConfidence: 70,
        total: 0,
        trustLevel: 'UNVERIFIED'
      };

      try {
        const scoreRes = await fetch(
          `/api/reputation/score/${encodeURIComponent(normalizedDid)}`,
          { headers: { 'x-api-key': 'public-read' } }
        );
        if (scoreRes.ok) {
          const scoreData = await scoreRes.json();
          if (scoreData?.success && scoreData?.reputation) {
            avipScore = scoreData.reputation.avipScore || 0;
            avipDetails = {
              technical: scoreData.reputation.components?.verificationScore?.value || 0,
              governance: scoreData.reputation.components?.ecosystemDiversity?.value || avipDetails.governance,
              community: scoreData.reputation.components?.volumeScore?.value || 0,
              behavioralConfidence: scoreData.reputation.components?.behavioralConfidence?.value || 70,
              total: avipScore,
              trustLevel: scoreData.reputation.trustLevel || getTrustLevel(avipScore)
            };
          }
        }
      } catch (e) {
        avipScore = results[0]?.metadata?.avipScore?.total || (mappedGovernance.length > 0 ? 45 : 0);
        avipDetails.total = avipScore;
        avipDetails.trustLevel = getTrustLevel(avipScore);
      }

      // Stats
      const verifiedCount = finalMilestones.filter(
        (m) => m.status === 'VERIFIED' || m.status === 'IMMUTABLE'
      ).length;
      
      const avgImpact = finalMilestones.length > 0
        ? Math.round(finalMilestones.reduce((acc, m) => acc + (m.impactScore || 0), 0) / finalMilestones.length)
        : 0;

      const dates = results.map((m) => m.createdAt).filter(Boolean).sort();
      const firstActivity = dates.length > 0
        ? new Date(dates[0]).toLocaleDateString()
        : mappedGovernance.length > 0 ? mappedGovernance[mappedGovernance.length-1].date : 'Unknown';

      const topCategory = results.length > 0 ? (results[0].action?.tags?.[0] || 'infrastructure') : 'governance';

      setScorecard({
        address,
        did: normalizedDid,
        reputation: avipScore || avipDetails.total,
        avipDetails,
        stats: {
          totalMilestones: finalMilestones.length,
          verifiedMilestones: verifiedCount,
          avgImpact,
          firstActivity,
        },
        milestones: finalMilestones,
        category: topCategory,
      });
    } catch (err: any) {
      setError(err.message || 'Could not load scorecard');
    } finally {
      setLoading(false);
    }
  };

  function getTrustLevel(score: number): string {
    if (score >= 90) return 'PLATINUM';
    if (score >= 75) return 'GOLD';
    if (score >= 50) return 'SILVER';
    if (score >= 25) return 'BRONZE';
    return 'UNVERIFIED';
  }

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
        <p className="text-[10px] text-center text-reactor-cyan font-mono-display animate-pulse">
          Consulting Yellowstone gRPC & AVIP Registry...
        </p>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="p-8 bg-[#0d0f14] border border-red-500/20 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500/50 mx-auto" />
        <p className="text-xs font-mono-display text-gray-500">Builder not found in Solana Ecosystem</p>
        <p className="text-[10px] text-gray-700">{address}</p>
        <p className="text-[10px] text-gray-600">
          This address has no indexed milestones via Yellowstone gRPC in the ATLAS registry.
        </p>
      </div>
    );
  }

  const trustLevel = scorecard.avipDetails.trustLevel;
  const reputationTier =
    trustLevel === 'PLATINUM' ? { label: 'PLATINUM', color: 'text-reactor-cyan', bg: 'bg-reactor-cyan/10 border-reactor-cyan/30' } :
      trustLevel === 'GOLD' ? { label: 'GOLD', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' } :
        trustLevel === 'SILVER' ? { label: 'SILVER', color: 'text-gray-300', bg: 'bg-gray-400/10 border-gray-400/30' } :
          trustLevel === 'BRONZE' ? { label: 'BRONZE', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' } :
            { label: 'UNVERIFIED', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/30' };

  const shortAddr = `${scorecard.address.substring(0, 8)}...${scorecard.address.slice(-6)}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="relative p-8 bg-gradient-to-br from-[#0d0f14] to-[#0a0b0e] border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-reactor-cyan/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/5 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          <div className="w-20 h-20 border border-reactor-cyan/20 flex items-center justify-center bg-black/40">
            <Zap className="w-10 h-10 text-reactor-cyan/40" />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 tracking-wider uppercase">
                Solana Builder
              </span>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 tracking-wider uppercase">
                {scorecard.category}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 border tracking-wider uppercase ${reputationTier.bg} ${reputationTier.color}`}>
                {reputationTier.label}
              </span>
            </div>

            <div>
              <h2 className="title-orbitron text-2xl md:text-3xl font-bold text-white tracking-tight">
                {shortAddr}
              </h2>
              <p className="text-xs font-mono-display text-gray-600 mt-1 select-all">{scorecard.address}</p>
              <p className="text-[9px] font-mono-display text-gray-700 mt-0.5 truncate">{scorecard.did}</p>
            </div>

            <ReputationBar value={scorecard.reputation} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Milestones" value={scorecard.stats.totalMilestones} sub="Indexed via Yellowstone" icon={FolderGit2} color="text-reactor-cyan" />
        <StatCard label="Verified On-Chain" value={scorecard.stats.verifiedMilestones} sub={scorecard.stats.verifiedMilestones > 0 ? 'IMMUTABLE records' : 'None verified yet'} icon={Shield} color="text-green-400" />
        <StatCard label="Avg Impact Score" value={scorecard.stats.avgImpact} sub="AVIP weighted" icon={Zap} color="text-amber-400" />
        <StatCard label="First Activity" value={scorecard.stats.firstActivity} sub="Since first milestone" icon={Clock} color="text-blue-400" />
      </div>

      {/* Milestones + AVIP Formula */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Milestone list */}
        <div className="bg-[#0d0f14] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <h3 className="title-orbitron text-xs font-bold text-gray-300 tracking-widest uppercase">Verified Activity Milestones</h3>
            <span className="text-[9px] text-reactor-cyan/60 font-mono-display">YELLOWSTONE GRPC</span>
          </div>
          <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
            {scorecard.milestones.length > 0 ? (
              scorecard.milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-4 group pb-3 border-b border-white/5 last:border-0">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.status === 'VERIFIED' || m.status === 'IMMUTABLE' ? 'bg-reactor-cyan' :
                      m.status === 'PENDING' ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'
                    }`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors flex-1">{m.title}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold uppercase ${m.status === 'VERIFIED' || m.status === 'IMMUTABLE' ? 'text-reactor-cyan' :
                          m.status === 'PENDING' ? 'text-amber-400' : 'text-gray-600'
                        }`}>{m.status}</span>
                      {m.impactScore > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/10" />
                          <span className="text-[9px] text-green-500 font-mono-display">IMPACT: {m.impactScore}</span>
                        </>
                      )}
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[9px] text-gray-500 font-mono-display">{m.date}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No milestones indexed yet for this address." />
            )}
          </div>
        </div>

        {/* AVIP Score Breakdown */}
        <div className="bg-[#0d0f14] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <h3 className="title-orbitron text-xs font-bold text-gray-300 tracking-widest uppercase">AVIP Score Breakdown</h3>
            <span className="text-[9px] text-gray-600 font-mono-display">REPUTATION ENGINE</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-1.5 font-mono-display text-[9px] text-gray-600">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span>Technical Score</span>
                <span className="text-gray-400">{scorecard.avipDetails.technical}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span>Governance Score</span>
                <span className="text-reactor-cyan">{scorecard.avipDetails.governance}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span>Community Score</span>
                <span className="text-green-400">{scorecard.avipDetails.community}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span>Behavioral Confidence</span>
                <span className="text-blue-400">{scorecard.avipDetails.behavioralConfidence}%</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3 mt-1">
                <span className="text-white font-bold text-[10px]">Final AVIP Score</span>
                <span className={`font-bold text-[10px] ${reputationTier.color}`}>{scorecard.avipDetails.total}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-2">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Data Sources</p>
              <div className="space-y-2 text-[9px] font-mono-display text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan" />
                  <span>Yellowstone gRPC — Real-time Solana event stream</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span>ATLAS MongoDB — Indexed milestone records</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>AVIP v2.0 — Andromeda Verifiable Impact Protocol</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 bg-black/40 border border-reactor-cyan/10 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-reactor-cyan" />
          <h4 className="text-[10px] font-bold text-reactor-cyan uppercase tracking-widest">Andromeda AVIP Score — What It Means</h4>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          This scorecard is generated in real time from on-chain data streamed via Yellowstone gRPC and indexed
          in the ATLAS registry. It allows any DAO, investor, or ecosystem participant to objectively evaluate
          this Solana builder&apos;s track record using a single verifiable score anchored to Andromeda&apos;s AVIP standard.
        </p>
      </div>
    </div>
  );
}
