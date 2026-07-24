'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

export default function FESLoginPage() {
  const t = useTranslations('FESDashboardLogin');
  const pathname = usePathname();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/fes/dashboard-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Usar window.location.href para evitar duplicación de locale por next-intl
        const locale = pathname?.split('/')[1] || 'en';
        window.location.href = `/${locale}/internal/fes`;
      } else {
        setError(data.error === 'Too many attempts'
          ? t('errorBlocked')
          : t('errorInvalid'));
      }
    } catch {
      setError(t('errorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Watermark logo */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url('/logo-andromeda.png')`,
          backgroundSize: '300px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="border border-gray-800 bg-black/60 p-8 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              <span className="text-[10px] font-mono font-medium text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-3 py-1 tracking-widest">
                FES_DASHBOARD
              </span>
            </div>
            <h1 className="text-xl font-mono font-bold tracking-tighter" style={{ fontFamily: 'Orbitron, monospace' }}>
              <span className="text-[#00f0ff]">{t('title')}</span>
            </h1>
            <p className="text-xs font-mono text-gray-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {t('subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">
                {t('passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="w-full bg-black/60 border border-gray-800 px-4 py-3 text-sm font-mono text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-[#00f0ff]/40 focus:ring-1 focus:ring-[#00f0ff]/20 transition-all"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-[10px] font-mono text-red-400 bg-red-400/5 border border-red-400/20 px-4 py-2" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full px-6 py-3 bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-xs font-mono font-bold tracking-widest hover:bg-[#00f0ff]/20 hover:border-green-500/50 hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase focus-visible:ring-2 focus-visible:ring-[#00f0ff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050608]"
            >
              {loading ? (
                <span className="animate-pulse">AUTHORIZING...</span>
              ) : (
                t('submitButton')
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-[9px] font-mono text-gray-700 text-center pt-2 border-t border-gray-800">
            ANDROMEDA CORE — FES PILOT DASHBOARD
          </div>
        </div>
      </div>
    </div>
  );
}