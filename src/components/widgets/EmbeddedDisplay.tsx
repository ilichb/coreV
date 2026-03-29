import { ReactNode } from 'react';

interface EmbeddedDisplayProps {
    title: string;
    children: ReactNode;
    status?: 'active' | 'warning' | 'critical';
    className?: string;
}

export default function EmbeddedDisplay({ title, children, status = 'active', className = '' }: EmbeddedDisplayProps) {
    const statusIndicator = {
        active: 'bg-reactor-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)]',
        warning: 'bg-warning-orange animate-pulse',
        critical: 'bg-red-500 animate-ping'
    };

    return (
        <div className={`relative flex flex-col group andromeda-panel-wrapper ${className}`}>
            <div className="panel h-full flex flex-col">
                <div className="panel-corner tl"></div>
                <div className="panel-corner tr"></div>
                <div className="panel-corner bl"></div>
                <div className="panel-corner br"></div>

                {/* Cabecera de pantalla */}
                <div className="flex items-center justify-between mb-3 p-4 pb-2 border-b border-gray-800/50">
                    <h3 className="title-orbitron text-[10px] font-bold text-gray-400 group-hover:text-reactor-cyan transition-colors duration-300">
                        {title}
                    </h3>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusIndicator[status]}`} />
                </div>

                {/* Contenido */}
                <div className="flex-1 p-4 pt-0 text-gray-300 text-sm">
                    {children}
                </div>

                {/* Scanline effect overlay (sutil) */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-10" />
            </div>

            <style jsx>{`
                .value-glow {
                    text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
                }
            `}</style>
        </div>
    );
}
