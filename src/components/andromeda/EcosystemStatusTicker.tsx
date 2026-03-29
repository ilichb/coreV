'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, WifiOff, RefreshCw } from 'lucide-react';

interface EcosystemStatus {
  id: string;
  label: string;
  chain: string;
  color: string;
  status: 'online' | 'syncing' | 'offline';
  totalMilestones: number;
  recentMilestones: number;
  lastSeen: string | null;
}

const POLL_INTERVAL_MS = 60_000;

function StatusDot({ status }: { status: EcosystemStatus['status'] }) {
  const cls =
    status === 'online'  ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]'  :
    status === 'syncing' ? 'bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.8)]' :
                           'bg-red-600 shadow-[0_0_4px_rgba(239,68,68,0.5)]';
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${cls} ${status === 'online' ? 'animate-pulse' : ''}`} />
  );
}

function StatusLabel({ status }: { status: EcosystemStatus['status'] }) {
  if (status === 'online')  return <span className="text-green-400 font-mono text-[9px] tracking-widest">ONLINE</span>;
  if (status === 'syncing') return <span className="text-yellow-400 font-mono text-[9px] tracking-widest">SYNCING</span>;
  return <span className="text-red-500 font-mono text-[9px] tracking-widest">OFFLINE</span>;
}

function EcosystemCard({ eco }: { eco: EcosystemStatus }) {
  const lastSeenText = eco.lastSeen
    ? (() => {
        const diff = Date.now() - new Date(eco.lastSeen).getTime();
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        return h > 0 ? `${h}h ago` : `${m}m ago`;
      })()
    : 'never';

  return (
    <div
      className="flex-shrink-0 w-52 mx-2 bg-black/50 border rounded-[3px] px-4 py-3 flex flex-col gap-2 transition-colors"
      style={{ borderColor: `${eco.color}30` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={eco.status} />
          <span
            className="text-xs font-mono font-bold tracking-wider uppercase"
            style={{ color: eco.color }}
          >
            {eco.label}
          </span>
        </div>
        <span className="text-[9px] font-mono text-gray-600 uppercase">{eco.chain}</span>
      </div>

      {/* Status */}
      <StatusLabel status={eco.status} />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-1 pt-1 border-t" style={{ borderColor: `${eco.color}18` }}>
        <div>
          <div className="text-[10px] text-gray-600 font-mono uppercase">Milestones</div>
          <div className="text-sm font-mono font-bold text-gray-200 tabular-nums">
            {eco.totalMilestones.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-600 font-mono uppercase">Last sync</div>
          <div
            className="text-sm font-mono font-bold tabular-nums"
            style={{ color: eco.status === 'offline' ? '#ef4444' : eco.color }}
          >
            {lastSeenText}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EcosystemStatusTicker() {
  const [ecosystems, setEcosystems] = useState<EcosystemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/intelligence/ecosystem-status');
      const json = await res.json();
      setEcosystems(json.ecosystems ?? []);
      setError(null);
    } catch (e: any) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const onlineCount  = ecosystems.filter(e => e.status === 'online').length;
  const syncingCount = ecosystems.filter(e => e.status === 'syncing').length;
  const offlineCount = ecosystems.filter(e => e.status === 'offline').length;

  // Duplicate the list so the CSS infinite-scroll looks seamless
  const doubled = [...ecosystems, ...ecosystems];

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-reactor-cyan" />
          <h2 className="text-xs font-mono font-bold text-gray-400 tracking-[0.2em] uppercase">
            DAO_ECOSYSTEM_STATUS
          </h2>
        </div>
        <div className="flex items-center gap-4 text-[9px] font-mono uppercase tracking-widest">
          {!loading && (
            <>
              <span className="flex items-center gap-1 text-green-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                {onlineCount} online
              </span>
              {syncingCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  {syncingCount} syncing
                </span>
              )}
              <span className="flex items-center gap-1 text-red-500">
                <WifiOff className="w-2.5 h-2.5" />
                {offlineCount} offline
              </span>
            </>
          )}
        </div>
      </div>

      {/* Ticker track */}
      <div className="relative overflow-hidden border border-reactor-cyan/10 rounded-[3px] bg-black/30 py-3">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-16 z-10 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10 bg-gradient-to-l from-black to-transparent" />

        {loading ? (
          <div className="flex items-center justify-center gap-3 h-20 text-xs font-mono text-reactor-cyan animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            QUERYING_ECOSYSTEMS...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-3 h-20 text-xs font-mono text-red-500">
            <WifiOff className="w-4 h-4" />
            {error}
          </div>
        ) : (
          <div
            ref={tickerRef}
            className="flex items-stretch ecosystem-ticker-scroll"
            style={{ width: 'max-content' }}
          >
            {doubled.map((eco, i) => (
              <EcosystemCard key={`${eco.id}-${i}`} eco={eco} />
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ecosystem-ticker-scroll {
          animation: ticker-scroll 28s linear infinite;
        }
        .ecosystem-ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
