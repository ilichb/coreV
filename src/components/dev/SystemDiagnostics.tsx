'use client';

import {
    Zap,
    Database,
    Globe,
    Lock,
    Cpu,
    Activity,
    ShieldCheck,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';

import { useTranslations } from 'next-intl';

interface ServiceStatus {
    name: string;
    status: 'ONLINE' | 'OFFLINE' | 'ELEVATED' | 'DEGRADED';
    latency?: string;
    load?: string;
    details: string;
}

export function SystemDiagnostics() {
    const t = useTranslations('SystemDiagnostics');

    const SERVICES: ServiceStatus[] = [
        { name: t('services.supabase.name'), status: 'ONLINE', latency: '4ms', details: t('services.supabase.details') },
        { name: t('services.redis.name'), status: 'ELEVATED', latency: '24ms', details: t('services.redis.details') },
        { name: t('services.pinata.name'), status: 'ONLINE', details: t('services.pinata.details') },
        { name: t('services.vara.name'), status: 'DEGRADED', latency: '450ms', details: t('services.vara.details') },
        { name: t('services.crypGuard.name'), status: 'ONLINE', details: t('services.crypGuard.details') },
    ];

    return (
        <div className="panel p-6 bg-[#0d0f14]/80 backdrop-blur-xl group h-full">
            <div className="panel-corner tl"></div>
            <div className="panel-corner tr"></div>
            <div className="panel-corner bl"></div>
            <div className="panel-corner br"></div>

            <div className="flex items-center justify-between mb-8 border-b border-[#1e2430] pb-4">
                <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-reactor-cyan animate-pulse group-hover:scale-110 transition-transform" />
                    <h3 className="title-orbitron text-xs font-bold text-gray-300 tracking-[0.2em] uppercase">{t('title')}</h3>
                </div>
                <button className="p-2 bg-black/40 hover:bg-reactor-cyan/5 rounded-[1px] transition-all border border-[#1e2430] hover:border-reactor-cyan/30 group/refresh">
                    <RefreshCw className="w-3.5 h-3.5 text-gray-600 group-hover/refresh:rotate-180 transition-all duration-500 group-hover/refresh:text-reactor-cyan" />
                </button>
            </div>

            <div className="space-y-4">
                {SERVICES.map((service) => (
                    <div key={service.name} className="panel p-4 bg-[#0d0f14]/40 border-[#1e2430] hover:border-reactor-cyan/20 transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] text-mono font-bold text-gray-500 group-hover:text-gray-300 transition-colors tracking-[0.15em] uppercase">
                                {service.name}
                            </span>
                            <div className="flex items-center gap-3">
                                <span className={`text-[8px] text-mono font-bold px-2 py-0.5 rounded-[1px] border
                                    ${service.status === 'ONLINE' ? 'bg-green-500/5 border-green-500/20 text-green-500' :
                                        service.status === 'DEGRADED' ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' :
                                            'bg-red-500/5 border-red-500/20 text-red-500'}
                                `}>
                                    {service.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] text-mono font-medium text-gray-600 truncate mr-6 opacity-70 tracking-wider">
                                {service.details}
                            </span>
                            {service.latency && (
                                <span className="text-[10px] text-mono font-bold text-gray-500 tabular-nums">
                                    {service.latency}
                                </span>
                            )}
                        </div>

                        <div className="h-1 w-full bg-black/60 rounded-[1px] overflow-hidden border border-white/5 shadow-inner">
                            <div className={`h-full transition-all duration-1000 ease-in-out ${service.status === 'ONLINE' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                                service.status === 'DEGRADED' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                                    'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                                }`} style={{ width: service.status === 'ONLINE' ? '100%' : '35%' }} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-10 pt-8 border-t border-[#1e2430] space-y-5">
                <div className="flex items-center justify-between group/status">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-green-500/5 border border-green-500/20 rounded-[1px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                        </div>
                        <span className="text-[10px] text-mono font-bold text-gray-500 uppercase tracking-widest">{t('envLock')}</span>
                    </div>
                    <span className="text-[9px] text-mono font-bold text-green-500 uppercase tracking-widest bg-green-500/5 px-2 py-0.5 border border-green-500/10">{t('prodSynced')}</span>
                </div>

                <div className="flex items-center justify-between group/status">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-amber-500/5 border border-amber-500/20 rounded-[1px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <span className="text-[10px] text-mono font-bold text-gray-500 uppercase tracking-widest">{t('debugVerbosity')}</span>
                    </div>
                    <span className="text-[9px] text-mono font-bold text-amber-500 uppercase tracking-widest bg-amber-500/5 px-2 py-0.5 border border-amber-500/10">{t('level3Ext')}</span>
                </div>
            </div>
        </div>
    );
}
