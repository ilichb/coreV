'use client';

import React from 'react';
import { ShieldAlert, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function BlockedPage() {
    const t = useTranslations('BlockedPage');

    return (
        <div className="min-h-screen bg-[#0a0b0e] flex items-center justify-center p-6 overflow-hidden relative">
            {/* High-tech background decoration */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-red-500/10 rounded-full animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-red-500/10 rounded-full animate-pulse [animation-delay:1s]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-red-500/20 rounded-full animate-pulse [animation-delay:2s]" />
            </div>

            <div className="max-w-xl w-full panel p-12 bg-[#0d0f14]/80 backdrop-blur-xl border-red-500/30 relative z-10 shadow-[0_0_100px_rgba(239,68,68,0.1)]">
                <div className="panel-corner tl"></div>
                <div className="panel-corner tr"></div>
                <div className="panel-corner bl"></div>
                <div className="panel-corner br"></div>

                <div className="flex flex-col items-center text-center space-y-8">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl group-hover:bg-red-500/30 transition-all duration-500" />
                        <div className="relative p-6 bg-red-500/10 border border-red-500/30 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="title-orbitron text-3xl font-bold text-white tracking-[0.2em] uppercase">
                            ANDROMEDA <span className="text-red-500">SHIELD</span>
                        </h1>
                        <div className="h-px w-32 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto" />
                        <h2 className="title-orbitron text-sm font-bold text-red-500/80 tracking-widest uppercase">
                            {t('subtitle')}
                        </h2>
                    </div>

                    <p className="text-gray-400 text-xs text-mono leading-relaxed max-w-sm uppercase tracking-wider font-bold">
                        {t('description')}
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full pt-4">
                        <div className="p-4 bg-black/40 border border-white/5 rounded-[1px] text-left">
                            <div className="flex items-center gap-2 mb-2 text-red-500/70">
                                <Lock className="w-3 h-3" />
                                <span className="text-[9px] text-mono font-bold uppercase tracking-widest">WAF_MODE</span>
                            </div>
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">ACTIVE_FILTERING</p>
                        </div>
                        <div className="p-4 bg-black/40 border border-white/5 rounded-[1px] text-left">
                            <div className="flex items-center gap-2 mb-2 text-amber-500/70">
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-[9px] text-mono font-bold uppercase tracking-widest">THREAT_LEVEL</span>
                            </div>
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">CRITICAL_SIGNATURE</p>
                        </div>
                    </div>

                    <div className="pt-6 flex flex-col items-center gap-4">
                        <Link 
                            href="/"
                            className="flex items-center gap-2 px-8 py-3 bg-red-500/10 border border-red-500/20 text-[10px] text-mono font-bold text-red-500 hover:bg-red-500/20 transition-all uppercase tracking-[0.3em] rounded-[1px]"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {t('back')}
                        </Link>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] text-gray-500 font-mono uppercase tracking-[0.2em]">
                                {t('protocol')}
                            </span>
                            <span className="text-[8px] text-gray-600 font-mono italic">
                                Incident Ref: {Math.random().toString(36).substring(7).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
