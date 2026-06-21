'use client';

import { useState, useEffect } from 'react';

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
  sample: Array<{ subject: string; body: string; variant: MessageVariant }>;
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
  cohorts: {
    total: number;
    mainPool: number;
    cohortA: CohortSummary;
    cohortB: CohortSummary;
    whales: CohortSummary;
  };
  whales: Holder[];
  messages: {
    control: MessageGroup;
    treatment: MessageGroup;
    vip: MessageGroup;
  };
  reactivation: ReactivationMetrics | null;
  metadata: {
    source: string;
    minBalanceRIF: number;
    minDaysInactive: number;
    generatedAt: string;
    note: string;
  };
}

function Loading() {
  return (
    <div className="min-h-screen bg-[#050608] flex items-center justify-center">
      <div className="text-xs font-mono text-[#00f0ff] animate-pulse tracking-[0.2em] uppercase">
        Loading preview data...
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-[#00f0ff]/20 bg-black/40 p-4">
      <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{label}</div>
      <div className="text-xl font-mono font-bold text-gray-100 mt-1">{value}</div>
      {sub && <div className="text-[10px] font-mono text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function MessagePreview({ msg, color }: { msg: { subject: string; body: string; variant: string }; color: string }) {
  return (
    <div className="px-4 py-4 space-y-2 border-b border-[#f59e0b]/10 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border ${color}`}>
          {msg.variant.toUpperCase()}
        </span>
        <div className="text-xs font-mono font-bold text-gray-200">{msg.subject}</div>
      </div>
      <div className="text-[10px] font-mono text-gray-500 leading-relaxed whitespace-pre-line">{msg.body}</div>
    </div>
  );
}

export default function PreviewPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [selectedHolder, setSelectedHolder] = useState<Holder | null>(null);

  useEffect(() => {
    fetch('/api/fes/metrics')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.detail || d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#050608] flex items-center justify-center">
        <div className="text-red-400 font-mono text-xs">{error}</div>
      </div>
    );
  }

  if (!data || data.count === 0) {
    return (
      <div className="min-h-screen bg-[#050608] flex items-center justify-center">
        <div className="text-gray-500 font-mono text-xs">No inactive holders detected.</div>
      </div>
    );
  }

  const cohortA = data.holders.filter(h => h.cohort === 'A');
  const cohortB = data.holders.filter(h => h.cohort === 'B');
  const whales = data.holders.filter(h => h.cohort === 'WHALE');
  const rx = data.reactivation;

  return (
    <div className="min-h-screen bg-[#050608] text-gray-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* Header */}
        <header className="border-b border-[#00f0ff]/20 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse" />
                <span className="text-[10px] font-mono font-medium text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-3 py-1 tracking-widest">
                  ROOTSTOCK_FES_PREVIEW
                </span>
              </div>
              <h1 className="text-3xl font-mono font-bold tracking-tighter">
                INACTIVE <span className="text-[#00f0ff]">HOLDERS</span>
              </h1>
              <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-wider">
                {data.metadata.source} // {data.count} wallets detected
              </p>
            </div>
            <button
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="text-[10px] font-mono text-gray-500 hover:text-[#00f0ff] border border-gray-800 hover:border-[#00f0ff]/30 px-3 py-1.5 transition-all uppercase tracking-widest"
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Holders" value={String(data.count)} />
          <StatCard label="Main Pool" value={String(data.cohorts.mainPool)} sub="A/B candidates" />
          <StatCard
            label="Cohort A (Control)"
            value={String(data.cohorts.cohortA.count)}
            sub={`avg ${data.cohorts.cohortA.avgDaysInactive.toFixed(0)}d inactive`}
          />
          <StatCard
            label="Cohort B (Treatment)"
            value={String(data.cohorts.cohortB.count)}
            sub={`avg ${data.cohorts.cohortB.avgDaysInactive.toFixed(0)}d inactive`}
          />
          <StatCard
            label="Whales (>1M RIF)"
            value={String(data.cohorts.whales.count)}
            sub={`${data.cohorts.whales.totalBalance.toLocaleString()} RIF`}
          />
        </div>

        {/* Reactivation Metrics */}
        {rx && (
          <div className="border border-[#00ff88]/20 bg-black/40">
            <div className="border-b border-[#00ff88]/20 px-4 py-3">
              <span className="text-[10px] font-mono font-bold text-[#00ff88] tracking-widest uppercase">
                Reactivation Metrics
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
              <StatCard label="Contacted" value={String(rx.totalContacted)} />
              <StatCard label="Reactivated" value={String(rx.totalReactivated)} sub={`${(rx.conversionRate * 100).toFixed(1)}% rate`} />
              <StatCard
                label="Avg Days to Reactivate"
                value={rx.avgDaysToReactivate !== null ? rx.avgDaysToReactivate.toFixed(1) : '—'}
                sub="across all cohorts"
              />
              <StatCard
                label="Best Cohort"
                value={rx.byCohort.reduce((best, c) => c.rate > (best?.rate || 0) ? c : best, rx.byCohort[0])?.cohort || '—'}
                sub={`${(Math.max(...rx.byCohort.map(c => c.rate)) * 100).toFixed(1)}% rate`}
              />
            </div>
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
                  {rx.byCohort.map(c => (
                    <tr key={c.cohort} className="border-b border-gray-800/50">
                      <td className="py-2 text-gray-300">{c.cohort}</td>
                      <td className="py-2 text-right text-gray-400">{c.contacted}</td>
                      <td className="py-2 text-right text-gray-400">{c.reactivated}</td>
                      <td className="py-2 text-right text-[#00ff88]">{(c.rate * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-gray-400">{c.avgDaysToReactivate !== null ? c.avgDaysToReactivate.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!rx && (
          <div className="border border-yellow-500/20 bg-black/40 p-4">
            <span className="text-[10px] font-mono text-yellow-500">
              No reactivation data yet. Messages have not been sent or tracking has not started.
            </span>
          </div>
        )}

        {/* Cohort Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cohort A */}
          <div className="border border-[#00f0ff]/20 bg-black/40">
            <div className="border-b border-[#00f0ff]/20 px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#00f0ff] tracking-widest uppercase">
                Cohort A — Control ({cohortA.length})
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {data.cohorts.cohortA.totalBalance.toLocaleString()} RIF
              </span>
            </div>
            <div className="divide-y divide-[#00f0ff]/10">
              {cohortA.map(h => (
                <button
                  key={h.wallet}
                  onClick={() => setSelectedHolder(selectedHolder?.wallet === h.wallet ? null : h)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#00f0ff]/5 transition-all font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{shortenAddress(h.wallet)}</span>
                    <span className="text-[10px] text-gray-500">{h.balance.toLocaleString()} RIF</span>
                  </div>
                  <div className="text-[9px] text-gray-600 mt-0.5">{h.daysInactive}d inactive</div>
                  {selectedHolder?.wallet === h.wallet && (
                    <div className="mt-2 pt-2 border-t border-[#00f0ff]/10 text-[10px] text-gray-400 space-y-1">
                      <div>Wallet: {h.wallet}</div>
                      <div>Balance: {h.balance.toLocaleString()} RIF</div>
                      <div>Inactive: {h.daysInactive} days</div>
                      <div>Last stake: {new Date(h.lastStakeActivity).toLocaleDateString()}</div>
                      <div>Message: {h.message_variant || 'not sent'}</div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Cohort B */}
          <div className="border border-[#f59e0b]/20 bg-black/40">
            <div className="border-b border-[#f59e0b]/20 px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#f59e0b] tracking-widest uppercase">
                Cohort B — Treatment ({cohortB.length})
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {data.cohorts.cohortB.totalBalance.toLocaleString()} RIF
              </span>
            </div>
            <div className="divide-y divide-[#f59e0b]/10">
              {cohortB.map(h => (
                <button
                  key={h.wallet}
                  onClick={() => setSelectedHolder(selectedHolder?.wallet === h.wallet ? null : h)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#f59e0b]/5 transition-all font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{shortenAddress(h.wallet)}</span>
                    <span className="text-[10px] text-gray-500">{h.balance.toLocaleString()} RIF</span>
                  </div>
                  <div className="text-[9px] text-gray-600 mt-0.5">{h.daysInactive}d inactive</div>
                  {selectedHolder?.wallet === h.wallet && (
                    <div className="mt-2 pt-2 border-t border-[#f59e0b]/10 text-[10px] text-gray-400 space-y-1">
                      <div>Wallet: {h.wallet}</div>
                      <div>Balance: {h.balance.toLocaleString()} RIF</div>
                      <div>Inactive: {h.daysInactive} days</div>
                      <div>Last stake: {new Date(h.lastStakeActivity).toLocaleDateString()}</div>
                      <div>Message: {h.message_variant || 'not sent'}</div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Whales */}
        {whales.length > 0 && (
          <div className="border border-[#ff6b6b]/20 bg-black/40">
            <div className="border-b border-[#ff6b6b]/20 px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#ff6b6b] tracking-widest uppercase">
                Whales — VIP Cohort ({whales.length})
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {data.cohorts.whales.totalBalance.toLocaleString()} RIF
              </span>
            </div>
            <div className="divide-y divide-[#ff6b6b]/10">
              {whales.map(h => (
                <button
                  key={h.wallet}
                  onClick={() => setSelectedHolder(selectedHolder?.wallet === h.wallet ? null : h)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#ff6b6b]/5 transition-all font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{shortenAddress(h.wallet)}</span>
                    <span className="text-[10px] text-gray-500">{h.balance.toLocaleString()} RIF</span>
                  </div>
                  <div className="text-[9px] text-gray-600 mt-0.5">{h.daysInactive}d inactive</div>
                  {selectedHolder?.wallet === h.wallet && (
                    <div className="mt-2 pt-2 border-t border-[#ff6b6b]/10 text-[10px] text-gray-400 space-y-1">
                      <div>Wallet: {h.wallet}</div>
                      <div>Balance: {h.balance.toLocaleString()} RIF</div>
                      <div>Inactive: {h.daysInactive} days</div>
                      <div>Last stake: {new Date(h.lastStakeActivity).toLocaleDateString()}</div>
                      <div>Message: {h.message_variant || 'not sent'}</div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sample Messages */}
        <div className="border border-gray-700/30 bg-black/40">
          <div className="border-b border-gray-700/30 px-4 py-3">
            <span className="text-[10px] font-mono font-bold text-gray-300 tracking-widest uppercase">
              Message Samples — All Variants
            </span>
          </div>
          {data.messages.control.sample.map((msg, i) => (
            <MessagePreview key={`c-${i}`} msg={msg} color="border-[#00f0ff]/40 text-[#00f0ff]" />
          ))}
          {data.messages.treatment.sample.map((msg, i) => (
            <MessagePreview key={`b-${i}`} msg={msg} color="border-[#f59e0b]/40 text-[#f59e0b]" />
          ))}
          {data.messages.vip.sample.map((msg, i) => (
            <MessagePreview key={`v-${i}`} msg={msg} color="border-[#ff6b6b]/40 text-[#ff6b6b]" />
          ))}
          <div className="px-4 py-2 border-t border-gray-700/30 flex gap-4">
            <span className="text-[9px] font-mono text-gray-600">
              Control: {data.messages.control.total} | Treatment: {data.messages.treatment.total} | VIP: {data.messages.vip.total}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <footer className="border-t border-gray-800 pt-4 pb-8">
          <div className="text-[9px] font-mono text-gray-700 space-y-1">
            <div>source: {data.metadata.source}</div>
            <div>minBalance: {data.metadata.minBalanceRIF} RIF | minDaysInactive: {data.metadata.minDaysInactive}</div>
            <div>generatedAt: {data.metadata.generatedAt}</div>
            <div className="text-gray-600">{data.metadata.note}</div>
          </div>
        </footer>

      </div>
    </div>
  );
}
