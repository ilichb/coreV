export function AuditSafetySwitch({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`
        relative px-6 py-3 rounded-[2px] font-sans-ui font-bold text-sm tracking-wider
        transition-all duration-200 transform
        ${isActive
                    ? 'bg-reactor-cyan text-display-black shadow-metal-glow scale-[0.98]'
                    : 'bg-steel-polished-dark text-gray-400 hover:brightness-125 hover:text-white'
                }
        active:scale-95
        border-t border-l border-t-border-light border-l-border-light
        border-r border-b border-r-black border-b-black
        group
      `}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {isActive && (
                    <span className="w-2 h-2 rounded-full bg-display-black animate-pulse" />
                )}
                {isActive ? 'AUDITORÍA ACTIVA' : 'INICIAR AUTO-AUDITORÍA'}
            </span>

            {/* Efecto de interruptor industrial (diagonal stripes overlay when active) */}
            {isActive && (
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px] opacity-20 pointer-events-none" />
            )}
        </button>
    );
}
