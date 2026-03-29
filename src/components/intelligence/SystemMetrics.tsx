'use client';

import { useEffect, useState } from 'react';
import { Activity, Users, ShieldCheck, BarChart3, Zap, Database, Cpu, Network } from 'lucide-react';

interface Metric {
    label: string;
    value: string | number;
    icon: any;
    unit?: string;
    trend?: 'up' | 'down' | 'stable';
}

export function SystemMetrics() {
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate real-time data loading
        const loadMetrics = async () => {
            setMetrics([
                { label: 'Proposals Synced', value: '1,247', icon: BarChart3, unit: 'total', trend: 'up' },
                { label: 'Active Nodes', value: '18', icon: Network, unit: 'online', trend: 'stable' },
                { label: 'Validation Rate', value: '99.8', icon: ShieldCheck, unit: '%', trend: 'up' },
                { label: 'Avg Latency', value: '24', icon: Activity, unit: 'ms', trend: 'down' },
                { label: 'Data Processed', value: '2.4', icon: Database, unit: 'GB', trend: 'up' },
                { label: 'CPU Load', value: '48', icon: Cpu, unit: '%', trend: 'stable' },
                { label: 'Throughput', value: '1.2K', icon: Zap, unit: 'tx/s', trend: 'up' },
                { label: 'Active DAOs', value: '7', icon: Users, unit: 'ecosystems', trend: 'stable' },
            ]);
            setLoading(false);
        };

        loadMetrics();

        // Simulate real-time updates
        const interval = setInterval(() => {
            setMetrics(prev => prev.map(m => ({
                ...m,
                value: typeof m.value === 'string' && m.value.includes(',')
                    ? m.value
                    : m.label === 'Avg Latency'
                        ? Math.floor(20 + Math.random() * 10).toString()
                        : m.value
            })));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse h-20 bg-black/40 border border-gray-800/50 rounded-[2px]" />
                ))}
            </div>
        );
    }

    const getTrendColor = (trend?: string) => {
        switch (trend) {
            case 'up': return 'text-green-500';
            case 'down': return 'text-reactor-cyan';
            case 'stable': return 'text-gray-500';
            default: return 'text-gray-500';
        }
    };

    const getTrendSymbol = (trend?: string) => {
        switch (trend) {
            case 'up': return '▲';
            case 'down': return '▼';
            case 'stable': return '●';
            default: return '';
        }
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.map((m, idx) => (
                <div
                    key={m.label}
                    className="group relative bg-black/40 border border-gray-800/50 hover:border-reactor-cyan/30 p-3 rounded-[2px] transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]"
                    style={{ animationDelay: `${idx * 50}ms` }}
                >
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start justify-between mb-2">
                        <div className="p-1.5 rounded-[2px] bg-steel-polished-dark border border-gray-800 group-hover:border-reactor-cyan/20 transition-colors">
                            <m.icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-reactor-cyan transition-colors" />
                        </div>
                        <span className={`text-[9px] font-mono-display font-bold ${getTrendColor(m.trend)}`}>
                            {getTrendSymbol(m.trend)}
                        </span>
                    </div>

                    <div className="space-y-0.5">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-gray-500 text-mono font-bold leading-tight">
                            {m.label}
                        </p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-xl font-bold title-orbitron text-white group-hover:text-reactor-cyan transition-colors tabular-nums">
                                {m.value}
                            </p>
                            {m.unit && (
                                <span className="text-[9px] text-gray-500 text-mono uppercase tracking-tighter">
                                    {m.unit}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Subtle scanline effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />
                </div>
            ))}
        </div>
    );
}
