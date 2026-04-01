'use client';

import { useEffect, useState } from 'react';
import { Activity, Users, ShieldCheck, BarChart3, Zap, Database, Cpu, Network, CheckCircle, Server } from 'lucide-react';

interface Metric {
    label: string;
    value: string | number;
    icon: any;
    unit?: string;
    trend?: 'up' | 'down' | 'stable';
}

interface TelemetryData {
    timestamp: string;
    ecosystems: Record<string, {
        builders: number;
        status: string;
        proposals: number;
        activeProposals: number;
        source?: string;
        error?: string;
    }>;
    dataSources: {
        totalMilestones: number;
        uniqueBuilders: number;
        verifiedCount: number;
        ecosystemBreakdown: Record<string, number>;
    };
    systemStatus: {
        database: string;
        databaseDetail: string;
        coreServices: string;
        apiGateway: string;
        dataFlow: string;
        redis?: string;
        vara?: string;
    };
    externalApis: Record<string, string>;
}

export function SystemMetrics() {
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<string>('');

    useEffect(() => {
        // Load real telemetry data
        const loadRealMetrics = async () => {
            try {
                console.log('SystemMetrics: Loading telemetry data...');
                const response = await fetch('/api/intelligence/telemetry');
                console.log('SystemMetrics: Response status:', response.status);
                const data = await response.json();
                console.log('SystemMetrics: Received data:', data);

                if (data.success && data.telemetry) {
                    const telemetry: TelemetryData = data.telemetry;
                    console.log('SystemMetrics: Telemetry data:', telemetry);
                    setLastUpdate(new Date(telemetry.timestamp).toLocaleTimeString());

                    // Calculate real metrics from telemetry data - ALL ECOSYSTEMS
                    const totalBuilders = Object.values(telemetry.ecosystems).reduce((sum, eco) => sum + (eco.builders || 0), 0);
                    const totalProposals = Object.values(telemetry.ecosystems).reduce((sum, eco) => sum + (eco.proposals || 0), 0);
                    const activeEcosystems = Object.values(telemetry.ecosystems).filter(eco => eco.status === 'synced' || eco.status === 'configured').length;
                    const totalEcosystems = Object.keys(telemetry.ecosystems).length;

                    // Count operational external APIs
                    const operationalApis = Object.values(telemetry.externalApis || {}).filter(status =>
                        status === 'operational' || status === 'configured'
                    ).length;
                    const totalApis = Object.keys(telemetry.externalApis || {}).length;

                    const realMetrics: Metric[] = [
                        {
                            label: 'Total Builders',
                            value: totalBuilders,
                            icon: Users,
                            unit: 'builders',
                            trend: totalBuilders > 0 ? 'up' : 'stable'
                        },
                        {
                            label: 'Milestones Indexed',
                            value: telemetry.dataSources.totalMilestones,
                            icon: Database,
                            unit: 'total',
                            trend: telemetry.dataSources.totalMilestones > 0 ? 'up' : 'stable'
                        },
                        {
                            label: 'Verification Rate',
                            value: telemetry.dataSources.totalMilestones > 0
                                ? Math.round((telemetry.dataSources.verifiedCount / telemetry.dataSources.totalMilestones) * 100)
                                : 0,
                            icon: ShieldCheck,
                            unit: '%',
                            trend: 'up'
                        },
                        {
                            label: 'Unique Builders',
                            value: telemetry.dataSources.uniqueBuilders,
                            icon: Network,
                            unit: 'active',
                            trend: telemetry.dataSources.uniqueBuilders > 0 ? 'up' : 'stable'
                        },
                        {
                            label: 'Total Proposals',
                            value: totalProposals,
                            icon: BarChart3,
                            unit: 'on-chain',
                            trend: totalProposals > 0 ? 'up' : 'stable'
                        },
                        {
                            label: 'Ecosystems Active',
                            value: `${activeEcosystems}/${totalEcosystems}`,
                            icon: CheckCircle,
                            unit: 'connected',
                            trend: activeEcosystems > 0 ? 'up' : 'down'
                        },
                        {
                            label: 'Data Flow',
                            value: telemetry.systemStatus.dataFlow === 'active' ? 'Active' : 'Idle',
                            icon: Zap,
                            unit: 'status',
                            trend: telemetry.systemStatus.dataFlow === 'active' ? 'up' : 'down'
                        },
                        {
                            label: 'APIs Operational',
                            value: `${operationalApis}/${totalApis}`,
                            icon: Server,
                            unit: 'APIs',
                            trend: operationalApis > 0 ? 'up' : 'down'
                        },
                    ];

                    console.log('SystemMetrics: Setting metrics:', realMetrics);
                    setMetrics(realMetrics);
                } else {
                    console.log('SystemMetrics: API returned unsuccessful or missing telemetry');
                    // Fallback to simulated data if API fails
                    setMetrics(getFallbackMetrics());
                }
            } catch (error) {
                console.error('Failed to load telemetry:', error);
                // Fallback to simulated data
                setMetrics(getFallbackMetrics());
            } finally {
                setLoading(false);
            }
        };

        // Helper function for fallback metrics
        const getFallbackMetrics = (): Metric[] => [
            { label: 'Builders Tracked', value: '--', icon: Users, unit: 'builders', trend: 'stable' },
            { label: 'Milestones Indexed', value: '--', icon: Database, unit: 'total', trend: 'stable' },
            { label: 'Verification Rate', value: '--', icon: ShieldCheck, unit: '%', trend: 'stable' },
            { label: 'Unique Builders', value: '--', icon: Network, unit: 'active', trend: 'stable' },
            { label: 'Proposals Synced', value: '--', icon: BarChart3, unit: 'on-chain', trend: 'stable' },
            { label: 'System Health', value: '--', icon: CheckCircle, unit: '%', trend: 'stable' },
            { label: 'Data Flow', value: '--', icon: Zap, unit: 'status', trend: 'stable' },
            { label: 'API Gateway', value: '--', icon: Server, unit: 'status', trend: 'stable' },
        ];

        loadRealMetrics();

        // Real-time updates every 10 seconds
        const interval = setInterval(() => {
            loadRealMetrics();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    if (loading && metrics.length === 0) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse h-20 bg-black/40 border border-gray-800/50 rounded-[2px]" />
                ))}
            </div>
        );
    }

    // If we have no metrics yet, show loading state
    if (metrics.length === 0) {
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
