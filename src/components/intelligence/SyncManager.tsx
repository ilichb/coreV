'use client';

import { useState } from 'react';
import { RefreshCw, Play, Zap, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { logger } from '../../lib/utils/logger';

interface SyncStatus {
    lastSync: string;
    result: any;
    error: string | null;
}

export function SyncManager() {
    const [syncing, setSyncing] = useState(false);
    const [status, setStatus] = useState<SyncStatus>({
        lastSync: 'Never',
        result: null,
        error: null
    });

    const triggerSync = async (ecosystem?: string) => {
        setSyncing(true);
        setStatus(prev => ({ ...prev, error: null }));

        try {
            const endpoint = ecosystem
                ? `/api/intelligence/sync?action=trigger-ecosystem&ecosystem=${ecosystem}`
                : '/api/intelligence/sync?action=trigger-full';

            const response = await fetch(endpoint, { method: 'POST' });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
            }

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || data.error || 'Sync failed');

            setStatus({
                lastSync: new Date().toLocaleTimeString(),
                result: data,
                error: null
            });
        } catch (err: any) {
            logger.error('Sync error:', err);
            setStatus(prev => ({ ...prev, error: err.message }));
        } finally {
            setSyncing(false);
        }
    };


    const ecosystems = [
        { id: 'rootstock', name: 'ROOTSTOCK', color: 'border-green-500/30 hover:border-green-500/50' },
        { id: 'optimism', name: 'OPTIMISM', color: 'border-red-500/30 hover:border-red-500/50' },
        { id: 'arbitrum', name: 'ARBITRUM', color: 'border-blue-500/30 hover:border-blue-500/50' }
    ];

    return (
        <div className="space-y-4">
            {/* Control Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/40 rounded-[2px] border border-gray-800">
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-reactor-cyan' : 'text-gray-500'}`} />
                    </div>
                    <div>
                        <h3 className="text-sm font-mono-display font-bold text-gray-300 tracking-wider">
                            SYNC CONTROL
                        </h3>
                        <p className="text-[10px] text-gray-600 font-mono-display flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            LAST: {status.lastSync}
                        </p>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-[2px] border border-gray-800">
                    <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-reactor-cyan animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.6)]' : 'bg-gray-700'}`} />
                    <span className="text-[10px] font-mono-display font-bold text-gray-500">
                        {syncing ? 'SYNCING' : 'IDLE'}
                    </span>
                </div>
            </div>

            {/* Main Control Buttons */}
            <div className="grid grid-cols-1 gap-3">
                {/* Full Sync Button */}
                <button
                    onClick={() => triggerSync()}
                    disabled={syncing}
                    className="group relative px-6 py-4 rounded-[2px] font-mono-display font-bold text-sm tracking-wider
                        transition-all duration-200 transform
                        bg-steel-polished-dark text-gray-300 hover:text-white
                        border-t border-l border-t-border-light border-l-border-light
                        border-r border-b border-r-black border-b-black
                        hover:brightness-125 active:scale-[0.98]
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
                >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                        <Zap className="w-5 h-5 text-reactor-cyan" />
                        TRIGGER FULL ECOSYSTEM SYNC
                        {syncing && <RefreshCw className="w-4 h-4 animate-spin" />}
                    </span>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-reactor-cyan/0 via-reactor-cyan/5 to-reactor-cyan/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2px]" />
                </button>

                {/* Individual Ecosystem Buttons */}
                <div className="grid grid-cols-3 gap-2">
                    {ecosystems.map(eco => (
                        <button
                            key={eco.id}
                            onClick={() => triggerSync(eco.id)}
                            disabled={syncing}
                            className={`py-3 text-[11px] font-mono-display font-bold tracking-wider
                                bg-black/40 hover:bg-black/60 transition-all rounded-[2px]
                                border ${eco.color}
                                text-gray-400 hover:text-white
                                disabled:opacity-50 disabled:cursor-not-allowed
                                active:scale-95`}
                        >
                            {eco.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Status Messages */}
            {status.error && (
                <div className="relative p-4 bg-black/60 border-l-4 border-warning-orange rounded-[2px] flex items-start gap-3 animate-pulse">
                    <AlertTriangle className="w-5 h-5 text-warning-orange mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs font-mono-display font-bold text-warning-orange mb-1">SYNC ERROR</p>
                        <p className="text-xs text-gray-400 font-mono-display">{status.error}</p>
                    </div>
                </div>
            )}

            {status.result && !status.error && (
                <div className="relative p-4 bg-black/60 border-l-4 border-reactor-cyan rounded-[2px] flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-reactor-cyan mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs font-mono-display font-bold text-reactor-cyan mb-2">SYNC SUCCESSFUL</p>
                        <div className="bg-black/40 p-3 rounded-[2px] border border-gray-800/50">
                            <pre className="text-[10px] text-gray-500 font-mono-display overflow-x-auto">
                                {JSON.stringify(status.result.jobId || status.result, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Panel */}
            <div className="p-3 bg-black/20 border border-gray-800/30 rounded-[2px]">
                <p className="text-[10px] text-gray-600 font-mono-display leading-relaxed">
                    <span className="text-reactor-cyan font-bold">INFO:</span> Full sync aggregates data from all connected ecosystems.
                    Individual syncs target specific networks for faster updates.
                </p>
            </div>
        </div>
    );
}

