'use client';

import { useState } from 'react';

interface YieldProjection {
  projectedYieldRIF: number;
  aprUsed: number;
  recommendedBuilders: Array<{ name: string; category: string; address: string }>;
}

interface CheckResult {
  found: boolean;
  wallet: string;
  cohort?: string;
  balance?: number;
  daysInactive?: number;
  lastStakeActivity?: string;
  message?: {
    subject: string;
    body: string;
    variant: string;
  };
  yieldProjection?: YieldProjection;
  viewLogged?: boolean;
  error?: string;
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function formatRIF(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function PreviewPage() {
  const [walletInput, setWalletInput] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'es'>('en');

  const handleCheck = async () => {
    const trimmed = walletInput.trim();
    if (!trimmed || !/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError('Please enter a valid 0x wallet address (42 characters).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/fes/check-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: trimmed }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Failed to check wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCheck();
  };

  return (
    <div className="min-h-screen bg-[#050608] text-gray-100 p-4 md:p-8">
      <div className="max-w-[720px] mx-auto space-y-8">

        {/* Header */}
        <header className="border-b border-[#00f0ff]/20 pb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              <span className="text-[10px] font-mono font-medium text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-3 py-1 tracking-widest">
                ROOTSTOCK_FES_CHECKER
              </span>
            </div>
            <button
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="text-[10px] font-mono text-gray-500 hover:text-[#00f0ff] border border-gray-800 hover:border-[#00f0ff]/30 px-3 py-1.5 transition-all uppercase tracking-widest"
              aria-label={lang === 'en' ? 'Switch to Spanish' : 'Switch to English'}
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tighter">
            {lang === 'en' ? 'STAKING ACTIVITY' : 'ACTIVIDAD DE STAKING'}
            <span className="text-[#00f0ff]"> {lang === 'en' ? 'CHECKER' : 'VERIFICADOR'}</span>
          </h1>
          <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-wider">
            {lang === 'en'
              ? 'Enter your wallet to check your staking status'
              : 'Ingresá tu wallet para verificar tu estado de staking'}
          </p>
        </header>

        {/* Input */}
        <div className="space-y-3">
          <label htmlFor="wallet-input" className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">
            {lang === 'en' ? 'Wallet Address' : 'Dirección de Wallet'}
          </label>
          <div className="flex gap-2">
            <input
              id="wallet-input"
              type="text"
              placeholder="0x..."
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-black/60 border border-gray-800 px-4 py-3 text-sm font-mono text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-[#00f0ff]/40 focus:ring-1 focus:ring-[#00f0ff]/20 transition-all"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={handleCheck}
              disabled={loading}
              className="px-6 py-3 bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-xs font-mono font-bold tracking-widest hover:bg-[#00f0ff]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase focus-visible:ring-2 focus-visible:ring-[#00f0ff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050608]"
              aria-label={lang === 'en' ? 'Check wallet' : 'Verificar wallet'}
            >
              {loading ? (
                <span className="animate-pulse">{lang === 'en' ? 'CHECKING...' : 'VERIFICANDO...'}</span>
              ) : (
                lang === 'en' ? 'CHECK' : 'VERIFICAR'
              )}
            </button>
          </div>
          {error && (
            <div className="text-[10px] font-mono text-red-400 bg-red-400/5 border border-red-400/20 px-4 py-2" role="alert">
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {result.found ? (
              <>
                {/* Status Card */}
                <div className="border border-[#00f0ff]/20 bg-black/40 p-4 md:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                      {lang === 'en' ? 'Wallet' : 'Wallet'}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-1 border ${result.cohort === 'VIP'
                      ? 'border-[#ff6b6b]/40 text-[#ff6b6b]'
                      : result.cohort === 'B'
                        ? 'border-[#f59e0b]/40 text-[#f59e0b]'
                        : 'border-[#00f0ff]/40 text-[#00f0ff]'
                      }`}>
                      {result.cohort === 'VIP' ? 'VIP' : `COHORT ${result.cohort}`}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 break-all">
                    {shortenHash(result.wallet)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800">
                    <div>
                      <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                        {lang === 'en' ? 'Balance' : 'Balance'}
                      </div>
                      <div className="text-sm font-mono font-bold text-gray-200 mt-0.5">
                        {formatRIF(result.balance!)} RIF
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                        {lang === 'en' ? 'Days Inactive' : 'Días Inactivo'}
                      </div>
                      <div className="text-sm font-mono font-bold text-gray-200 mt-0.5">
                        {result.daysInactive}d
                      </div>
                    </div>
                  </div>
                  {result.lastStakeActivity && (
                    <div className="text-[9px] font-mono text-gray-600">
                      {lang === 'en' ? 'Last activity' : 'Última actividad'}: {result.lastStakeActivity}
                    </div>
                  )}
                </div>

                {/* Yield Projection */}
                {result.yieldProjection && result.yieldProjection.projectedYieldRIF > 0 && (
                  <div className="border border-[#f59e0b]/20 bg-black/40 p-4 md:p-6">
                    <div className="text-[9px] font-mono text-[#f59e0b] uppercase tracking-widest mb-3">
                      {lang === 'en' ? 'Projected Yield' : 'Rendimiento Proyectado'}
                    </div>
                    <div className="text-lg font-mono font-bold text-[#f59e0b]">
                      ~{formatRIF(result.yieldProjection.projectedYieldRIF)} RIF
                    </div>
                    <div className="text-[9px] font-mono text-gray-600 mt-1">
                      {lang === 'en'
                        ? `At ${result.yieldProjection.aprUsed}% estimated APR during ${result.daysInactive} days of inactivity`
                        : `Al ${result.yieldProjection.aprUsed}% APR estimado durante ${result.daysInactive} días de inactividad`}
                    </div>

                    {result.yieldProjection.recommendedBuilders.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">
                          {lang === 'en' ? 'Recommended Builders' : 'Builders Recomendados'}
                        </div>
                        <div className="space-y-1.5">
                          {result.yieldProjection.recommendedBuilders.map((b, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]/60" />
                              <span className="text-gray-300">{b.name}</span>
                              <span className="text-gray-600">({b.category})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message */}
                {result.message && (
                  <div className="border border-gray-700/30 bg-black/40">
                    <div className="border-b border-gray-700/30 px-4 py-3 flex items-center gap-2">
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border ${result.message.variant === 'vip'
                        ? 'border-[#ff6b6b]/40 text-[#ff6b6b]'
                        : result.message.variant === 'treatment'
                          ? 'border-[#f59e0b]/40 text-[#f59e0b]'
                          : 'border-[#00f0ff]/40 text-[#00f0ff]'
                        }`}>
                        {result.message.variant.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                        {lang === 'en' ? 'Your Message' : 'Tu Mensaje'}
                      </span>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      <div className="text-xs font-mono font-bold text-gray-200">
                        {result.message.subject}
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 leading-relaxed whitespace-pre-line">
                        {result.message.body}
                      </div>
                    </div>
                    <div className="px-4 py-2 border-t border-gray-700/30">
                      <span className="text-[8px] font-mono text-gray-700">
                        {lang === 'en' ? 'View logged' : 'Vista registrada'} — {new Date().toISOString()}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Not found */
              <div className="border border-gray-700/30 bg-black/40 p-6 text-center">
                <div className="text-[10px] font-mono text-gray-500">
                  {typeof result.message === 'string'
                    ? result.message
                    : result.message?.body || (lang === 'en'
                      ? 'No inactive staking position found.'
                      : 'No se encontró posición de staking inactiva.')}
                </div>
                <div className="text-[9px] font-mono text-gray-700 mt-3">
                  {shortenHash(result.wallet)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="border border-gray-800/50 bg-black/20 p-8 text-center">
            <div className="text-[10px] font-mono text-gray-600">
              {lang === 'en'
                ? 'Enter a wallet address above to check your staking status.'
                : 'Ingresá una dirección de wallet arriba para verificar tu estado de staking.'}
            </div>
            <div className="text-[9px] font-mono text-gray-800 mt-2">
              {lang === 'en'
                ? 'Only you can see your information.'
                : 'Solo vos podés ver tu información.'}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-800 pt-4 pb-8">
          <div className="text-[9px] font-mono text-gray-700 space-y-1">
            <div>Rootstock FES Pilot — Funding Efficiency Score</div>
            <div>Data source: Rewards Subgraph (backerStakingHistories)</div>
            <div className="text-gray-600">
              {lang === 'en'
                ? 'Your wallet address is hashed and never stored in plaintext.'
                : 'Tu dirección de wallet es hasheada y nunca se almacena en texto plano.'}
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
