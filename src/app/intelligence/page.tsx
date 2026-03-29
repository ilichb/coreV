"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, Cpu, Database, Activity, Zap, Server, BarChart } from 'lucide-react';

export default function IntelligencePage() {
    const [metrics, setMetrics] = useState({
        syncStatus: 'active',
        dataPoints: 12547,
        uptime: '99.8%',
        responseTime: '0.02s'
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-reactor-cyan/30 border-t-reactor-cyan rounded-full animate-spin"></div>
                    <div className="text-sm font-mono-display text-reactor-cyan animate-pulse tracking-[0.2em]">
                        LOADING_INTELLIGENCE_ENGINE...
                    </div>
                </div>
            </div>
        );
    }

    const modules = [
        {
            title: 'REAL-TIME SYNC',
            description: 'Sincronización en tiempo real con Vara Network y The Graph',
            icon: Activity,
            status: 'active',
            endpoints: ['/api/intelligence/sync', '/api/intelligence/vara']
        },
        {
            title: 'ECOSYSTEM MONITOR',
            description: 'Monitoreo de métricas del ecosistema y alertas',
            icon: BarChart,
            status: 'active',
            endpoints: ['/api/intelligence/monitoring', '/api/intelligence/ecosystem']
        },
        {
            title: 'DATA ANALYTICS',
            description: 'Análisis predictivo y procesamiento de datos',
            icon: Brain,
            status: 'active',
            endpoints: ['/api/analytics/predictive', '/api/analytics/trends']
        },
        {
            title: 'PERFORMANCE ENGINE',
            description: 'Optimización de rendimiento y caching',
            icon: Zap,
            status: 'active',
            endpoints: ['/api/performance/cache', '/api/performance/optimize']
        }
    ];

    return (
        <div className="min-h-screen bg-black text-gray-100">
            {/* Header */}
            <header className="border-b border-reactor-cyan/20">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                                <span className="text-[10px] font-mono-display font-medium text-reactor-cyan bg-reactor-cyan/10 border border-reactor-cyan/20 px-3 py-1 rounded-[2px] tracking-widest leading-none">
                                    INTELLIGENCE_ENGINE_v1.0
                                </span>
                            </div>

                            <div>
                                <h1 className="text-4xl md:text-5xl font-mono-display font-bold tracking-tighter mb-2">
                                    <span className="text-gray-100">INTELLIGENCE</span>{' '}
                                    <span className="text-reactor-cyan">ENGINE</span>
                                </h1>
                                <p className="text-gray-500 font-mono-display text-xs max-w-2xl leading-relaxed uppercase tracking-wider">
                                    Real-time data synchronization & ecosystem analytics
                                    <span className="text-reactor-cyan/60 ml-2">// ACTIVE_SYNC</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 bg-black/40 border border-reactor-cyan/10 p-4 rounded-[2px] min-w-[200px]">
                            <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest">Sync Status</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-mono-display font-bold text-green-500 tabular-nums uppercase">
                                    ACTIVE
                                </span>
                            </div>
                            <p className="text-[9px] text-reactor-cyan/60 font-mono-display">DATA_POINTS: {metrics.dataPoints.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* System Modules */}
                <section className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <Cpu className="w-5 h-5 text-reactor-cyan" />
                        <h2 className="text-lg font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                            SYSTEM_MODULES
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {modules.map((module) => (
                            <div
                                key={module.title}
                                className="group relative bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                            >
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/20 to-transparent" />

                                <div className="flex items-start justify-between mb-4">
                                    <module.icon className="w-6 h-6 text-reactor-cyan" />
                                    <div className={`w-2 h-2 rounded-full ${module.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>

                                <h3 className="text-sm font-mono-display font-bold text-gray-100 mb-2 tracking-wider">
                                    {module.title}
                                </h3>
                                <p className="text-xs text-gray-500 font-mono-display mb-4 leading-relaxed">
                                    {module.description}
                                </p>

                                <div className="space-y-1">
                                    {module.endpoints.map((endpoint) => (
                                        <div key={endpoint} className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-reactor-cyan/40" />
                                            <code className="text-[9px] text-gray-600 font-mono-display truncate">
                                                {endpoint}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Metrics Dashboard */}
                <section className="bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-8 mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-reactor-cyan mb-2">
                                {metrics.dataPoints.toLocaleString()}
                            </div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Data Points</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-green-500 mb-2">
                                {metrics.uptime}
                            </div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Uptime</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-purple-500 mb-2">
                                {metrics.responseTime}
                            </div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Avg Response</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-yellow-500 mb-2">
                                24/7
                            </div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Monitoring</p>
                        </div>
                    </div>
                </section>

                {/* Navigation */}
                <section className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <Server className="w-5 h-5 text-reactor-cyan" />
                        <h2 className="text-lg font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                            SYSTEM_NAVIGATION
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            href="/coordination"
                            className="group flex items-center gap-4 bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                        >
                            <Activity className="w-6 h-6 text-reactor-cyan" />
                            <div className="flex-1">
                                <h3 className="text-sm font-mono-display font-bold text-gray-100 mb-1 tracking-wider">
                                    COORDINATION LAYER
                                </h3>
                                <p className="text-[10px] text-gray-600 font-mono-display uppercase">
                                    Scorecards & Validation
                                </p>
                            </div>
                            <span className="text-reactor-cyan opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </Link>

                        <Link
                            href="/atlas"
                            className="group flex items-center gap-4 bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                        >
                            <Database className="w-6 h-6 text-reactor-cyan" />
                            <div className="flex-1">
                                <h3 className="text-sm font-mono-display font-bold text-gray-100 mb-1 tracking-wider">
                                    ATLAS PROTOCOL
                                </h3>
                                <p className="text-[10px] text-gray-600 font-mono-display uppercase">
                                    Search & Taxonomy
                                </p>
                            </div>
                            <span className="text-reactor-cyan opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </Link>

                        <Link
                            href="/"
                            className="group flex items-center gap-4 bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                        >
                            <Brain className="w-6 h-6 text-reactor-cyan" />
                            <div className="flex-1">
                                <h3 className="text-sm font-mono-display font-bold text-gray-100 mb-1 tracking-wider">
                                    CORE DASHBOARD
                                </h3>
                                <p className="text-[10px] text-gray-600 font-mono-display uppercase">
                                    System Overview
                                </p>
                            </div>
                            <span className="text-reactor-cyan opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </Link>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-reactor-cyan/10 mt-12">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="text-center">
                        <span className="text-[9px] font-mono-display text-gray-700 tracking-[0.3em] uppercase">
                            © 2024 ANDROMEDA_COMPUTER // INTELLIGENCE_ENGINE_ACTIVE
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}