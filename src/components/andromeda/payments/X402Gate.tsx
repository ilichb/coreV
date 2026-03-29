'use client';

import React, { useState } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import { Lock, CreditCard, ChevronRight, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { logger } from '../../../lib/utils/logger';

const peraWallet = new PeraWalletConnect();

interface X402GateProps {
  scorecardId: string;
  onUnlocked: (txId: string) => void;
  price?: string;
}

export default function X402Gate({ scorecardId, onUnlocked, price = "0.001 ALGO" }: X402GateProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = await peraWallet.connect();
      setAccountAddress(accounts[0]);
    } catch (err) {
      setError('Pera Connection Error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePayment = async () => {
    if (!accountAddress) return;
    setIsPaying(true);
    setError(null);
    try {
      const { default: algosdk } = await import('algosdk');
      
      const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
      const suggestedParams = await algodClient.getTransactionParams().do();
      
      // Determine microAlgo amount from price string or default to 1000 (0.001 ALGO)
      const amountMatch = price.match(/([\d.]+)/);
      const amountAlgo = amountMatch ? parseFloat(amountMatch[1]) : 0.001;
      const amountMicroAlgos = Math.floor(amountAlgo * 1_000_000);

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: accountAddress,
        // For testnet demo purposes, if no treasury address is defined, the user sends the micropayment to themselves.
        // The validation only cares that the transaction exists on-chain with the correct parameters and note.
        receiver: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || accountAddress,
        amount: amountMicroAlgos,
        note: new TextEncoder().encode(`ATLAS_PREMIUM_SEARCH:${scorecardId}`),
        suggestedParams,
      });

      const singleTxnGroups = [{ txn: txn, signers: [accountAddress] }];
      const signedTxn = await peraWallet.signTransaction([singleTxnGroups]);
      
      const response = await algodClient.sendRawTransaction(signedTxn[0]).do();
      const txId = (response as any).txId || (response as any).txid;
      
      logger.info(`✅ [X402] On-chain transaction sent! TX ID: ${txId}`);
      onUnlocked(txId);
    } catch (err: any) {
      logger.error(err);
      setError(err?.message || 'Payment Failure');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#0d1117] border border-reactor-cyan/20 rounded-[2px] min-w-[280px] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-reactor-cyan/10 rounded-[1px]">
            <Lock className="w-3 h-3 text-reactor-cyan" />
          </div>
          <span className="text-[9px] font-mono-display font-bold text-gray-300 tracking-[0.2em] uppercase">X402_PROTOCOL_GATE</span>
        </div>
        <span className="text-[9px] font-bold text-reactor-cyan font-mono-display tabular-nums">{price}</span>
      </div>

      {!accountAddress ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="group flex items-center justify-between px-3 py-2 bg-reactor-cyan/5 border border-reactor-cyan/30 hover:bg-reactor-cyan/10 hover:border-reactor-cyan transition-all rounded-[1px]"
        >
          <span className="text-[9px] font-mono-display font-bold text-gray-400 group-hover:text-reactor-cyan tracking-widest uppercase">
            {isConnecting ? 'LINKING...' : 'CONNECT PERA'}
          </span>
          <ChevronRight className="w-3 h-3 text-reactor-cyan/50" />
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1 bg-green-500/5 border border-green-500/10 rounded-[1px]">
             <div className="flex items-center gap-2">
              <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
              <span className="text-[8px] font-mono text-green-500/70">{accountAddress.substring(0, 6)}...</span>
             </div>
             <Zap className="w-2.5 h-2.5 text-reactor-cyan animate-pulse" />
          </div>
          <button
            onClick={handlePayment}
            disabled={isPaying}
            className="w-full py-2 bg-reactor-cyan hover:bg-cyan-400 disabled:bg-gray-700 text-black font-bold font-mono-display text-[9px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            {isPaying ? 'PROCESSING...' : `AUTHORIZE X402`}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-warning-orange text-[8px] font-mono-display uppercase tracking-tighter">
          <AlertCircle className="w-2.5 h-2.5" />
          {error}
        </div>
      )}
    </div>
  );
}
