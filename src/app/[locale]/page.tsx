"use client";
import { useEffect, useState, useRef } from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Shield, Globe, ArrowRight, ChevronDown, Activity, Database, Lock, Code, BarChart3, Users, Server } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Image from 'next/image';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('LandingPage');

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stats = [
    { value: '55+', label: t('Stats.milestones') },
    { value: '18', label: t('Stats.builders') },
    { value: '4', label: t('Stats.chains') },
    { value: '98%', label: t('Stats.verification') },
  ];

  const audiences = [
    {
      icon: Globe,
      title: t('Audiences.aud1.title'),
      description: t('Audiences.aud1.desc'),
      cta: t('Audiences.aud1.cta'),
      href: '/registry',
      color: 'border-reactor-cyan/30 hover:border-reactor-cyan',
      accent: 'text-reactor-cyan',
    },
    {
      icon: Code,
      title: t('Audiences.aud2.title'),
      description: t('Audiences.aud2.desc'),
      cta: t('Audiences.aud2.cta'),
      href: '/pricing',
      color: 'border-green-500/30 hover:border-green-500',
      accent: 'text-green-400',
      highlight: true,
    },
    {
      icon: Activity,
      title: t('Audiences.aud3.title'),
      description: t('Audiences.aud3.desc'),
      cta: t('Audiences.aud3.cta'),
      href: '/coordination',
      color: 'border-purple-500/30 hover:border-purple-500',
      accent: 'text-purple-400',
    },
  ];

  const steps = [
    {
      num: '01',
      title: t('HowItWorks.step1.title'),
      description: t('HowItWorks.step1.desc'),
      icon: Database,
    },
    {
      num: '02',
      title: t('HowItWorks.step2.title'),
      description: t('HowItWorks.step2.desc'),
      icon: Shield,
    },
    {
      num: '03',
      title: t('HowItWorks.step3.title'),
      description: t('HowItWorks.step3.desc'),
      icon: Lock,
    },
  ];

  const chains = ['Rootstock', 'Arbitrum', 'Optimism', 'Algorand', 'Vara', 'Snapshot', 'Polkadot', 'Ethereum'];

  if (!mounted) return (
    <div className="min-h-screen bg-[#050608] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-reactor-cyan/30 border-t-reactor-cyan rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050608] text-gray-100 overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050608]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/images/logo.jpg" 
              alt="Andromeda Core Logo" 
              width={28} 
              height={28} 
              className="rounded-[2px]"
            />
            <span className="font-mono font-bold text-sm tracking-widest text-white">Andromeda<span className="text-reactor-cyan"> Core</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/docs" className="text-[11px] font-mono text-gray-500 hover:text-reactor-cyan transition-colors tracking-widest uppercase">
              {t('Nav.docs')}
            </Link>
            <Link href="/pricing" className="text-[11px] font-mono text-gray-500 hover:text-reactor-cyan transition-colors tracking-widest uppercase">
              {t('Nav.pricing')}
            </Link>
            <Link href="/registry" className="text-[11px] font-mono text-gray-500 hover:text-reactor-cyan transition-colors tracking-widest uppercase">
              {t('Nav.registry')}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/intelligence" className="flex items-center gap-2 px-4 py-2 bg-reactor-cyan text-white text-[11px] font-mono font-bold uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-colors">
              {t('Nav.launchApp')} <ArrowRight className="w-3 h-3" />
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage: 'linear-gradient(rgba(0,240,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-reactor-cyan/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-reactor-cyan/20 bg-reactor-cyan/5 rounded-[2px] text-[10px] font-mono text-reactor-cyan uppercase tracking-[0.3em] mb-8">
            <span className="w-1.5 h-1.5 bg-reactor-cyan rounded-full animate-pulse" />
            {t('Hero.tagline')}
          </div>

          <h1 className="text-5xl md:text-7xl font-mono font-bold leading-[1.05] mb-6 tracking-tighter">
            <span className="text-white">{t('Hero.title1')}</span>
            <br />
            <span className="text-reactor-cyan">{t('Hero.title2')}</span>
            <br />
            <span className="text-gray-500">{t('Hero.title3')}</span>
          </h1>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            {t('Hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/intelligence" className="flex items-center gap-2 px-8 py-3.5 bg-reactor-cyan text-white font-mono font-bold text-sm uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-all hover:shadow-[0_0_30px_rgba(0,240,255,0.3)]">
              {t('Hero.liveDemo')} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/docs" className="flex items-center gap-2 px-8 py-3.5 border border-white/10 text-gray-300 font-mono text-sm uppercase tracking-widest rounded-[2px] hover:border-reactor-cyan/40 hover:text-reactor-cyan transition-all">
              {t('Hero.apiReference')}
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(({ value, label }) => (
              <div key={label} className="p-4 border border-white/5 bg-white/2 rounded-[2px]">
                <div className="text-2xl font-mono font-bold text-reactor-cyan mb-1">{value}</div>
                <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-5 h-5 text-gray-700" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-32 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] font-mono text-reactor-cyan uppercase tracking-[0.4em] mb-4">{t('HowItWorks.tagline')}</div>
            <h2 className="text-3xl md:text-4xl font-mono font-bold text-white">{t('HowItWorks.title1')}<br /><span className="text-reactor-cyan">{t('HowItWorks.title2')}</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative p-8 border border-white/5 bg-white/[0.02] rounded-[2px] group hover:border-reactor-cyan/20 transition-all">
                <div className="text-[10px] font-mono text-reactor-cyan/30 mb-6 tracking-[0.3em]">{step.num}</div>
                <step.icon className="w-8 h-8 text-reactor-cyan mb-4 group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] transition-all" />
                <h3 className="text-lg font-mono font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                {i < 2 && <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-[1px] bg-reactor-cyan/20" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHAIN TICKER */}
      <div className="border-y border-white/5 py-4 overflow-hidden bg-white/[0.01]">
        <div className="flex gap-12 animate-[scroll_20s_linear_infinite]" style={{width: 'max-content'}}>
          {[...chains, ...chains].map((chain, i) => (
            <span key={i} className="text-[11px] font-mono text-gray-700 uppercase tracking-[0.3em] whitespace-nowrap flex items-center gap-3">
              <span className="w-1 h-1 bg-reactor-cyan/40 rounded-full" />
              {chain}
            </span>
          ))}
        </div>
      </div>

      {/* AUDIENCES */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] font-mono text-reactor-cyan uppercase tracking-[0.4em] mb-4">{t('Audiences.tagline')}</div>
            <h2 className="text-3xl md:text-4xl font-mono font-bold text-white">{t('Audiences.title1')}<br /><span className="text-reactor-cyan">{t('Audiences.title2')}</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {audiences.map((a) => (
              <div key={a.title} className={`relative p-8 border rounded-[2px] transition-all duration-300 group ${a.color} ${a.highlight ? 'bg-reactor-cyan/5' : 'bg-white/[0.02]'}`}>
                {a.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-reactor-cyan text-white text-[9px] font-mono font-bold uppercase tracking-widest rounded-[1px]">
                    {t('Audiences.mostPopular')}
                  </div>
                )}
                <a.icon className={`w-7 h-7 mb-4 ${a.accent}`} />
                <h3 className="text-base font-mono font-bold text-white mb-3">{a.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">{a.description}</p>
                <Link href={a.href as any} className={`flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest ${a.accent} hover:gap-3 transition-all`}>
                  {a.cta} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API PREVIEW & BUSINESS MODEL */}
      <section className="py-32 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[10px] font-mono text-reactor-cyan uppercase tracking-[0.4em] mb-4">{t('ApiPreview.tagline')}</div>
              <h2 className="text-3xl font-mono font-bold text-white mb-4">{t('ApiPreview.title1')}<br /><span className="text-reactor-cyan">{t('ApiPreview.title2')}</span></h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {t('ApiPreview.desc')}
              </p>
              <div className="flex gap-3">
                <Link href="/docs" className="px-4 py-2 bg-reactor-cyan text-white text-[11px] font-mono font-bold uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-colors">
                  {t('ApiPreview.viewDocs')}
                </Link>
                <Link href="/pricing" className="px-4 py-2 border border-white/10 text-gray-400 text-[11px] font-mono uppercase tracking-widest rounded-[2px] hover:border-reactor-cyan/30 transition-colors">
                  {t('ApiPreview.pricing')}
                </Link>
              </div>
            </div>
            <div className="bg-black border border-white/5 rounded-[2px] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
                <span className="text-[10px] font-mono text-gray-600 ml-2">bash</span>
              </div>
              <pre className="p-6 text-[11px] font-mono text-gray-400 leading-relaxed overflow-x-auto">{`curl -X GET \\
  "https://core.andromedacomputer.net/api/reputation/verify/{did}" \\
  -H "x-api-key: ac_your_key"

# Response
{
  "avipScore": 78,
  "trustLevel": "GOLD",
  "verificationRate": 100,
  "ecosystems": ["optimism"],
  "poweredBy": "AVIP v2.0"
}`}</pre>
            </div>
          </div>

          {/* Business model highlight (hardcoded English - you can add these keys to your JSON files later) */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 border border-white/5 bg-white/[0.02] rounded-[2px]">
              <Server className="w-6 h-6 text-reactor-cyan mx-auto mb-3" />
              <h3 className="text-sm font-mono font-bold text-white mb-2">Freemium API</h3>
              <p className="text-xs text-gray-500">1k free queries/month. Pay-as-you-grow for enterprises.</p>
            </div>
            <div className="p-6 border border-white/5 bg-white/[0.02] rounded-[2px]">
              <BarChart3 className="w-6 h-6 text-reactor-cyan mx-auto mb-3" />
              <h3 className="text-sm font-mono font-bold text-white mb-2">Value-added services</h3>
              <p className="text-xs text-gray-500">Custom analytics, alerts, advanced verification.</p>
            </div>
            <div className="p-6 border border-white/5 bg-white/[0.02] rounded-[2px]">
              <Users className="w-6 h-6 text-reactor-cyan mx-auto mb-3" />
              <h3 className="text-sm font-mono font-bold text-white mb-2">No token, no speculation</h3>
              <p className="text-xs text-gray-500">Public good infrastructure. Funded by usage, grants, and sustainability trust.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-reactor-cyan/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-reactor-cyan/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-white mb-4">
            {t('FinalCTA.title1')}<br /><span className="text-reactor-cyan">{t('FinalCTA.title2')}</span>
          </h2>
          <p className="text-gray-500 text-lg mb-10">
            {t('FinalCTA.desc')}
          </p>
          <Link href="/intelligence" className="inline-flex items-center gap-3 px-10 py-4 bg-reactor-cyan text-white font-mono font-bold text-sm uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-all hover:shadow-[0_0_40px_rgba(0,240,255,0.3)]">
            {t('FinalCTA.launchApp')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image 
              src="/images/logo.jpg" 
              alt="Andromeda Core Logo" 
              width={20} 
              height={20} 
              className="rounded-[2px]"
            />
            <span className="font-mono text-sm text-gray-500">Andromeda<span className="text-reactor-cyan"> Core</span></span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/docs" className="text-[11px] font-mono text-gray-600 hover:text-reactor-cyan transition-colors uppercase tracking-widest">
              {t('Nav.docs')}
            </Link>
            <Link href="/pricing" className="text-[11px] font-mono text-gray-600 hover:text-reactor-cyan transition-colors uppercase tracking-widest">
              {t('Nav.pricing')}
            </Link>
            <Link href="/registry" className="text-[11px] font-mono text-gray-600 hover:text-reactor-cyan transition-colors uppercase tracking-widest">
              {t('Nav.registry')}
            </Link>
            <Link href="/intelligence" className="text-[11px] font-mono text-gray-600 hover:text-reactor-cyan transition-colors uppercase tracking-widest">
              {t('Footer.app')}
            </Link>
          </div>
          <span className="text-[10px] font-mono text-gray-700 tracking-widest">{t('Footer.copyright')}</span>
        </div>
      </footer>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
      `}</style>
    </div>
  );
}
