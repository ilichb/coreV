'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import DashboardUnified from '@/components/layout/DashboardUnified';
import { Shield, Zap, Check, ExternalLink, Wallet, CreditCard, Bitcoin } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'FREE',
    price: '$0',
    period: '/month',
    requests: '1,000 req/month',
    color: 'border-gray-700',
    accent: 'text-gray-400',
    accentBg: 'bg-gray-500/10',
    features: [
      'Basic reputation verification',
      '/api/reputation/verify',
      '/api/intelligence/telemetry',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '$49',
    period: '/month',
    requests: '10,000 req/month',
    color: 'border-reactor-cyan/50',
    accent: 'text-reactor-cyan',
    accentBg: 'bg-reactor-cyan/10',
    highlight: true,
    features: [
      'Full AVIP score breakdown',
      '/api/reputation/score',
      'Activity timeline',
      'Ecosystem breakdown',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE',
    price: 'Custom',
    period: '',
    requests: 'Unlimited',
    color: 'border-yellow-500/40',
    accent: 'text-yellow-400',
    accentBg: 'bg-yellow-500/10',
    features: [
      'Unlimited requests',
      'All endpoints',
      'Dedicated API key',
      'SLA guarantee',
      'Custom integrations',
      'White-label option',
    ],
  },
];

const PAYMENT_METHODS = [
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'PayPal balance, credit or debit card',
    icon: CreditCard,
    color: 'border-blue-500/30 hover:border-blue-500/60',
    accent: 'text-blue-400',
    available: true,
    handler: 'paypal',
  },
  {
    id: 'algorand',
    name: 'Algorand (ALGO)',
    description: 'Pay with ALGO via Pera Wallet — instant finality',
    icon: Zap,
    color: 'border-reactor-cyan/30 hover:border-reactor-cyan/60',
    accent: 'text-reactor-cyan',
    available: true,
    handler: 'algorand',
  },
  {
    id: 'crypto',
    name: 'BTC / USDC / USDT',
    description: 'Coming soon via Coinbase Commerce',
    icon: Bitcoin,
    color: 'border-orange-500/20',
    accent: 'text-orange-400/50',
    available: false,
    handler: 'coinbase',
  },
];

export default function PricingPage() {
  const t = useTranslations('PricingPage');
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [selectedPayment, setSelectedPayment] = useState('paypal');
  const [algoStatus, setAlgoStatus] = useState<'idle' | 'connecting' | 'paying' | 'done' | 'error'>('idle');
  const [algoTx, setAlgoTx] = useState<string | null>(null);
  const [algoError, setAlgoError] = useState<string | null>(null);

  const plan = PLANS.find(p => p.id === selectedPlan)!;

  const handlePayPal = () => {
    window.open('https://www.paypal.com/ncp/payment/946FHUYURME54', '_blank');
  };

  const handleAlgorand = async () => {
    setAlgoStatus('connecting');
    setAlgoError(null);
    try {
      const { PeraWalletConnect } = await import('@perawallet/connect');
      const algosdk = (await import('algosdk')).default;
      const pera = new PeraWalletConnect();
      const accounts = await pera.connect();
      setAlgoStatus('paying');

      const algodClient = new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', '');
      const params = await algodClient.getTransactionParams().do();

      // Pro = $49 ≈ 200 ALGO (ajustar según precio ALGO)
      const amountMicroAlgos = selectedPlan === 'pro' ? 200_000_000 : 1_000_000;

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: accounts[0],
        receiver: '6DTZ56A2IPXLF6OTHFE3OHHMAJTOI3UKKR75ZJKODDXETKVT3Y7AD2EHMA',
        amount: amountMicroAlgos,
        note: new TextEncoder().encode(`ANDROMEDA_API_${selectedPlan.toUpperCase()}`),
        suggestedParams: params,
      });

      const signed = await pera.signTransaction([[{ txn, signers: [accounts[0]] }]]);
      const response = await algodClient.sendRawTransaction(signed[0]).do();
      const txId = (response as any).txId || (response as any).txid;

      setAlgoTx(txId);
      setAlgoStatus('done');
    } catch (err: any) {
      setAlgoError(err.message || 'Transaction failed');
      setAlgoStatus('error');
    }
  };

  const handleCheckout = () => {
    if (selectedPayment === 'paypal') handlePayPal();
    else if (selectedPayment === 'algorand') handleAlgorand();
  };

  return (
    <DashboardUnified>
      <div className="max-w-[1200px] mx-auto space-y-12 pb-20">

        {/* Header */}
        <header className="border-b border-[#1e2430] pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-reactor-cyan/10 border border-reactor-cyan/20 rounded-[1px] text-[10px] font-mono text-reactor-cyan uppercase tracking-widest mb-4">
            <Shield className="w-3 h-3" />
            ANDROMEDA CORE API ACCESS
          </div>
          <h1 className="title-orbitron text-4xl font-bold mb-3">
            {t('title')}
          </h1>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </header>

        {/* Plan Selector */}
        <section>
          <h2 className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-4">{t('selectPlan')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(p => (
              <button
                key={p.id}
                onClick={() => p.id !== 'enterprise' && setSelectedPlan(p.id)}
                className={`relative p-6 border rounded-[2px] text-left transition-all ${p.color} ${
                  selectedPlan === p.id ? p.accentBg : 'bg-black/30 hover:bg-black/50'
                } ${p.id === 'enterprise' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-reactor-cyan text-black text-[9px] font-mono font-bold uppercase rounded-[1px]">
                    {t('recommended')}
                  </div>
                )}
                {selectedPlan === p.id && (
                  <div className="absolute top-3 right-3 w-4 h-4 bg-reactor-cyan rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
                <div className={`text-[10px] font-mono font-bold mb-2 ${p.accent}`}>{p.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold font-mono text-white">{p.price}</span>
                  <span className="text-gray-600 text-xs font-mono">{p.period}</span>
                </div>
                <div className={`text-[9px] font-mono mb-4 ${p.accent}`}>{p.requests}</div>
                <div className="space-y-1.5">
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className={`w-3 h-3 ${p.accent}`} />
                      <span className="text-[10px] text-gray-400 font-mono">{f}</span>
                    </div>
                  ))}
                </div>
                {p.id === 'enterprise' && (
                  <a
                    href="mailto:api@andromeda.computer"
                    className="mt-4 block text-center py-2 border border-yellow-500/30 text-yellow-400 text-[9px] font-mono uppercase tracking-widest rounded-[1px] hover:bg-yellow-500/10 transition-colors"
                  >
                    {t('contactUs')}
                  </a>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Payment Method */}
        {selectedPlan !== 'free' && selectedPlan !== 'enterprise' && (
          <section>
            <h2 className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-4">{t('paymentMethod')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => pm.available && setSelectedPayment(pm.id)}
                  disabled={!pm.available}
                  className={`p-4 border rounded-[2px] text-left transition-all ${pm.color} ${
                    selectedPayment === pm.id ? 'bg-white/5' : 'bg-black/20'
                  } ${!pm.available ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <pm.icon className={`w-4 h-4 ${pm.accent}`} />
                    <span className={`text-[11px] font-mono font-bold ${pm.accent}`}>{pm.name}</span>
                    {selectedPayment === pm.id && pm.available && (
                      <Check className="w-3 h-3 text-reactor-cyan ml-auto" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">{pm.description}</p>
                </button>
              ))}
            </div>

            {/* Checkout */}
            <div className="p-6 bg-black/40 border border-[#1e2430] rounded-[2px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase">{t('orderSummary')}</p>
                  <p className="text-sm font-mono text-white mt-1">
                    Andromeda Core API — <span className="text-reactor-cyan">{plan.name}</span>
                  </p>
                  <p className="text-[10px] font-mono text-gray-500">{plan.requests}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono text-reactor-cyan">{plan.price}</p>
                  <p className="text-[10px] font-mono text-gray-600">{plan.period}</p>
                </div>
              </div>

              {algoStatus === 'done' && algoTx && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-[1px]">
                  <p className="text-[10px] font-mono text-green-400 uppercase font-bold mb-1">✅ Payment confirmed on Algorand</p>
                  <p className="text-[9px] font-mono text-gray-500 break-all">TX: {algoTx}</p>
                  <p className="text-[9px] font-mono text-gray-600 mt-1">Contact api@andromeda.computer with your TX ID to activate your key.</p>
                </div>
              )}

              {algoStatus === 'error' && algoError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-[1px]">
                  <p className="text-[10px] font-mono text-red-400">{algoError}</p>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={algoStatus === 'connecting' || algoStatus === 'paying' || algoStatus === 'done'}
                className="w-full py-3 bg-reactor-cyan hover:bg-cyan-400 disabled:bg-gray-700 text-black font-mono font-bold text-[11px] uppercase tracking-widest rounded-[1px] transition-colors flex items-center justify-center gap-2"
              >
                {algoStatus === 'connecting' && t('connectingWallet')}
                {algoStatus === 'paying' && t('processingPayment')}
                {algoStatus === 'done' && '✅ Payment complete'}
                {(algoStatus === 'idle' || algoStatus === 'error') && (
                  <>
                    {selectedPayment === 'paypal' ? (
                      <><ExternalLink className="w-4 h-4" /> {t('payWithPaypal')}</>
                    ) : (
                      <><Wallet className="w-4 h-4" /> {t('payWithAlgorand')}</>
                    )}
                  </>
                )}
              </button>

              <p className="text-[9px] font-mono text-gray-700 text-center mt-3">
                {t('afterPayment')}
              </p>
            </div>
          </section>
        )}

        {selectedPlan === 'free' && (
          <div className="p-6 border border-[#1e2430] bg-black/20 rounded-[2px] text-center">
            <p className="text-gray-400 text-sm mb-4">{t('freeTitle')}</p>
            <a
              href="mailto:api@andromeda.computer?subject=Free API Key Request"
              className="inline-flex items-center gap-2 px-6 py-2 border border-reactor-cyan/30 text-reactor-cyan text-[10px] font-mono font-bold uppercase tracking-widest rounded-[1px] hover:bg-reactor-cyan/10 transition-colors"
            >
              {t('requestFreeKey')}
            </a>
          </div>
        )}
      </div>
    </DashboardUnified>
  );
}
