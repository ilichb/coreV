'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InternalLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch('/api/internal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Login failed');
      router.push('./fes');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050608] text-gray-100 p-8 flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm border border-gray-800 bg-black/40 p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] font-mono font-medium text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-1 tracking-widest">
            INTERNAL — LOGIN
          </span>
        </div>
        <h1 className="text-lg font-mono font-bold tracking-tighter">
          FES DASHBOARD <span className="text-gray-500">ACCESS</span>
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          autoComplete="current-password"
          className="w-full bg-gray-900 border border-gray-800 px-3 py-2 text-sm font-mono text-gray-100 outline-none focus:border-[#00f0ff]"
        />
        {error && (
          <div className="text-[10px] font-mono text-red-400 bg-red-400/5 border border-red-400/20 px-3 py-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full text-[11px] font-mono font-bold bg-[#00f0ff]/10 border border-[#00f0ff]/40 text-[#00f0ff] px-4 py-2 hover:bg-[#00f0ff]/20 disabled:opacity-40"
        >
          {loading ? 'VERIFYING...' : 'ENTER'}
        </button>
      </form>
    </div>
  );
}
