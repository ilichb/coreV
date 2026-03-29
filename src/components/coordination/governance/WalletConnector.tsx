'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import useAndromedaWallet from '@/hooks/useAndromedaWallet';
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Wallet,
  Cpu,
  ChevronRight,
  Zap,
  Activity,
  Fingerprint
} from 'lucide-react';

export default function WalletConnector() {
  const wallet = useAndromedaWallet();

  return (
    <div className="min-w-[320px]">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated');

          if (!ready) return null;

          if (!connected) {
            return (
              <button
                onClick={openConnectModal}
                type="button"
                className="w-full group relative flex items-center justify-between px-6 py-4 bg-black/40 border border-reactor-cyan/30 rounded-[2px] transition-all duration-300 hover:bg-reactor-cyan/10 hover:border-reactor-cyan hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-reactor-cyan/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-reactor-cyan/5 border border-reactor-cyan/20">
                    <Wallet className="w-5 h-5 text-reactor-cyan group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] font-mono-display font-bold text-gray-200 tracking-[0.2em] uppercase block">
                      INITIALIZE_AUTH
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono-display uppercase tracking-widest block mt-0.5">
                      // SECURE_WALLET_BRIDGE_V1
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-reactor-cyan/40" />
              </button>
            );
          }

          if (chain.unsupported) {
            return (
              <button
                onClick={openChainModal}
                type="button"
                className="w-full flex items-center gap-4 px-6 py-4 bg-red-500/5 border border-red-500/30 rounded-[2px] text-red-500 hover:bg-red-500/10 transition-all"
              >
                <ShieldAlert className="w-5 h-5" />
                <div className="text-left">
                  <span className="text-[11px] font-mono-display font-bold uppercase tracking-widest block">NETWORK_ERROR</span>
                  <span className="text-[9px] font-mono-display uppercase tracking-tighter block mt-0.5 text-red-500/60">INVALID_CHAIN_CONNECTED</span>
                </div>
              </button>
            );
          }

          return (
            <div className="bg-black/40 border border-reactor-cyan/20 rounded-[2px] overflow-hidden backdrop-blur-md group hover:border-reactor-cyan/40 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              {/* Card Header: Network Status */}
              <div className="bg-white/[0.02] border-b border-white/5 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[8px] font-mono-display font-bold text-green-500/70 tracking-widest uppercase">CONNECTION_STABLE</span>
                </div>
                <button
                  onClick={openChainModal}
                  className="flex items-center gap-2 px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[1px] transition-all"
                >
                  {chain.iconUrl && (
                    <img alt={chain.name} src={chain.iconUrl} className="w-2.5 h-2.5 rounded-full" />
                  )}
                  <span className="text-[8px] font-mono-display font-medium text-gray-500 uppercase">{chain.name}</span>
                </button>
              </div>

              {/* Main Identity Area */}
              <button
                onClick={openAccountModal}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.01] transition-all"
              >
                <div className="relative">
                  <div className="p-3 bg-reactor-cyan/10 border border-reactor-cyan/20 rounded-[2px]">
                    {wallet.isLoading ? (
                      <Loader2 className="w-5 h-5 text-reactor-cyan animate-spin" />
                    ) : wallet.did ? (
                      <Fingerprint className="w-5 h-5 text-reactor-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)]" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-black border border-reactor-cyan/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-gray-500 font-mono-display uppercase tracking-widest">Operator_Identity</span>
                    <span className="text-[8px] px-1.5 py-0.5 bg-reactor-cyan/10 border border-reactor-cyan/20 text-reactor-cyan font-mono-display rounded-[1px]">
                      {account.displayBalance}
                    </span>
                  </div>
                  <p className="text-[13px] font-mono-display font-bold text-gray-100 tracking-wider">
                    {account.displayName}
                  </p>
                </div>
              </button>

              {/* DID Information Bar */}
              {wallet.did && (
                <div className="px-4 py-2 bg-black/40 border-t border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-gray-600 font-mono-display uppercase tracking-[0.2em]">CANONICAL_DID</span>
                    <Activity className="w-2 h-2 text-reactor-cyan/40" />
                  </div>
                  <div className="bg-black/60 border border-white/5 p-2 rounded-[1px] group/did relative overflow-hidden">
                    <p className="text-[9px] font-mono text-reactor-cyan/70 break-all leading-tight">
                      {wallet.did.did}
                    </p>
                    <div className="absolute inset-0 bg-reactor-cyan/5 opacity-0 group-hover/did:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}

              {/* Footer: System Status */}
              <div className="px-4 py-1.5 bg-reactor-cyan/5 flex items-center justify-between border-t border-reactor-cyan/10">
                <span className="text-[7px] font-mono-display text-reactor-cyan font-bold tracking-[0.2em] uppercase">ACCESS_LEVEL: AUTHORIZED</span>
                <span className="text-[7px] font-mono text-reactor-cyan/40 tabular-nums">TX_COUNT: 0x24</span>
              </div>
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
