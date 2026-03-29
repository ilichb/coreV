import { ReactNode } from 'react';

interface HardTechContainerProps {
    children: ReactNode;
    className?: string;
}

export default function HardTechContainer({ children, className = '' }: HardTechContainerProps) {
    return (
        <div className={`min-h-screen bg-steel-matte text-gray-300 font-sans-ui overflow-x-hidden ${className}`}>
            {/* Fondo base con textura de ruido */}
            <div className="fixed inset-0 bg-noise-texture opacity-30 pointer-events-none z-0" />

            {/* Overlay de viñeta industrial */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-0" />

            {/* Grid de alta densidad - Wrapper de contenido */}
            <div className="relative z-10 w-full min-h-screen flex flex-col">
                {children}
            </div>
        </div>
    );
}
