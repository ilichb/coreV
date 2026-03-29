"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Cpu, Database, Shield, Terminal, Zap, Server, Globe } from 'lucide-react';
import { EcosystemStatusTicker } from '@/components/andromeda/EcosystemStatusTicker';

export default function HomePage() {
    const [systemStatus, setSystemStatus] = useState<'loading' | 'operational' | 'warning' | 'error'>('loading');
    const [apiStatus, setApiStatus] = useState<Record<string, boolean>>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Simular carga de estado del sistema
        const timer = setTimeout(() => {
            setSystemStatus('operational');
            setApiStatus({
                diagnostic: true,
                coordination: true,
                intelligence: true,
                atlas: true,
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-reactor-cyan/30 border-t-reactor-cyan rounded-full animate-spin"></div>
                    <div className="text-sm font-mono-display text-reactor-cyan animate-pulse tracking-[0.2em]">
                        INITIALIZING_ANDROMEDA_CORE...
                    </div>
                </div>
            </div>
        );
    }

    const systemCards = [
        {
            title: 'COORDINATION LAYER',
            description: 'Protocolos de coordinación técnica y validación de scorecards',
            icon: Activity,
            path: '/coordination',
            status: apiStatus.coordination ? 'operational' : 'error',
            endpoints: ['/api/coordination/diagnostic', '/api/coordination/scorecards', '/api/coordination/publish']
        },
        {
            title: 'INTELLIGENCE ENGINE',
            description: 'Motor de análisis y sincronización de datos en tiempo real',
            icon: Cpu,
            path: '/intelligence',
            status: apiStatus.intelligence ? 'operational' : 'error',
            endpoints: ['/api/intelligence/sync', '/api/intelligence/monitoring']
        },
        {
            title: 'ATLAS PROTOCOL',
            description: 'Sistema de búsqueda avanzada y taxonomía de industrias',
            icon: Globe,
            path: '/atlas',
            status: apiStatus.atlas ? 'operational' : 'error',
            endpoints: ['/api/atlas/search', '/api/atlas/validate']
        },
        {
            title: 'SECURITY VAULT',
            description: 'Gestión de claves y autenticación criptográfica',
            icon: Shield,
            path: '/security',
            status: 'operational',
            endpoints: ['/api/security/keys', '/api/security/audit']
        }
    ];

    const quickLinks = [
        { label: 'API Documentation', path: '/api-docs', icon: Terminal },
        { label: 'System Diagnostics', path: '/api/coordination/diagnostic', icon: Server },
        { label: 'Landing Portal', path: 'http://localhost:3000/es', icon: Globe, external: true },
        { label: 'Developer Tools', path: '/dev', icon: Zap }
    ];

    return (
        <div className="min-h-screen bg-black text-gray-100">
            {/* Header Industrial */}
            <header className="border-b border-reactor-cyan/20">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${systemStatus === 'operational' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                                        systemStatus === 'warning' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' :
                                            systemStatus === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                                                'bg-reactor-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)]'
                                    } animate-pulse`} />
                                <span className="text-[10px] font-mono-display font-medium text-reactor-cyan bg-reactor-cyan/10 border border-reactor-cyan/20 px-3 py-1 rounded-[2px] tracking-widest leading-none">
                                    ANDROMEDA_CORE_v1.0
                                </span>
                            </div>

                            <div>
                                <h1 className="text-4xl md:text-5xl font-mono-display font-bold tracking-tighter mb-2">
                                    <span className="text-gray-100">ANDROMEDA</span>{' '}
                                    <span className="text-reactor-cyan">CORE</span>
                                </h1>
                                <p className="text-gray-500 font-mono-display text-xs max-w-2xl leading-relaxed uppercase tracking-wider">
                                    Technical Engine & Protocol Infrastructure
                                    <span className="text-reactor-cyan/60 ml-2">// PORT_4000</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 bg-black/40 border border-reactor-cyan/10 p-4 rounded-[2px] min-w-[200px]">
                            <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest">System Status</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-mono-display font-bold ${systemStatus === 'operational' ? 'text-green-500' :
                                        systemStatus === 'warning' ? 'text-yellow-500' :
                                            systemStatus === 'error' ? 'text-red-500' :
                                                'text-reactor-cyan'
                                    } tabular-nums uppercase`}>
                                    {systemStatus === 'operational' ? 'OPERATIONAL' :
                                        systemStatus === 'warning' ? 'WARNING' :
                                            systemStatus === 'error' ? 'ERROR' : 'LOADING'}
                                </span>
                            </div>
                            <p className="text-[9px] text-reactor-cyan/60 font-mono-display">UPTIME_99.8%</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Ecosystem Status Ticker */}
                <EcosystemStatusTicker />

                {/* System Overview */}
                <section className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <Database className="w-5 h-5 text-reactor-cyan" />
                        <h2 className="text-lg font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                            SYSTEM_OVERVIEW
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {systemCards.map((card) => (
                            <Link
                                key={card.title}
                                href={card.path}
                                className="group relative bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                            >
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/20 to-transparent" />

                                <div className="flex items-start justify-between mb-4">
                                    <card.icon className="w-6 h-6 text-reactor-cyan" />
                                    <div className={`w-2 h-2 rounded-full ${card.status === 'operational' ? 'bg-green-500' : 'bg-red-500'
                                        }`} />
                                </div>

                                <h3 className="text-sm font-mono-display font-bold text-gray-100 mb-2 tracking-wider">
                                    {card.title}
                                </h3>
                                <p className="text-xs text-gray-500 font-mono-display mb-4 leading-relaxed">
                                    {card.description}
                                </p>

                                <div className="space-y-1">
                                    {card.endpoints.map((endpoint) => (
                                        <div key={endpoint} className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-reactor-cyan/40" />
                                            <code className="text-[9px] text-gray-600 font-mono-display truncate">
                                                {endpoint}
                                            </code>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-reactor-cyan/10">
                                    <span className="text-[10px] font-mono-display text-reactor-cyan group-hover:text-reactor-cyan/80 transition-colors">
                                        ACCESS_PROTOCOL →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Quick Access */}
                <section className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="w-5 h-5 text-reactor-cyan" />
                        <h2 className="text-lg font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                            QUICK_ACCESS
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.path}
                                target={link.external ? '_blank' : undefined}
                                rel={link.external ? 'noopener noreferrer' : undefined}
                                className="group flex items-center gap-4 bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-4 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                            >
                                <link.icon className="w-5 h-5 text-reactor-cyan" />
                                <div className="flex-1">
                                    <h3 className="text-sm font-mono-display font-bold text-gray-100 mb-1 tracking-wider">
                                        {link.label}
                                    </h3>
                                    <p className="text-[10px] text-gray-600 font-mono-display uppercase">
                                        {link.external ? 'EXTERNAL_PORTAL' : 'INTERNAL_ROUTE'}
                                    </p>
                                </div>
                                <span className="text-reactor-cyan opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </a>
                        ))}
                    </div>
                </section>

                {/* System Metrics */}
                <section className="bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-reactor-cyan mb-2">8</div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Active Services</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-green-500 mb-2">24/7</div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Uptime Monitor</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-purple-500 mb-2">0.02s</div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Avg Response Time</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-reactor-cyan/10 mt-12">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h4 className="text-[10px] font-mono-display font-bold text-gray-400 tracking-[0.2em] mb-3 uppercase">
                                Architecture
                            </h4>
                            <p className="text-xs text-gray-600 font-mono-display uppercase leading-relaxed">
                                Decoupled Microservices<br />
                                Event-Driven Design<br />
                                Real-time Synchronization
                            </p>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-mono-display font-bold text-reactor-cyan tracking-[0.2em] mb-3 uppercase">
                                Integration Points
                            </h4>
                            <p className="text-xs text-gray-600 font-mono-display uppercase leading-relaxed">
                                Vara Network<br />
                                Supabase Database<br />
                                Redis Cache<br />
                                IPFS Storage
                            </p>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-mono-display font-bold text-gray-400 tracking-[0.2em] mb-3 uppercase">
                                Deployment
                            </h4>
                            <p className="text-xs text-gray-600 font-mono-display uppercase leading-relaxed">
                                Port: 4000<br />
                                Environment: Production<br />
                                Version: v1.0.0
                            </p>
                        </div>
                    </div>

                    <div className="text-center mt-8 pt-8 border-t border-reactor-cyan/10">
                        <span className="text-[9px] font-mono-display text-gray-700 tracking-[0.3em] uppercase">
                            © 2024 ANDROMEDA_COMPUTER // CORE_ENGINE_OPERATIONAL
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}