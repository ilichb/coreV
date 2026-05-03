'use client';

import React, { useState } from 'react';
import { Lock, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';
const ALGOD = 'https://testnet-api.algonode.cloud';
const EXPLORER = 'https://testnet.explorer.perawallet.app/tx';

interface X402GateProps {
  scorecardId: string;
  onUnlocked: (txId: string) => void;
  price?: string;
}

export default function X402Gate({ scorecardId, onUnlocked, price = "0.001 ALGO" }: X402GateProps) {
  const [txId, setTxId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'instructions' | 'verify'>('instructions');

  const expectedNote = `ATLAS_PREMIUM_SEARCH:${scorecardId}`;
  const amountAlgo = parseFloat((price.match(/([\d.]+)/) || ['', '0.001'])[1]);
  const amountMicroAlgos = Math.floor(amountAlgo * 1_000_000);

  const verifyTx = async () => {
    if (!txId.trim()) return;
    setVerifying(true);
    setError(null);
    try {
      // Consulta directa a la API pública de Algonode — sin ningún wallet SDK
      const res = await fetch(`${ALGOD}/v2/transactions/pending/${txId.trim()}`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        throw new Error('Transaction not found. Wait a moment and try again.');
      }

      const data = await res.json();
      const tx = data.transaction || data;
      const payment = tx['payment-transaction'] || tx.payment;

      // Validar destinatario
      if (TREASURY && payment?.receiver !== TREASURY) {
        throw new Error('Transaction sent to wrong address. Check the treasury address.');
      }

      // Validar monto
      if (payment?.amount < amountMicroAlgos) {
        throw new Error(`Amount too low. Expected ${amountAlgo} ALGO (${amountMicroAlgos} microALGO).`);
      }

      // Validar nota — debe contener el scorecardId
      const note = tx.note ? atob(tx.note) : '';
      if (!note.includes(scorecardId)) {
        throw new Error(`Invalid note. Must include: ${scorecardId}`);
      }

      onUnlocked(txId.trim());
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#0d1117] border border-reactor-cyan/20 rounded-[2px] min-w-[300px] shadow-[0_0_15px_rgba(0,0,0,0.5)]">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-reactor-cyan/10 rounded-[1px]">
            <Lock className="w-3 h-3 text-reactor-cyan" />
          </div>
          <span className="text-[9px] font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">
            X402_PROTOCOL_GATE
          </span>
        </div>
        <span className="text-[9px] font-bold text-reactor-cyan font-mono-display tabular-nums">
          {price}
        </span>
      </div>

      {/* Step 1: Payment Instructions */}
      {step === 'instructions' && (
        <div className="space-y-3">
          <p className="text-[10px] text-gray-400 font-mono-display leading-relaxed">
            Send exactly{' '}
            <span className="text-reactor-cyan font-bold">{price}</span>{' '}
            to the treasury on <span className="text-amber-400 font-bold">Algorand Testnet</span>:
          </p>

          {/* Treasury Address */}
          <div className="p-2 bg-black/40 border border-white/5 rounded-[1px]">
            <p className="text-[8px] text-gray-500 font-mono-display uppercase tracking-widest mb-1">
              Treasury Address
            </p>
            <p className="text-[8px] text-reactor-cyan font-mono break-all select-all">
              {TREASURY || 'TREASURY_NOT_CONFIGURED'}
            </p>
          </div>

          {/* Required Note */}
          <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-[1px]">
            <p className="text-[9px] text-amber-400 font-mono-display font-bold mb-1 uppercase tracking-widest">
              ⚠ Required Note (memo):
            </p>
            <p className="text-[8px] text-gray-300 font-mono break-all select-all">
              {expectedNote}
            </p>
          </div>

          <p className="text-[9px] text-gray-600 font-mono-display leading-relaxed">
            Use any Algorand wallet (Defly, Pera, MyAlgo, etc.) on Testnet.
            Copy the note above exactly as shown.
          </p>

          <button
            onClick={() => setStep('verify')}
            className="w-full py-2 bg-reactor-cyan/10 border border-reactor-cyan/30 text-reactor-cyan font-mono-display text-[9px] font-bold tracking-widest hover:bg-reactor-cyan/20 transition-all rounded-[1px]"
          >
            I&apos;VE SENT THE PAYMENT →
          </button>
        </div>
      )}

      {/* Step 2: TX Verification */}
      {step === 'verify' && (
        <div className="space-y-3">
          <p className="text-[10px] text-gray-400 font-mono-display">
            Paste your Transaction ID to verify:
          </p>

          <input
            type="text"
            value={txId}
            onChange={e => setTxId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifyTx()}
            placeholder="TXID..."
            className="w-full bg-black/40 border border-reactor-cyan/20 rounded-[1px] px-3 py-2 text-[9px] font-mono text-gray-100 focus:border-reactor-cyan/50 focus:outline-none focus:ring-0 placeholder:text-gray-700 transition-colors"
          />

          <div className="flex gap-2">
            <button
              onClick={() => { setStep('instructions'); setError(null); }}
              className="px-3 py-2 border border-white/10 text-gray-500 font-mono-display text-[9px] hover:border-white/20 hover:text-gray-400 transition-all rounded-[1px]"
            >
              ← BACK
            </button>
            <button
              onClick={verifyTx}
              disabled={verifying || !txId.trim()}
              className="flex-1 py-2 bg-reactor-cyan hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold font-mono-display text-[9px] tracking-widest transition-all flex items-center justify-center gap-2 rounded-[1px]"
            >
              {verifying
                ? <><Loader2 className="w-3 h-3 animate-spin" /> VERIFYING...</>
                : 'VERIFY & UNLOCK'
              }
            </button>
          </div>

          {txId.trim() && (
            <a
              href={`${EXPLORER}/${txId.trim()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[8px] text-reactor-cyan/50 hover:text-reactor-cyan font-mono-display transition-colors"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              View on Pera Explorer
            </a>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-1.5 text-red-400 text-[8px] font-mono-display uppercase tracking-tighter">
          <AlertCircle className="w-2.5 h-2.5 flex-shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
