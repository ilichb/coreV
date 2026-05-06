'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Shield, Users, FolderGit2, Zap, Clock,
  ExternalLink, CheckCircle, AlertCircle
} from 'lucide-react';

// Refleja exactamente la interfaz de reputation-engine.service.ts
interface AVIPScore {
  total:                number;   // 0..100
  technical:            number;
  governance:           number;
  community:            number;
  behavioralConfidence: number;   // 0..1
  isAnomaly:            boolean;
  decayedAt:            string;
}

interface BuilderScorecard {
  address:    string;
  name?:      string;
  category?:  string;
  did:        string;
  reputation: number;    // 0..999 — escala UI Rootstock

  /** Score AVIP completo en 0..100, del motor real */
  avipScore?: AVIPScore;

  /** Input normalizado pasado al motor — para breakdown real */
  avipInput?: {
    technical:       number;
    governance:      number;
    community:       number;
    verifiedCount:   number;
    totalMilestones: number;
  };

  stats: {
    proposals:       number;
    totalStaked:     number;
    activeGauges:    number;
    timeInEcosystem: number;
    votesCast?:      number;
  };
  proposals: Array<{
    id:           string;
    title:        string;
    status:       string;
    relevance:    string;
    url?:         string;
    forVotes?:    string;
    againstVotes?: string;
  }>;
  staking: {
    allocation: string;
    gauges:     string[];
  };
}

function ReputationBar({ value, label }: { value: number; label: string }) {
  const pct   = Math.min((value / 999) * 100, 100);
  const color = pct >= 75 ? 'bg-reactor-cyan' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] font-mono-display uppercase tracking-widest text-gray-600">
        <span>{label}</span>
        <span className="text-reactor-cyan font-bold">{value} / 999</span>
      </div>
      <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, icon: Icon, color
}: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
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
  const t = useTranslations('RootstockBuilderScorecard');

  const [scorecard, setScorecard] = useState<BuilderScorecard | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

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
          {t('Loading.consulting')}
        </p>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="p-8 bg-[#0d0f14] border border-red-500/20 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500/50 mx-auto" />
        <p className="text-xs font-mono-display text-gray-500">{t('Error.notFound')}</p>
        <p className="text-[10px] text-gray-700">{address}</p>
        <p className="text-[10px] text-gray-600">{t('Error.noActivity')}</p>
      </div>
    );
  }

  const stakingInfo    = scorecard?.staking || { allocation: '0', gauges: [] };
  const allocationNum  = parseFloat(stakingInfo?.allocation || '0') || 0;
  const allocationDisplay = allocationNum > 1e15
    ? `${(allocationNum / 1e18).toPrecision(4)} rBTC`
    : `${allocationNum.toFixed(2)} wei`;

  const reputationTier =
    scorecard.reputation >= 900 ? { label: t('Tiers.elite'),    color: 'text-reactor-cyan', bg: 'bg-reactor-cyan/10 border-reactor-cyan/30' } :
    scorecard.reputation >= 750 ? { label: t('Tiers.verified'), color: 'text-green-400',    bg: 'bg-green-500/10 border-green-500/30'       } :
    scorecard.reputation >= 600 ? { label: t('Tiers.active'),   color: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/30'       } :
                                  { label: t('Tiers.emerging'), color: 'text-gray-400',      bg: 'bg-gray-500/10 border-gray-500/30'         };

  const projectName = scorecard?.name || `Builder ${scorecard?.address?.substring(0, 8) || 'Unknown'}...`;

  // Breakdown AVIP real — del motor, no hardcodeado
  const avip  = scorecard.avipScore;
  const avipIn = scorecard.avipInput;
  const technicalDisplay  = avipIn?.technical  ?? avip?.technical  ?? 0;
  const governanceDisplay = avipIn?.governance ?? avip?.governance ?? 0;
  const communityDisplay  = avipIn?.community  ?? avip?.community  ?? 0;
  const confidenceDisplay = avip?.behavioralConfidence != null
    ? `${(avip.behavioralConfidence * 100).toFixed(0)}%`
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────────────────── */}
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
                {t('Badges.rootstockBuilder')}
              </span>
              {scorecard.category && (
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 tracking-wider uppercase">
                  {scorecard.category}
                </span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 border tracking-wider uppercase ${reputationTier.bg} ${reputationTier.color}`}>
                {reputationTier.label}
              </span>
              {avip?.isAnomaly && (
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 tracking-wider uppercase">
                  {t('Badges.anomalyDetected')}
                </span>
              )}
            </div>

            <div>
              <h2 className="title-orbitron text-2xl md:text-3xl font-bold text-white tracking-tight">{projectName}</h2>
              <p className="text-xs font-mono-display text-gray-600 mt-1 select-all">{scorecard.address}</p>
              <p className="text-[9px] font-mono-display text-gray-700 mt-0.5 truncate">{scorecard.did}</p>
            </div>

            <ReputationBar value={scorecard.reputation} label={t('ReputationBar.label')} />
          </div>
        </div>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('Stats.proposalsLabel')}
          value={scorecard.stats.proposals}
          sub={scorecard.stats.proposals === 0 ? t('Stats.proposalsNone') : t('Stats.proposalsActive')}
          icon={FolderGit2}
          color="text-reactor-cyan"
        />
        <StatCard
          label={t('Stats.votesLabel')}
          value={scorecard.stats?.votesCast ?? 0}
          sub={(scorecard.stats?.votesCast ?? 0) > 0 ? t('Stats.votesActive') : t('Stats.votesNone')}
          icon={Shield}
          color="text-blue-400"
        />
        <StatCard
          label={t('Stats.stakingLabel')}
          value={allocationDisplay}
          sub={t('Stats.stakingSub')}
          icon={Zap}
          color="text-orange-500"
        />
        <StatCard
          label={t('Stats.daysLabel')}
          value={scorecard.stats?.timeInEcosystem > 0 ? `${scorecard.stats.timeInEcosystem}D` : t('Stats.daysNone')}
          sub={t('Stats.daysSub')}
          icon={Clock}
          color="text-green-500"
        />
      </div>

      {/* ── Governance + Staking ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Proposal History */}
        <div className="bg-[#0d0f14] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <h3 className="title-orbitron text-xs font-bold text-gray-300 tracking-widest uppercase">
              {t('Governance.title')}
            </h3>
            <a
              href={(scorecard as any).governanceUrl || 'https://app.rootstockcollective.xyz/proposals'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[9px] text-reactor-cyan/60 hover:text-reactor-cyan transition-colors"
            >
              <span>{t('Governance.externalLink')}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="p-6 space-y-3">
            {scorecard.proposals.length > 0 ? (
              scorecard.proposals.map((p, i) => (
                <div key={i} className="flex items-start gap-4 group pb-3 border-b border-white/5 last:border-0">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    p.status === 'Executed' || p.status === 'Succeeded' ? 'bg-green-500' :
                    p.status === 'Defeated'                             ? 'bg-red-500'   :
                    p.status === 'Active'                               ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'
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
                        p.status === 'Defeated'                             ? 'text-red-400'   :
                        p.status === 'Active'                               ? 'text-amber-400' : 'text-gray-600'
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
                <EmptyState message={t('Governance.emptyTitle')} />
                <p className="text-[9px] text-gray-700 leading-relaxed">
                  {t('Governance.emptyDetail')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Staking + AVIP Formula */}
        <div className="bg-[#0d0f14] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <h3 className="title-orbitron text-xs font-bold text-gray-300 tracking-widest uppercase">
              {t('Staking.title')}
            </h3>
            <span className="text-[9px] text-gray-600 font-mono-display">{t('Staking.source')}</span>
          </div>
          <div className="p-6 space-y-6">

            {/* Total Allocation */}
            <div className="space-y-2">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">{t('Staking.allocationLabel')}</p>
              <p className="title-orbitron text-lg font-bold text-orange-400">{allocationDisplay}</p>
            </div>

            {/* Gauges */}
            <div className="space-y-3">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{t('Staking.gaugesLabel')}</p>
              {stakingInfo.gauges && stakingInfo.gauges.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {stakingInfo.gauges.map((g, i) => (
                    <div key={i} className="p-2 bg-black/40 border border-white/5 flex items-center gap-3">
                      <Zap className="w-3 h-3 text-purple-500 flex-shrink-0" />
                      <span className="text-[9px] text-gray-400 font-mono-display truncate">{g}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message={t('Staking.gaugesEmpty')} />
              )}
            </div>

            {/* AVIP Formula — valores reales del motor */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                  {t('Formula.title')}
                </p>
                {confidenceDisplay && (
                  <span className="text-[9px] font-mono-display text-reactor-cyan/60">
                    {t('Formula.confidence')}: {confidenceDisplay}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 font-mono-display text-[9px] text-gray-600">
                {/* Dimensiones reales del motor AVIP */}
                <div className="flex justify-between">
                  <span>{t('Formula.technical')}</span>
                  <span className="text-blue-400">{technicalDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Formula.governance')}</span>
                  <span className="text-reactor-cyan">{governanceDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Formula.community')}</span>
                  <span className="text-purple-400">{communityDisplay}</span>
                </div>

                {/* Escala */}
                <div className="border-t border-white/5 pt-1.5 mt-1.5 space-y-1.5">
                  <div className="flex justify-between">
                    <span>{t('Formula.avipScore')}</span>
                    <span className="text-gray-400">
                      {avip?.total?.toFixed(1) ?? (scorecard.reputation / 9.99).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('Formula.scaleFactor')}</span>
                    <span className="text-gray-600">× 9.99</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1.5 mt-1.5">
                    <span className="text-white font-bold">{t('Formula.finalScore')}</span>
                    <span className={`font-bold ${reputationTier.color}`}>{scorecard.reputation}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Banner ─────────────────────────────────────────────────────── */}
      <div className="p-5 bg-black/40 border border-reactor-cyan/10 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-reactor-cyan" />
          <h4 className="text-[10px] font-bold text-reactor-cyan uppercase tracking-widest">
            {t('Banner.title')}
          </h4>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          {t('Banner.description')}
        </p>
      </div>
    </div>
  );
}
