'use client';

import { useEffect, useState } from 'react';

interface EcosystemStats {
  ecosystem: string;
  total_proposals: number;
  active_builders: number;
  approval_rate: number;
  funding_distributed: number;
}

export function EcosystemMetrics() {
  const [stats, setStats] = useState<EcosystemStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/intelligence/ecosystem')
      .then(res => res.json())
      .then(data => {
        // Mock data for now - will integrate with real data
        setStats([
          {
            ecosystem: 'rootstock',
            total_proposals: 247,
            active_builders: 64,
            approval_rate: 64,
            funding_distributed: 50000
          },
          {
            ecosystem: 'optimism',
            total_proposals: 198,
            active_builders: 58,
            approval_rate: 58,
            funding_distributed: 30000
          },
          {
            ecosystem: 'arbitrum',
            total_proposals: 89,
            active_builders: 52,
            approval_rate: 52,
            funding_distributed: 75000
          }
        ]);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading metrics...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ecosystem
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Proposals
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Builders
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Approval Rate
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Funding
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {stats.map((stat) => (
            <tr key={stat.ecosystem}>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-800 font-bold">
                      {stat.ecosystem.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">
                      {stat.ecosystem.charAt(0).toUpperCase() + stat.ecosystem.slice(1)}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-gray-900">{stat.total_proposals.toLocaleString()}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-gray-900">{stat.active_builders}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${stat.approval_rate}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-900">{stat.approval_rate}%</span>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-gray-900">
                  ${stat.funding_distributed.toLocaleString()}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
