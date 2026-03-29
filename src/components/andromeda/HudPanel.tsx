import { ReactNode } from 'react';

interface HudPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'hero' | 'highlight';
}

export function HudPanel({ id, children, className = '', variant = 'default' }: HudPanelProps) {
  const variantStyles = {
    default: 'py-20',
    hero: 'min-h-screen flex items-center justify-center',
    highlight: 'py-20 bg-gradient-to-br from-gray-900/50 to-black/50',
  };

  return (
    <section 
      id={id}
      className={`${variantStyles[variant]} ${className}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}
