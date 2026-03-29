"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Globe, Database, Layers, Filter, BarChart, Zap } from 'lucide-react';

export default function AtlasPage() {
    const [stats, setStats] = useState({
        industries: 42,
        taxonomies: 187,
        searches: 12547,
        accuracy: '98.2%'
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
                        LOADING_ATLAS_PROTOCOL...
                    </div>
                </div>
            </div>
        );
    }

    const features = [
        {
            title: 'ADVANCED SEARCH',
            description: 'Búsqueda semántica y taxonómica avanzada',
            icon: Search,
            endpoints: ['/api/atlas/search', '/api/atlas/validate']
        },
        {
            title: 'INDUSTRY TAXONOMY',
            description: 'Clasificación de 42 industrias principales',
            icon: Layers,
            endpoints: ['/api/atlas/taxonomy', '/api/atlas/categories']
        },
        {
            title: 'DATA ENRICHMENT',
            description: 'Enriquecimiento de datos con fuentes externas',
            icon: Database,
            endpoints: ['/api/atlas/enrich', '/api/atlas/sources']
        },
        {
            title: 'ANALYTICS DASHBOARD',
            description: 'Métricas y análisis de búsquedas',
            icon: BarChart,
            endpoints: ['/api/atlas/analytics', '/api/atlas/metrics']
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
                                    ATLAS_PROTOCOL_v1.0
                                </span>
                            </div>

                            <div>
                                <h1 className="text-4xl md:text-5xl font-mono-display font-bold tracking-tighter mb-2">
                                    <span className="text-gray-100">ATLAS</span>{' '}
                                    <span className="text-reactor-cyan">PROTOCOL</span>
                                </h1>
                                <p className="text-gray-500 font-mono-display text-xs max-w-2xl leading-relaxed uppercase tracking-wider">
                                    Advanced search & industry taxonomy system
                                    <span className="text-reactor-cyan/60 ml-2">// SEMANTIC_SEARCH</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 bg-black/40 border border-reactor-cyan/10 p-4 rounded-[2px] min-w-[200px]">
                            <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest">Search Accuracy</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-mono-display font-bold text-green-500 tabular-nums uppercase">
                                    {stats.accuracy}
                                </span>
                            </div>
                            <p className="text-[9px] text-reactor-cyan/60 font-mono-display">INDUSTRIES: {stats.industries}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Features Grid */}
                <section className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <Globe className="w-5 h-5 text-reactor-cyan" />
                        <h2 className="text-lg font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                            PROTOCOL_FEATURES
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="group relative bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                            >
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/20 to-transparent" />

                                <div className="flex items-start justify-between mb-4">
                                    <feature.icon className="w-6 h-6 text-reactor-cyan" />
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                </div>

                                <h3 className="text-sm font-mono-display font-bold text-gray-100 mb-2 tracking-wider">
                                    {feature.title}
                                </h3>
                                <p className="text-xs text-gray-500 font-mono-display mb-4 leading-relaxed">
                                    {feature.description}
                                </p>

                                <div className="space-y-1">
                                    {feature.endpoints.map((endpoint) => (
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

                {/* Stats Dashboard */}
                <section className="bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-8 mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-reactor-cyan mb-2">
                                {stats.industries}
                            </div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Industries</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-green-500 mb-2">
                                {stats.taxonomies}
                            </div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Taxonomies</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-purple-500 mb-2">
                                {stats.searches.toLocaleString()}
                            </div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Searches</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-mono-display font-bold text-yellow-500 mb-2">
                                {stats.accuracy}
                            </div>
                            <p className="text-xs font-mono-display text-gray-500 uppercase tracking-wider">Accuracy</p>
                        </div>
                    </div>
                </section>

                {/* Navigation */}
                <section className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <Filter className="w-5 h-5 text-reactor-cyan" />
                        <h2 className="text-lg font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                            SYSTEM_NAVIGATION
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            href="/intelligence"
                            className="group flex items-center gap-4 bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                        >
                            <Zap className="w-6 h-6 text-reactor-cyan" />
                            <div className="flex-1">
                                <h3 className="text-sm font-mono-display font-bold text-gray-100 mb-1 tracking-wider">
                                    INTELLIGENCE ENGINE
                                </h3>
                                <p className="text-[10px] text-gray-600 font-mono-display uppercase">
                                    Data Sync & Analytics
                                </p>
                            </div>
                            <span className="text-reactor-cyan opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </Link>

                        <Link
                            href="/coordination"
                            className="group flex items-center gap-4 bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                        >
                            <Database className="w-6 h-6 text-reactor-cyan" />
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
                            href="/"
                            className="group flex items-center gap-4 bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6 transition-all duration-300 hover:border-reactor-cyan/30 hover:bg-black/60"
                        >
                            <Globe className="w-6 h-6 text-reactor-cyan" />
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

                {/* Quick Search */}
                <section className="bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-8">
                    <div className="max-w-2xl mx-auto">
                        <h3 className="text-lg font-mono-display font-bold text-gray-300 mb-4 tracking-[0.2em] uppercase text-center">
                            QUICK_SEARCH_DEMO
                        </h3>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search industries, taxonomies, or entities..."
                                className="w-full bg-black/60 border border-reactor-cyan/20 rounded-[2px] px-6 py-4 font-mono-display text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-reactor-cyan/40 transition-all"
                            />
                            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-reactor-cyan/20 hover:bg-reactor-cyan/30 border border-reactor-cyan/30 text-reactor-cyan px-4 py-2 rounded-[2px] font-mono-display text-xs uppercase tracking-wider transition-all">
                                SEARCH
                            </button>
                        </div>
                        <p className="text-center mt-4 text-xs text-gray-600 font-mono-display uppercase tracking-wider">
                            Try: "blockchain infrastructure" or "renewable energy projects"
                        </p>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-reactor-cyan/10 mt-12">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="text-center">
                        <span className="text-[9px] font-mono-display text-gray-700 tracking-[0.3em] uppercase">
                            © 2024 ANDROMEDA_COMPUTER // ATLAS_PROTOCOL_ACTIVE
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}