"use client";
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shield, Zap, Globe, ArrowRight, ChevronDown, Activity, Database, Lock, Code } from 'lucide-react';

export default function LandingPage() {
  const params = useParams();
  const locale = params?.locale || 'es';
  const t = useTranslations('LandingPage');
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showHologram, setShowHologram] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stats = [
    { value: '55+', label: t('stats.milestones') },
    { value: '18', label: t('stats.builders') },
    { value: '4', label: t('stats.chains') },
    { value: '98%', label: t('stats.verification') },
  ];

  const audiences = [
    {
      icon: Globe,
      title: t('audiences.dao.title'),
      description: t('audiences.dao.desc'),
      cta: t('audiences.dao.cta'),
      href: `/${locale}/registry`,
      color: 'border-reactor-cyan/30 hover:border-reactor-cyan',
      accent: 'text-reactor-cyan',
    },
    {
      icon: Code,
      title: t('audiences.platform.title'),
      description: t('audiences.platform.desc'),
      cta: t('audiences.platform.cta'),
      href: `/${locale}/pricing`,
      color: 'border-green-500/30 hover:border-green-500',
      accent: 'text-green-400',
      highlight: true,
    },
    {
      icon: Activity,
      title: t('audiences.builder.title'),
      description: t('audiences.builder.desc'),
      cta: t('audiences.builder.cta'),
      href: `/${locale}/coordination`,
      color: 'border-purple-500/30 hover:border-purple-500',
      accent: 'text-purple-400',
    },
  ];

  const steps = [
    {
      num: '01',
      title: t('steps.ingest.title'),
      description: t('steps.ingest.desc'),
      icon: Database,
    },
    {
      num: '02',
      title: t('steps.verify.title'),
      description: t('steps.verify.desc'),
      icon: Shield,
    },
    {
      num: '03',
      title: t('steps.anchor.title'),
      description: t('steps.anchor.desc'),
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
    <>
      {/* Modal Holograma */}
      {showHologram && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={() => setShowHologram(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-reactor-cyan/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/40 via-blue-500/30 to-purple-500/40 rounded-full blur-2xl"></div>
            <img src="/logo-andromeda.png" alt="Andromeda Core Hologram" className="relative w-80 h-80 md:w-96 md:h-96 object-contain rounded-full border-2 border-reactor-cyan shadow-[0_0_60px_rgba(0,240,255,0.8)] animate-[pulse_2s_ease-in-out_infinite]" style={{ filter: "drop-shadow(0 0 20px cyan)" }} />
            <div className="absolute -inset-4 border border-reactor-cyan/30 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none"></div>
            <div className="absolute -inset-8 border border-reactor-cyan/20 rounded-full animate-[spin_15s_linear_infinite_reverse] pointer-events-none"></div>
            <p className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-reactor-cyan font-mono text-xs tracking-[0.5em] uppercase animate-pulse whitespace-nowrap">HOLOGRAM ACTIVE</p>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#050608] text-gray-100 overflow-x-hidden">
        {/* NAV */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050608]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowHologram(true)} className="cursor-pointer focus:outline-none">
                <div className="relative group">
                  <div className="absolute inset-0 bg-reactor-cyan/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 via-blue-500/20 to-purple-500/30 rounded-full blur-md group-hover:blur-lg transition-all duration-300"></div>
                  <img src="/logo-andromeda.png" alt="Andromeda Core" className="relative w-12 h-12 object-contain rounded-full border border-reactor-cyan/40 shadow-[0_0_20px_rgba(0,240,255,0.4)] group-hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] transition-all duration-300 bg-black/80" style={{ filter: "drop-shadow(0 0 8px rgba(0,212,255,0.6))" }} />
                </div>
              </button>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {[
                [t('nav.docs'), `/${locale}/docs`],
                [t('nav.pricing'), `/${locale}/pricing`],
                [t('nav.registry'), `/${locale}/registry`]
              ].map(([label, href]) => (
                <Link key={label} href={href} className="text-[11px] font-mono text-gray-500 hover:text-reactor-cyan transition-colors tracking-widest uppercase">
                  {label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <Link href={`/${locale}/intelligence`} className="flex items-center gap-2 px-4 py-2 bg-reactor-cyan text-[11px] font-mono font-bold uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-colors" style={{ color: '#ffffff' }}>
                {t('nav.launch')} <ArrowRight className="w-3 h-3" />
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
            </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan shadow-[0_0_8px_rgba(0,212,255,0.6)] animate-pulse" />
              <span className="text-[10px] text-mono font-bold text-reactor-cyan bg-reactor-cyan/10 border border-reactor-cyan/20 px-3 py-1 rounded-[1px] tracking-[0.3em] uppercase">{t("hero.tagline")}</span>
            </div>
            <h1 className="text-5xl md:text-7xl title-orbitron font-bold leading-[1.2] mb-4 drop-shadow-[0_0_15px_rgba(0,212,255,0.15)] text-white">
              <span className="text-white">{t("hero.title1")}</span><br />
              <span className="text-reactor-cyan">{t("hero.title2")}</span><br />
              <span className="text-gray-500">{t("hero.title3")}</span>
            </h1>
          </div>
              <span className="text-white">{t('hero.title1')}</span><br />
              <span className="text-reactor-cyan">{t('hero.title2')}</span><br />
              <span className="text-gray-500">{t('hero.title3')}</span>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href={`/${locale}/intelligence`} className="flex items-center gap-2 px-8 py-3.5 bg-reactor-cyan font-mono font-bold text-sm uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-all hover:shadow-[0_0_30px_rgba(0,240,255,0.3)]" style={{ color: '#ffffff' }}>
                {t('hero.cta1')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={`/${locale}/docs`} className="flex items-center gap-2 px-8 py-3.5 border border-white/10 text-gray-300 font-mono text-sm uppercase tracking-widest rounded-[2px] hover:border-reactor-cyan/40 hover:text-reactor-cyan transition-all">
                {t('hero.cta2')}
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
              <div className="text-[10px] font-mono text-reactor-cyan uppercase tracking-[0.4em] mb-4">{t('how.tagline')}</div>
              <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan shadow-[0_0_8px_rgba(0,212,255,0.6)] animate-pulse"></div>
        <h2 className="text-3xl md:text-4xl title-orbitron font-bold drop-shadow-[0_0_15px_rgba(0,212,255,0.1)] text-white">{t('how.heading1')}<br /><span className="text-reactor-cyan">{t('how.heading2')}</span></h2>
      </div>
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
              <div className="text-[10px] font-mono text-reactor-cyan uppercase tracking-[0.4em] mb-4">{t('audiences.tagline')}</div>
              <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan shadow-[0_0_8px_rgba(0,212,255,0.6)] animate-pulse"></div>
        <h2 className="text-3xl md:text-4xl title-orbitron font-bold drop-shadow-[0_0_15px_rgba(0,212,255,0.1)] text-white">{t('audiences.heading1')}<br /><span className="text-reactor-cyan">{t('audiences.heading2')}</span></h2>
      </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {audiences.map((a) => (
                <div key={a.title} className={`relative p-8 border rounded-[2px] transition-all duration-300 group ${a.color} ${a.highlight ? 'bg-reactor-cyan/5' : 'bg-white/[0.02]'}`}>
                  {a.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-reactor-cyan text-[9px] font-mono font-bold uppercase tracking-widest rounded-[1px]" style={{ color: '#ffffff' }}>
                      {t('audiences.popular')}
                    </div>
                  )}
                  <a.icon className={`w-7 h-7 mb-4 ${a.accent}`} />
                  <h3 className="text-base font-mono font-bold text-white mb-3">{a.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-6">{a.description}</p>
                  <Link href={a.href} className={`flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest ${a.accent} hover:gap-3 transition-all`}>
                    {a.cta} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API PREVIEW */}
        <section className="py-32 px-6 bg-white/[0.01] border-y border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="text-[10px] font-mono text-reactor-cyan uppercase tracking-[0.4em] mb-4">{t('api.tagline')}</div>
                <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan shadow-[0_0_8px_rgba(0,212,255,0.6)] animate-pulse"></div>
        <h2 className="text-3xl title-orbitron font-bold drop-shadow-[0_0_15px_rgba(0,212,255,0.1)] text-white mb-4">{t('api.heading1')}<br /><span className="text-reactor-cyan">{t('api.heading2')}</span></h2>
      </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{t('api.desc')}</p>
                <div className="flex gap-3">
                  <Link href={`/${locale}/docs`} className="px-4 py-2 bg-reactor-cyan text-[11px] font-mono font-bold uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-colors" style={{ color: '#ffffff' }}>
                    {t('api.cta1')}
                  </Link>
                  <Link href={`/${locale}/pricing`} className="px-4 py-2 border border-white/10 text-gray-400 text-[11px] font-mono uppercase tracking-widest rounded-[2px] hover:border-reactor-cyan/30 transition-colors">
                    {t('api.cta2')}
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
  "https://core.andromedacomputer.net/
   api/reputation/verify/{did}" \\
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
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-reactor-cyan/3 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-reactor-cyan/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative max-w-2xl mx-auto text-center">
            <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-1.5 rounded-full bg-reactor-cyan shadow-[0_0_8px_rgba(0,212,255,0.6)] animate-pulse"></div>
        <h2 className="text-4xl md:text-5xl title-orbitron font-bold drop-shadow-[0_0_15px_rgba(0,212,255,0.1)] text-white mb-4">
              {t('cta.heading1')}<br /><span className="text-reactor-cyan">{t('cta.heading2')}</span>
            </h2>
      </div>
            <p className="text-gray-500 text-lg mb-10">{t('cta.subtitle')}</p>
            <Link href={`/${locale}/intelligence`} className="inline-flex items-center gap-3 px-10 py-4 bg-reactor-cyan font-mono font-bold text-sm uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-all hover:shadow-[0_0_40px_rgba(0,240,255,0.3)]" style={{ color: '#ffffff' }}>
              {t('cta.button')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/5 py-12 px-6">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border border-reactor-cyan/50 rounded-[2px] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-reactor-cyan rounded-full" />
              </div>
              <span className="font-mono text-sm text-gray-500">ANDROMEDA<span className="text-reactor-cyan">CORE</span></span>
            </div>
            <div className="flex items-center gap-8">
              {[
                [t('nav.docs'), `/${locale}/docs`],
                [t('nav.pricing'), `/${locale}/pricing`],
                [t('nav.registry'), `/${locale}/registry`],
                [t('nav.launch'), `/${locale}/intelligence`]
              ].map(([label, href]) => (
                <Link key={label} href={href} className="text-[11px] font-mono text-gray-600 hover:text-reactor-cyan transition-colors uppercase tracking-widest">
                  {label}
                </Link>
              ))}
            </div>
            <span className="text-[10px] font-mono text-gray-700 tracking-widest">© 2026 ANDROMEDA_COMPUTER</span>
          </div>
        </footer>

        <style>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    </>
  );
}
