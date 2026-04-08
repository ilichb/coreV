'use client';

import { useEffect, useState } from 'react';

export interface RealEcosystemStats {
  ecosystem: string;
  builders: number;
  proposals: number;
  activeProposals: number;
  status: string;
  source: string;
  slot?: number;
  balance?: number;
}

export function EcosystemMetrics() {
  const [stats, setStats] = useState<RealEcosystemStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/intelligence/telemetry')
      .then(res => res.json())
      .then(data => {
        if (data?.telemetry?.ecosystems) {
            const ecoEntries = Object.entries(data.telemetry.ecosystems).map(([key, val]: [string, any]) => ({
                ecosystem: key,
                builders: val.builders || 0,
                proposals: val.proposals || 0,
                activeProposals: val.activeProposals || 0,
                status: val.status || 'unknown',
                source: val.source || 'unknown',
                slot: val.slot,
                balance: val.balance
            }));
            
            // Sort to have Solana and TheGraph at the top, followed by others
            ecoEntries.sort((a, b) => {
                const priority = { solana: 1, thegraph: 2, rootstock: 3, arbitrum: 4, optimism: 5, algorand: 6, polkadot: 7 };
                const getPrio = (name: string) => (priority as any)[name.toLowerCase()] || 99;
                return getPrio(a.ecosystem) - getPrio(b.ecosystem);
            });

            setStats(ecoEntries);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-gray-500 font-mono text-xs animate-pulse">INGESTING ECOSYSTEM METRICS...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#1e2430]">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              ECOSYSTEM 
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              STATUS
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              PROPOSALS
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              BUILDERS
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              METADATA
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e2430]">
          {stats.map((stat) => (
            <tr key={stat.ecosystem} className="hover:bg-[#1a1f2b] transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center border ${
                    stat.ecosystem === 'solana' ? 'border-[#9945ff] text-[#9945ff] shadow-[0_0_10px_rgba(153,69,255,0.3)]' :
                    stat.ecosystem === 'thegraph' ? 'border-[#6747ed] text-[#6747ed] shadow-[0_0_10px_rgba(103,71,237,0.3)]' :
                    stat.ecosystem === 'rootstock' ? 'border-orange-500 text-orange-500' :
                    'border-gray-500 text-gray-500'
                  }`}>
                    <span className="text-[10px] font-bold">
                      {stat.ecosystem.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-gray-300 uppercase tracking-wider">
                    {stat.ecosystem}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                 <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                        stat.status === 'synced' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' :
                        stat.status === 'configured' ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]' :
                        stat.status === 'syncing' || stat.status === 'pending' ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.6)] animate-pulse' :
                        'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)]'
                    }`} />
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                        {stat.status}
                    </span>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-gray-300 font-mono text-xs">{stat.proposals.toLocaleString()}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-gray-300 font-mono text-xs">{stat.builders.toLocaleString()}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex flex-col gap-1">
                    {stat.slot !== undefined && (
                        <div className="text-[9px] font-mono text-[#9945ff]">SLOT: {stat.slot.toLocaleString()}</div>
                    )}
                    {stat.balance !== undefined && (
                        <div className="text-[9px] font-mono text-[#9945ff]">BALANCE: {stat.balance.toFixed(4)} SOL</div>
                    )}
                    {(stat.slot === undefined && stat.balance === undefined) && (
                        <div className="text-[9px] font-mono text-gray-600">SRC: {stat.source.toUpperCase()}</div>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
