'use client';

import { useState, useEffect } from 'react';
import DashboardUnified from '@/components/layout/DashboardUnified';
import Link from 'next/link';
import { TerminalValidator } from '@/components/andromeda/TerminalValidator';
import { logger } from '../../../../lib/utils/logger';
import {
    ClipboardList,
    Activity,
    ShieldCheck,
    Database,
    Beaker,
    Zap,
    HardDrive,
    Globe,
    Terminal
} from 'lucide-react';

// Componente de carga industrial
function Loading() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-reactor-cyan/30 border-t-reactor-cyan rounded-full animate-spin"></div>
                <div className="text-sm font-mono-display text-reactor-cyan animate-pulse tracking-[0.2em]">
                    INITIALIZING_VALIDATION_LAYER...
                </div>
            </div>
        </div>
    );
}

export default function ValidatePage() {
    const [mounted, setMounted] = useState(false);
    const [validationHistory, setValidationHistory] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
        // Cargar historial desde localStorage
        const savedHistory = localStorage.getItem('validation_history');
        if (savedHistory) {
            try {
                setValidationHistory(JSON.parse(savedHistory).slice(0, 10));
            } catch (error) {
                logger.error('Error loading validation history:', error);
            }
        }
    }, []);

    const handleValidationComplete = (result: any) => {
        const newEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            result
        };
        
        const updatedHistory = [newEntry, ...validationHistory].slice(0, 10);
        setValidationHistory(updatedHistory);
        
        // Guardar en localStorage
        localStorage.setItem('validation_history', JSON.stringify(updatedHistory));
    };

    if (!mounted) return <Loading />;

    return (
        <DashboardUnified>
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Industrial Header */}
                <header className="relative border-b border-reactor-cyan/20 pb-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-reactor-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse" />
                                <span className="text-[10px] font-mono-display font-medium text-reactor-cyan bg-reactor-cyan/10 border border-reactor-cyan/20 px-3 py-1 rounded-[2px] tracking-widest leading-none">
                                    PHASE_01: VALIDATION_PROTOCOL
                                </span>
                            </div>

                            <div>
                                <h1 className="text-4xl md:text-5xl font-mono-display font-bold text-gray-100 tracking-tighter mb-2 uppercase">
                                    ON-CHAIN <span className="text-reactor-cyan">VALIDATION</span>
                                </h1>
                                <p className="text-gray-500 font-mono-display text-xs max-w-2xl leading-relaxed uppercase tracking-wider">
                                    Real-time scorecard validation against Andromeda Core schema.
                                    <span className="text-reactor-cyan/60 ml-2">// CLARITY_DELTA_IS_THE_METRIC</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 bg-black/40 border border-reactor-cyan/10 p-4 rounded-[2px] min-w-[200px]">
                            <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest">Validation Status</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-mono-display font-bold text-gray-100 tabular-nums">ACTIVE</span>
                            </div>
                            <p className="text-[9px] text-reactor-cyan/60 font-mono-display">REAL_TIME_SCHEMA_CHECK</p>
                        </div>
                    </div>

                    {/* Sub-Navigation */}
                    <nav className="flex items-center gap-6 mt-8">
                        <Link
                            href="/coordination"
                            className="group flex items-center gap-2 text-[10px] font-mono-display font-bold text-gray-500 hover:text-reactor-cyan transition-all pb-2 tracking-widest"
                        >
                            <ClipboardList className="w-3.5 h-3.5" />
                            SCORECARD
                        </Link>
                        <Link
                            href="/registry"
                            className="group flex items-center gap-2 text-[10px] font-mono-display font-bold text-gray-500 hover:text-reactor-cyan transition-all pb-2 tracking-widest"
                        >
                            <Activity className="w-3.5 h-3.5" />
                            REGISTRY
                        </Link>
                        <Link
                            href="/coordination/validate"
                            className="group flex items-center gap-2 text-[10px] font-mono-display font-bold text-reactor-cyan border-b-2 border-reactor-cyan pb-2 tracking-widest"
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            VALIDATE
                        </Link>
                    </nav>
                </header>

                {/* Top Operational Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'TOTAL_VALIDATIONS', value: validationHistory.length.toString(), icon: Database, color: 'text-reactor-cyan' },
                        { label: 'API_ENDPOINT', value: 'ACTIVE', icon: Zap, color: 'text-green-500' },
                        { label: 'SCHEMA_VERSION', value: 'v1.2', icon: ShieldCheck, color: 'text-amber-500' },
                        { label: 'AVG_CLARITY', value: '74%', icon: HardDrive, color: 'text-purple-500' },
                    ].map((m, i) => (
                        <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-[2px] flex items-center justify-between group hover:border-reactor-cyan/30 transition-all">
                            <div>
                                <p className="text-[8px] text-gray-600 font-mono-display uppercase tracking-widest mb-1">{m.label}</p>
                                <p className={`text-lg font-mono-display font-bold ${m.color}`}>{m.value}</p>
                            </div>
                            <m.icon className={`w-5 h-5 ${m.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                        </div>
                    ))}
                </div>

                {/* Main Validation Interface */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Terminal Validator */}
                    <div className="lg:col-span-2">
                        <div className="relative group rounded-[2px] border border-reactor-cyan/10 bg-black/40 backdrop-blur-md p-6 transition-all duration-300 hover:border-reactor-cyan/30">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-reactor-cyan/20 to-transparent" />

                            <div className="flex items-center gap-3 mb-8">
                                <Terminal className="w-5 h-5 text-reactor-cyan" />
                                <h2 className="text-sm font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                                    TERMINAL_VALIDATOR_V1.0
                                </h2>
                            </div>

                            <TerminalValidator onValidationComplete={handleValidationComplete} />
                        </div>
                    </div>

                    {/* Right Column: Validation Info & History */}
                    <div className="space-y-6">
                        {/* API Info */}
                        <div className="bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Beaker className="w-4 h-4 text-reactor-cyan" />
                                <h3 className="text-xs font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                                    API_ENDPOINTS
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest mb-1">POST /api/coordination/validate</p>
                                    <code className="text-[9px] text-reactor-cyan font-mono-display block bg-black/60 p-2 rounded-[2px] border border-white/5">
                                        {"{ \"scorecard\": { \"sections\": [...] } }"}
                                    </code>
                                </div>
                                
                                <div>
                                    <p className="text-[10px] text-gray-500 font-mono-display uppercase tracking-widest mb-1">Response Format</p>
                                    <code className="text-[9px] text-gray-400 font-mono-display block bg-black/60 p-2 rounded-[2px] border border-white/5">
                                        {"{ \"isValid\": boolean, \"clarityDelta\": number, \"warnings\": string[], \"errors\": string[] }"}
                                    </code>
                                </div>
                            </div>
                        </div>

                        {/* Validation History */}
                        <div className="bg-black/40 border border-reactor-cyan/10 rounded-[2px] p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-reactor-cyan" />
                                    <h3 className="text-xs font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
                                        VALIDATION_HISTORY
                                    </h3>
                                </div>
                                <span className="text-[10px] text-gray-600 font-mono-display">
                                    {validationHistory.length} records
                                </span>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {validationHistory.length > 0 ? (
                                    validationHistory.map((entry) => (
                                        <div key={entry.id} className="bg-black/60 border border-white/5 p-3 rounded-[2px]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] text-gray-500 font-mono-display">
                                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                                </span>
                                                <span className={`text-[9px] font-mono-display font-bold ${
                                                    entry.result?.isValid ? 'text-green-500' : 'text-red-500'
                                                }`}>
                                                    {entry.result?.isValid ? 'PASS' : 'FAIL'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-mono-display text-gray-400">
                                                    Clarity: {entry.result?.clarityDelta || 0}
                                                </span>
                                                <span className="text-[8px] text-gray-600">
                                                    Errors: {entry.result?.errors?.length || 0}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-[10px] text-gray-600 font-mono-display uppercase tracking-widest">
                                            NO_VALIDATION_HISTORY
                                        </p>
                                        <p className="text-[9px] text-gray-700 mt-1">
                                            Start validating scorecards to see history
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-16 pt-8 border-t border-reactor-cyan/10">
                    <div className="text-center pb-8">
                        <span className="text-[9px] font-mono-display text-gray-700 tracking-[0.3em] uppercase">
                            © 2024 ANDROMEDA_COMPUTER // REAL_TIME_VALIDATION_SYSTEM
                        </span>
                    </div>
                </footer>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 2px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 240, 255, 0.3);
                    border-radius: 2px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 240, 255, 0.5);
                }
            `}</style>
        </DashboardUnified>
    );
}