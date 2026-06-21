'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type Cohort = 'A' | 'B' | 'WHALE';
type MessageVariant = 'control' | 'treatment' | 'vip';

interface Holder {
  wallet: string;
  balance: number;
  daysInactive: number;
  lastStakeActivity: string;
  cohort: Cohort | null;
  message_variant: MessageVariant | null;
}

interface CohortSummary {
  count: number;
  avgBalance: number;
  avgDaysInactive: number;
  totalBalance: number;
}

interface MessageGroup {
  total: number;
  sample: Array<{ subject: string; body: string; variant: MessageVariant; platform: string }>;
}

interface ByCohortMetric {
  cohort: string;
  contacted: number;
  reactivated: number;
  rate: number;
  avgDaysToReactivate: number | null;
}

interface ReactivationMetrics {
  totalContacted: number;
  totalReactivated: number;
  conversionRate: number;
  avgDaysToReactivate: number | null;
  byCohort: ByCohortMetric[];
}

interface MetricsData {
  count: number;
  holders: Holder[];
  cohorts: { total: number; mainPool: number; cohortA: CohortSummary; cohortB: CohortSummary; whales: CohortSummary };
  whales: Holder[];
  messages: { control: MessageGroup; treatment: MessageGroup; vip: MessageGroup };
  reactivation: ReactivationMetrics | null;
  metadata: { source: string; minBalanceRIF: number; minDaysInactive: number; generatedAt: string; note: string; cohortStrategy: string };
}

interface Participant {
  wallet: string;
  cohort: Cohort | string;
  message_variant: string;
  balance: number;
  daysInactiveAtDetection: number;
  messageSentAt: string | null;
  messageLanguage: string | null;
  reactivated: boolean;
  reactivatedAt: string | null;
  lastBlockCurrent: number | null;
  lastBlockCheckpoint: number | null;
  daysToReactivate: number | null;
}

interface ParticipantsData {
  total: number;
  participants: Participant[];
}

interface TrackResultItem {
  wallet: string;
  cohort: string;
  previousBlock: number | null;
  currentBlock: number;
  checkpoint: number | null;
  delta: number | null;
  reactivated: boolean;
  error?: string;
}

interface TrackData {
  checked: number;
  reactivated: number;
  reactivated_wallets: string[];
  errors: Array<{ wallet: string; error: string }>;
  results: TrackResultItem[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortenAddress(addr: string) {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtRIF(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return fmt(v, 0);
}

function pct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

// ── UI Components ─────────────────────────────────────────────────────────────

function Card({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  const borderColor = accent || 'border-gray-700/30';
  const textColor = accent ? `text-${accent.split('-')[1] || 'gray-100'}` : 'text-gray-100';
  return (
    <div className={`border ${borderColor} bg-black/40 p-4`}>
      <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{label}</div>
      <div className={`text-xl font-mono font-bold ${textColor} mt-1`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: 'cyan' | 'amber' | 'red' | 'gray' | 'green' }) {
  const colors: Record<string, string> = {
    cyan: 'border-[#00f0ff]/40 text-[#00f0ff] bg-[#00f0ff]/5',
    amber: 'border-[#f59e0b]/40 text-[#f59e0b] bg-[#f59e0b]/5',
    red: 'border-[#ff6b6b]/40 text-[#ff6b6b] bg-[#ff6b6b]/5',
    gray: 'border-gray-600/40 text-gray-400 bg-gray-800/30',
    green: 'border-[#00ff88]/40 text-[#00ff88] bg-[#00ff88]/5',
  };
  return (
    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
}

function SectionHeader({ title, count, color, onRefresh, loading }: {
  title: string; count?: string | number; color?: string; onRefresh?: () => void; loading?: boolean;
}) {
  const borderColor = color ? `border-${color}/20` : 'border-gray-700/30';
  const textColor = color ? `text-${color}` : 'text-gray-300';
  return (
    <div className={`flex items-center justify-between border-b ${borderColor} px-4 py-3`}>
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-mono font-bold ${textColor} tracking-widest uppercase`}>{title}</span>
        {count !== undefined && <span className="text-[10px] font-mono text-gray-500">({count})</span>}
      </div>
      <div className="flex items-center gap-2">
        {loading && <span className="text-[9px] font-mono text-gray-600 animate-pulse">loading...</span>}
        {onRefresh && (
          <button onClick={onRefresh} className="text-[9px] font-mono text-gray-600 hover:text-gray-300 uppercase tracking-wider px-2 py-1 border border-gray-800 hover:border-gray-600 transition-all">
            refresh
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, color, onRefresh, loading, children, className }: {
  title: string; count?: string | number; color?: string; onRefresh?: () => void; loading?: boolean; children: React.ReactNode; className?: string;
}) {
  const borderColor = color ? `border-${color}/20` : 'border-gray-700/30';
  return (
    <div className={`border ${borderColor} bg-black/40 ${className || ''}`}>
      <SectionHeader title={title} count={count} color={color} onRefresh={onRefresh} loading={loading} />
      <div>{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="px-4 py-6 text-center text-[10px] font-mono text-gray-600">{message}</div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="px-4 py-6 text-center text-[10px] font-mono text-red-400">{message}</div>;
}

function JSONPreview({ data, label }: { data: unknown; label?: string }) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="border-t border-gray-800/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-all"
      >
        <span>{label || 'Raw JSON'} ({json.length} chars)</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <pre className="px-4 pb-3 text-[9px] font-mono text-gray-500 leading-relaxed overflow-x-auto max-h-96 overflow-y-auto">
          {json}
        </pre>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function TestDashboardPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<ParticipantsData | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  const [trackResult, setTrackResult] = useState<TrackData | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  const [addressSearch, setAddressSearch] = useState('');
  const [addressResult, setAddressResult] = useState<unknown | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const r = await fetch('/api/fes/metrics');
      const d = await r.json();
      if (d.error) throw new Error(d.detail || d.error);
      setMetrics(d);
      setLastUpdated(new Date().toISOString());
    } catch (e: any) {
      setMetricsError(e.message);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const fetchParticipants = useCallback(async () => {
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const r = await fetch('/api/fes/participants');
      const d = await r.json();
      if (d.error) throw new Error(d.detail || d.error);
      setParticipants(d);
    } catch (e: any) {
      setParticipantsError(e.message);
    } finally {
      setParticipantsLoading(false);
    }
  }, []);

  const triggerTrack = useCallback(async (wallet?: string) => {
    setTrackLoading(true);
    setTrackError(null);
    try {
      const r = await fetch('/api/fes/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: wallet ? JSON.stringify({ wallet }) : '{}',
      });
      const d = await r.json();
      if (d.error) throw new Error(d.detail || d.error);
      setTrackResult(d);
      fetchParticipants();
    } catch (e: any) {
      setTrackError(e.message);
    } finally {
      setTrackLoading(false);
    }
  }, [fetchParticipants]);

  const searchAddress = useCallback(async () => {
    const addr = addressSearch.trim().toLowerCase();
    if (!addr || !/^0x[a-f0-9]{40}$/.test(addr)) {
      setAddressError('Invalid address format');
      return;
    }
    setAddressLoading(true);
    setAddressError(null);
    setAddressResult(null);
    try {
      const r = await fetch(`/api/rootstock/inactive-holders?address=${addr}`);
      const d = await r.json();
      if (d.error) throw new Error(d.detail || d.error);
      setAddressResult(d);
    } catch (e: any) {
      setAddressError(e.message);
    } finally {
      setAddressLoading(false);
    }
  }, [addressSearch]);

  useEffect(() => {
    fetchMetrics();
    fetchParticipants();
  }, [fetchMetrics, fetchParticipants]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchMetrics();
        fetchParticipants();
      }, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchMetrics, fetchParticipants]);

  const cohortA = metrics?.holders.filter(h => h.cohort === 'A') || [];
  const cohortB = metrics?.holders.filter(h => h.cohort === 'B') || [];
  const whales = metrics?.holders.filter(h => h.cohort === 'WHALE') || [];

  return (
    <div className="min-h-screen bg-[#050608] text-gray-100 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* ═══ Header ═══ */}
        <header className="border-b border-gray-800 pb-4 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
                <span className="text-[10px] font-mono font-medium text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-3 py-1 tracking-widest">
                  ROOTSTOCK_FES_TEST_DASHBOARD
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tighter">
                FES PILOT <span className="text-[#00f0ff]">DASHBOARD</span>
              </h1>
              {lastUpdated && (
                <p className="text-[9px] font-mono text-gray-700 mt-1">
                  last updated: {new Date(lastUpdated).toLocaleString()} &middot; source: Rewards Subgraph
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-[10px] font-mono text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                  className="accent-[#00f0ff] w-3 h-3"
                />
                auto-refresh 30s
              </label>
              <button
                onClick={() => { fetchMetrics(); fetchParticipants(); }}
                className="text-[10px] font-mono text-gray-400 hover:text-[#00f0ff] border border-gray-800 hover:border-[#00f0ff]/30 px-3 py-1.5 transition-all uppercase tracking-widest"
              >
                ↻ refresh all
              </button>
              <button
                onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                className="text-[10px] font-mono text-gray-500 hover:text-[#00f0ff] border border-gray-800 hover:border-[#00f0ff]/30 px-3 py-1.5 transition-all uppercase tracking-widest"
              >
                {lang === 'en' ? 'ES' : 'EN'}
              </button>
            </div>
          </div>
        </header>

        {/* ═══ Summary Cards ═══ */}
        <Section title="Summary" color="cyan">
          {metricsError ? (
            <ErrorState message={metricsError} />
          ) : metricsLoading || !metrics ? (
            <div className="px-4 py-8"><LoadingDots /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4">
                <Card label="Total Holders" value={fmt(metrics.count)} accent="border-[#00f0ff]/20" />
                <Card label="Main Pool (A/B)" value={fmt(metrics.cohorts.mainPool)} accent="border-gray-600/30" />
                <Card label="Cohort A — Control" value={fmt(cohortA.length)} sub={`${fmtRIF(metrics.cohorts.cohortA.totalBalance)} RIF`} accent="border-[#00f0ff]/20" />
                <Card label="Cohort B — Treatment" value={fmt(cohortB.length)} sub={`${fmtRIF(metrics.cohorts.cohortB.totalBalance)} RIF`} accent="border-[#f59e0b]/20" />
                <Card label="Whales (>1M)" value={fmt(whales.length)} sub={`${fmtRIF(metrics.cohorts.whales.totalBalance)} RIF`} accent="border-[#ff6b6b]/20" />
                <Card label="Total RIF" value={fmtRIF(metrics.cohorts.cohortA.totalBalance + metrics.cohorts.cohortB.totalBalance + metrics.cohorts.whales.totalBalance)} accent="border-gray-600/30" />
                <Card label="Avg Days Inactive" value={fmt((metrics.cohorts.cohortA.avgDaysInactive + metrics.cohorts.cohortB.avgDaysInactive) / 2, 0)} sub="A/B pool avg" accent="border-gray-600/30" />
              </div>
              <JSONPreview data={metrics} label="metrics response" />
            </>
          )}
        </Section>

        {/* ═══ Inactive Holders Table ═══ */}
        <Section title="Inactive Holders" count={metrics?.count} color="cyan" onRefresh={fetchMetrics} loading={metricsLoading}>
          {metricsError ? (
            <ErrorState message={metricsError} />
          ) : !metrics || metrics.holders.length === 0 ? (
            <EmptyState message="No inactive holders detected" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <th className="text-left py-2.5 px-3">#</th>
                    <th className="text-left py-2.5 px-3">Wallet</th>
                    <th className="text-right py-2.5 px-3">Balance (RIF)</th>
                    <th className="text-right py-2.5 px-3">Days Inactive</th>
                    <th className="text-right py-2.5 px-3">Last Activity</th>
                    <th className="text-center py-2.5 px-3">Cohort</th>
                    <th className="text-center py-2.5 px-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.holders.map((h, i) => {
                    const rowColor = h.cohort === 'WHALE' ? 'border-[#ff6b6b]/10' : h.cohort === 'B' ? 'border-[#f59e0b]/10' : 'border-gray-800/50';
                    const badgeColor = h.cohort === 'WHALE' ? 'red' as const : h.cohort === 'B' ? 'amber' as const : h.cohort === 'A' ? 'cyan' as const : 'gray' as const;
                    const msgBadgeColor = h.message_variant === 'vip' ? 'red' as const : h.message_variant === 'treatment' ? 'amber' as const : h.message_variant === 'control' ? 'cyan' as const : 'gray' as const;
                    return (
                      <tr key={h.wallet} className={`border-b ${rowColor} hover:bg-white/[0.02] transition-colors`}>
                        <td className="py-2 px-3 text-gray-600">{i + 1}</td>
                        <td className="py-2 px-3">
                          <span className="text-gray-300" title={h.wallet}>{shortenAddress(h.wallet)}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-gray-300">{fmtRIF(h.balance)}</td>
                        <td className="py-2 px-3 text-right text-gray-300">{fmt(h.daysInactive)}</td>
                        <td className="py-2 px-3 text-right text-gray-500">{new Date(h.lastStakeActivity).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-center"><Badge label={h.cohort || '—'} color={badgeColor} /></td>
                        <td className="py-2 px-3 text-center"><Badge label={(h.message_variant || '—').toUpperCase()} color={msgBadgeColor} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <JSONPreview data={metrics.holders} label="holders raw data" />
            </div>
          )}
        </Section>

        {/* ═══ Cohort A vs B Comparison ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section title="Cohort A — Control" count={cohortA.length} color="cyan">
            {metricsError ? <ErrorState message={metricsError} /> : cohortA.length === 0 ? <EmptyState message="No wallets" /> : (
              <div className="divide-y divide-[#00f0ff]/10">
                {cohortA.map(h => <HolderRow key={h.wallet} h={h} color="cyan" />)}
              </div>
            )}
            {metrics && <JSONPreview data={cohortA} label="cohort A data" />}
          </Section>

          <Section title="Cohort B — Treatment" count={cohortB.length} color="amber">
            {metricsError ? <ErrorState message={metricsError} /> : cohortB.length === 0 ? <EmptyState message="No wallets" /> : (
              <div className="divide-y divide-[#f59e0b]/10">
                {cohortB.map(h => <HolderRow key={h.wallet} h={h} color="amber" />)}
              </div>
            )}
            {metrics && <JSONPreview data={cohortB} label="cohort B data" />}
          </Section>
        </div>

        {/* ═══ Stats Row ═══ */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-[#00f0ff]/20 bg-black/40 p-3">
              <div className="text-[9px] font-mono text-gray-500 uppercase">A — Avg Days</div>
              <div className="text-lg font-mono font-bold text-[#00f0ff]">{metrics.cohorts.cohortA.avgDaysInactive.toFixed(0)}</div>
              <div className="text-[9px] font-mono text-gray-600">total: {fmtRIF(metrics.cohorts.cohortA.totalBalance)} RIF</div>
            </div>
            <div className="border border-[#f59e0b]/20 bg-black/40 p-3">
              <div className="text-[9px] font-mono text-gray-500 uppercase">B — Avg Days</div>
              <div className="text-lg font-mono font-bold text-[#f59e0b]">{metrics.cohorts.cohortB.avgDaysInactive.toFixed(0)}</div>
              <div className="text-[9px] font-mono text-gray-600">total: {fmtRIF(metrics.cohorts.cohortB.totalBalance)} RIF</div>
            </div>
            <div className="border border-gray-700/30 bg-black/40 p-3">
              <div className="text-[9px] font-mono text-gray-500 uppercase">Days Deviation</div>
              <div className="text-lg font-mono font-bold text-gray-100">
                {((metrics.cohorts.cohortA.avgDaysInactive - metrics.cohorts.cohortB.avgDaysInactive) / metrics.cohorts.cohortA.avgDaysInactive * 100).toFixed(2)}%
              </div>
              <div className="text-[9px] font-mono text-gray-600">target: &lt;5%</div>
            </div>
            <div className="border border-gray-700/30 bg-black/40 p-3">
              <div className="text-[9px] font-mono text-gray-500 uppercase">Balance Deviation</div>
              <div className="text-lg font-mono font-bold text-gray-100">
                {((metrics.cohorts.cohortB.totalBalance - metrics.cohorts.cohortA.totalBalance) / metrics.cohorts.cohortA.totalBalance * 100).toFixed(2)}%
              </div>
              <div className="text-[9px] font-mono text-gray-600">expected (by days)</div>
            </div>
          </div>
        )}

        {/* ═══ Whales / VIP ═══ */}
        {whales.length > 0 && (
          <Section title="Whales — VIP Cohort" count={whales.length} color="red">
            <div className="divide-y divide-[#ff6b6b]/10">
              {whales.map(h => (
                <div key={h.wallet} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-gray-300" title={h.wallet}>{shortenAddress(h.wallet)}</span>
                      <span className="text-[10px] font-mono text-gray-600 ml-3">{h.daysInactive}d inactive</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#ff6b6b] font-bold">{fmtRIF(h.balance)} RIF</span>
                  </div>
                  <div className="mt-1 text-[9px] font-mono text-gray-600">
                    Last stake: {new Date(h.lastStakeActivity).toLocaleDateString()} &middot; Message: VIP
                  </div>
                </div>
              ))}
            </div>
            <JSONPreview data={whales} label="whales data" />
          </Section>
        )}

        {/* ═══ Messages ═══ */}
        {metrics && metrics.messages && (
          <Section title="Message Samples" color="gray" onRefresh={fetchMetrics}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-800/30">
              {[
                { key: 'control' as const, label: 'CONTROL', color: 'border-[#00f0ff]/40 text-[#00f0ff]', badge: 'cyan' as const },
                { key: 'treatment' as const, label: 'TREATMENT', color: 'border-[#f59e0b]/40 text-[#f59e0b]', badge: 'amber' as const },
                { key: 'vip' as const, label: 'VIP', color: 'border-[#ff6b6b]/40 text-[#ff6b6b]', badge: 'red' as const },
              ].map(section => {
                const msgGroup = metrics.messages[section.key];
                const sample = msgGroup.sample?.[0];
                return (
                  <div key={section.key} className="bg-black/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge label={section.label} color={section.badge} />
                      <span className="text-[9px] font-mono text-gray-600">{msgGroup.total} total</span>
                    </div>
                    {sample ? (
                      <>
                        <div className="text-[11px] font-mono font-bold text-gray-200 leading-tight">{sample.subject}</div>
                        <div className="text-[9px] font-mono text-gray-500 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">{sample.body}</div>
                      </>
                    ) : (
                      <EmptyState message="No sample available" />
                    )}
                  </div>
                );
              })}
            </div>
            <JSONPreview data={metrics.messages} label="messages data" />
          </Section>
        )}

        {/* ═══ Reactivation Metrics ═══ */}
        {metrics?.reactivation ? (
          <Section title="Reactivation Metrics" color="green">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
              <Card label="Contacted" value={fmt(metrics.reactivation.totalContacted)} accent="border-[#00ff88]/20" />
              <Card label="Reactivated" value={fmt(metrics.reactivation.totalReactivated)} sub={pct(metrics.reactivation.conversionRate)} accent="border-[#00ff88]/20" />
              <Card label="Avg Days to Reactivate" value={metrics.reactivation.avgDaysToReactivate !== null ? fmt(metrics.reactivation.avgDaysToReactivate, 1) : '—'} accent="border-gray-600/30" />
              <Card label="Conversion Rate" value={pct(metrics.reactivation.conversionRate)} accent="border-[#00ff88]/20" />
            </div>
            {metrics.reactivation.byCohort.length > 0 && (
              <div className="px-4 pb-4">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      <th className="text-left py-2">Cohort</th>
                      <th className="text-right py-2">Contacted</th>
                      <th className="text-right py-2">Reactivated</th>
                      <th className="text-right py-2">Rate</th>
                      <th className="text-right py-2">Avg Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.reactivation.byCohort.map(c => (
                      <tr key={c.cohort} className="border-b border-gray-800/50">
                        <td className="py-2 text-gray-300">{c.cohort}</td>
                        <td className="py-2 text-right text-gray-400">{c.contacted}</td>
                        <td className="py-2 text-right text-gray-400">{c.reactivated}</td>
                        <td className="py-2 text-right text-[#00ff88]">{pct(c.rate)}</td>
                        <td className="py-2 text-right text-gray-400">{c.avgDaysToReactivate !== null ? fmt(c.avgDaysToReactivate, 1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <JSONPreview data={metrics.reactivation} label="reactivation data" />
          </Section>
        ) : (
          <Section title="Reactivation Metrics" color="green">
            <div className="px-4 py-4">
              <span className="text-[10px] font-mono text-yellow-500">
                No reactivation data yet. Messages have not been sent or tracking has not started.
              </span>
            </div>
          </Section>
        )}

        {/* ═══ Track ═══ */}
        <Section title="Tracking Cycle" color="amber">
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => triggerTrack()}
                disabled={trackLoading}
                className="text-[10px] font-mono text-gray-300 hover:text-[#f59e0b] border border-gray-700 hover:border-[#f59e0b]/40 px-4 py-2 transition-all uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {trackLoading ? 'checking...' : '▸ check all wallets'}
              </button>
              <div className="flex-1 min-w-[200px]" />
            </div>

            {trackError && <ErrorState message={trackError} />}

            {trackResult && trackResult.checked === 0 && (
              <div className="text-[10px] font-mono text-gray-500">
                No participants in experiment yet. Run batch upsert after creating Supabase tables.
              </div>
            )}

            {trackResult && trackResult.checked > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Card label="Checked" value={fmt(trackResult.checked)} accent="border-gray-600/30" />
                  <Card label="Reactivated" value={fmt(trackResult.reactivated)} accent="border-[#00ff88]/20" />
                  <Card label="Errors" value={fmt(trackResult.errors.length)} accent="border-[#ff6b6b]/20" />
                </div>
                {trackResult.results.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] font-mono">
                      <thead>
                        <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-800">
                          <th className="text-left py-2 px-2">Wallet</th>
                          <th className="text-center py-2 px-2">Cohort</th>
                          <th className="text-right py-2 px-2">Prev Block</th>
                          <th className="text-right py-2 px-2">Current Block</th>
                          <th className="text-right py-2 px-2">Delta</th>
                          <th className="text-center py-2 px-2">Reactivated</th>
                          <th className="text-left py-2 px-2">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trackResult.results.map(r => (
                          <tr key={r.wallet} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                            <td className="py-2 px-2 text-gray-300">{shortenAddress(r.wallet)}</td>
                            <td className="py-2 px-2 text-center"><Badge label={r.cohort} color={r.cohort === 'VIP' ? 'red' : r.cohort === 'B' ? 'amber' : r.cohort === 'A' ? 'cyan' : 'gray'} /></td>
                            <td className="py-2 px-2 text-right text-gray-500">{r.previousBlock ?? '—'}</td>
                            <td className="py-2 px-2 text-right text-gray-300">{r.currentBlock}</td>
                            <td className="py-2 px-2 text-right text-gray-500">{r.delta ?? '—'}</td>
                            <td className="py-2 px-2 text-center">
                              {r.reactivated ? <span className="text-[#00ff88]">✓</span> : <span className="text-gray-600">—</span>}
                            </td>
                            <td className="py-2 px-2 text-red-400 max-w-[200px] truncate">{r.error || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <JSONPreview data={trackResult} label="track response" />
              </div>
            )}
          </div>
        </Section>

        {/* ═══ Participants ═══ */}
        <Section title="Participants" count={participants?.total} color="cyan" onRefresh={fetchParticipants} loading={participantsLoading}>
          {participantsError ? (
            <ErrorState message={participantsError} />
          ) : participantsLoading || !participants ? (
            <div className="px-4 py-8"><LoadingDots /></div>
          ) : participants.total === 0 ? (
            <EmptyState message="No participants in experiment yet. Create tables in Supabase and run batch upsert." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      <th className="text-left py-2.5 px-3">Wallet</th>
                      <th className="text-center py-2.5 px-3">Cohort</th>
                      <th className="text-center py-2.5 px-3">Variant</th>
                      <th className="text-right py-2.5 px-3">Balance</th>
                      <th className="text-center py-2.5 px-3">Message Sent</th>
                      <th className="text-center py-2.5 px-3">Lang</th>
                      <th className="text-center py-2.5 px-3">Reactivated</th>
                      <th className="text-right py-2.5 px-3">Days to Reactivate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.participants.map(p => {
                      const badgeColor = p.cohort === 'VIP' ? 'red' as const : p.cohort === 'B' ? 'amber' as const : p.cohort === 'A' ? 'cyan' as const : 'gray' as const;
                      const variantColor = p.message_variant === 'vip' ? 'red' as const : p.message_variant === 'treatment' ? 'amber' as const : p.message_variant === 'control' ? 'cyan' as const : 'gray' as const;
                      return (
                        <tr key={p.wallet} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-gray-300" title={p.wallet}>{shortenAddress(p.wallet)}</td>
                          <td className="py-2 px-3 text-center"><Badge label={p.cohort} color={badgeColor} /></td>
                          <td className="py-2 px-3 text-center"><Badge label={p.message_variant.toUpperCase()} color={variantColor} /></td>
                          <td className="py-2 px-3 text-right text-gray-300">{fmtRIF(p.balance)}</td>
                          <td className="py-2 px-3 text-center text-gray-500">{p.messageSentAt ? new Date(p.messageSentAt).toLocaleDateString() : '—'}</td>
                          <td className="py-2 px-3 text-center text-gray-500">{p.messageLanguage || '—'}</td>
                          <td className="py-2 px-3 text-center">{p.reactivated ? <span className="text-[#00ff88] font-bold">✓</span> : <span className="text-gray-600">—</span>}</td>
                          <td className="py-2 px-3 text-right text-gray-300">{p.daysToReactivate !== null ? fmt(p.daysToReactivate) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <JSONPreview data={participants} label="participants response" />
            </>
          )}
        </Section>

        {/* ═══ Address Search ═══ */}
        <Section title="Address Lookup" color="gray">
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={addressSearch}
                onChange={e => setAddressSearch(e.target.value)}
                placeholder="0x..."
                className="flex-1 bg-black/60 border border-gray-700 px-3 py-2 text-[11px] font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-[#00f0ff]/40 transition-all"
                onKeyDown={e => e.key === 'Enter' && searchAddress()}
              />
              <button
                onClick={searchAddress}
                disabled={addressLoading}
                className="text-[10px] font-mono text-gray-400 hover:text-[#00f0ff] border border-gray-700 hover:border-[#00f0ff]/30 px-4 py-2 transition-all disabled:opacity-40"
              >
                {addressLoading ? '...' : 'search'}
              </button>
            </div>
            {addressError && <div className="text-[10px] font-mono text-red-400">{addressError}</div>}
            {addressResult != null && (
              <div className="border border-gray-700/30 bg-black/60 p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[8px] font-mono text-gray-600 uppercase">Wallet</div>
                    <div className="text-[10px] font-mono text-gray-300 break-all">{(addressResult as any).wallet}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-mono text-gray-600 uppercase">Balance</div>
                    <div className="text-[10px] font-mono text-gray-300">{(addressResult as any).balance?.toLocaleString()} RIF</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-mono text-gray-600 uppercase">Days Inactive</div>
                    <div className="text-[10px] font-mono text-gray-300">{(addressResult as any).daysInactive}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-mono text-gray-600 uppercase">Last Activity</div>
                    <div className="text-[10px] font-mono text-gray-300">{new Date((addressResult as any).lastStakeActivity).toLocaleDateString()}</div>
                  </div>
                </div>
                <JSONPreview data={addressResult} label="address lookup response" />
              </div>
            )}
          </div>
        </Section>

        {/* ═══ Endpoint Status ═══ */}
        <Section title="Endpoint Status" color="gray">
          <div className="p-4">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left py-2">Endpoint</th>
                  <th className="text-center py-2">Status</th>
                  <th className="text-right py-2">Response</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'GET /api/fes/metrics', ok: !!metrics && !metricsError, info: metrics ? `${metrics.count} holders` : metricsError || 'loading...' },
                  { name: 'GET /api/fes/participants', ok: !!participants && !participantsError, info: participants ? `${participants.total} participants` : participantsError || 'loading...' },
                  { name: 'POST /api/fes/track', ok: !!trackResult && !trackError, info: trackResult ? `${trackResult.checked} checked, ${trackResult.reactivated} reactivated` : trackError || 'not triggered' },
                ].map(ep => (
                  <tr key={ep.name} className="border-b border-gray-800/50">
                    <td className="py-2 text-gray-300">{ep.name}</td>
                    <td className="py-2 text-center">
                      {ep.ok ? <span className="text-[#00ff88]">✓</span> : <span className="text-[#ff6b6b]">✗</span>}
                    </td>
                    <td className="py-2 text-right text-gray-500">{ep.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ═══ Footer ═══ */}
        <footer className="border-t border-gray-800 pt-4 pb-8">
          {metrics && (
            <div className="text-[9px] font-mono text-gray-700 space-y-1">
              <div>source: {metrics.metadata.source}</div>
              <div>strategy: {metrics.metadata.cohortStrategy}</div>
              <div>minBalance: {metrics.metadata.minBalanceRIF} RIF | minDaysInactive: {metrics.metadata.minDaysInactive}</div>
              <div>generatedAt: {metrics.metadata.generatedAt}</div>
              <div className="text-gray-600">{metrics.metadata.note}</div>
            </div>
          )}
        </footer>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]/50 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function HolderRow({ h, color }: { h: Holder; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = color === 'cyan' ? 'divide-[#00f0ff]/10' : 'divide-[#f59e0b]/10';
  const textColor = color === 'cyan' ? 'text-[#00f0ff]' : 'text-[#f59e0b]';

  return (
    <div className={`${borderColor}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`text-[9px] font-mono ${textColor} font-bold`}>{color === 'cyan' ? 'A' : 'B'}</span>
          <span className="text-xs font-mono text-gray-300">{shortenAddress(h.wallet)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-gray-500">{h.daysInactive}d</span>
          <span className="text-[10px] font-mono text-gray-400">{fmtRIF(h.balance)}</span>
          <span className="text-[9px] font-mono text-gray-600">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-1 text-[10px] font-mono text-gray-500 space-y-1 border-t border-gray-800/30">
          <div>Wallet: {h.wallet}</div>
          <div>Balance: {h.balance.toLocaleString()} RIF</div>
          <div>Days inactive: {h.daysInactive}</div>
          <div>Last activity: {new Date(h.lastStakeActivity).toLocaleDateString()}</div>
          <div>Message: {h.message_variant || 'not sent'}</div>
        </div>
      )}
    </div>
  );
}
