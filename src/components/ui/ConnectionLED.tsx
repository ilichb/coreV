export function ConnectionLED({
    ecosystem,
    status,
    lastSync
}: {
    ecosystem: string;
    status: 'synced' | 'syncing' | 'error';
    lastSync: string;
}) {
    const statusConfig = {
        synced: { color: 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]', label: 'ONLINE', borderColor: 'border-green-500/30' },
        syncing: { color: 'bg-reactor-cyan animate-pulse shadow-[0_0_12px_rgba(0,240,255,0.8)]', label: 'SYNCING', borderColor: 'border-reactor-cyan/30' },
        error: { color: 'bg-warning-orange animate-ping', label: 'OFFLINE', borderColor: 'border-warning-orange/30' }
    };

    return (
        <div className={`group flex flex-col justify-between p-4 bg-black/40 border ${statusConfig[status].borderColor} hover:border-opacity-60 rounded-[2px] w-full h-full transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]`}>
            <div className="flex items-center justify-between mb-3">
                {/* LED Indicator */}
                <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${statusConfig[status].color}`} />
                    {/* Base del LED */}
                    <div className="absolute -inset-1 border border-white/10 rounded-full" />
                </div>

                {/* Status Label */}
                <span className={`text-[10px] font-mono-display font-bold tracking-wider ${status === 'error' ? 'text-warning-orange' :
                        status === 'syncing' ? 'text-reactor-cyan' :
                            'text-green-400'
                    }`}>
                    {statusConfig[status].label}
                </span>
            </div>

            {/* Ecosystem Name */}
            <div className="space-y-1">
                <span className="font-mono-display text-sm text-gray-300 tracking-wider uppercase font-bold block">
                    {ecosystem}
                </span>
                <span className="text-[10px] text-gray-600 font-mono-display block">
                    Last sync: {lastSync}
                </span>
            </div>
        </div>
    );
}

