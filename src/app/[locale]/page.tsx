"use client";
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shield, Zap, Globe, ArrowRight, ChevronDown, Activity, Database, Lock, Code } from 'lucide-react';

export default function LandingPage() {
  const params = useParams();
  const locale = params?.locale || 'es';
  const t = useTranslations('LandingPage');
  const [mounted, setMounted] = useState(false);
  const [showHologram, setShowHologram] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    { num: '01', title: t('steps.ingest.title'), description: t('steps.ingest.desc'), icon: Database },
    { num: '02', title: t('steps.verify.title'), description: t('steps.verify.desc'), icon: Shield },
    { num: '03', title: t('steps.anchor.title'), description: t('steps.anchor.desc'), icon: Lock },
  ];

  if (!mounted) return (
    <div className="min-h-screen bg-[#050608] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-reactor-cyan/30 border-t-reactor-cyan rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050608] text-gray-100 overflow-x-hidden selection:bg-reactor-cyan/30">
      
      {/* MODAL HOLOGRAMA - EFECTO SCI-FI AVANZADO */}
      {showHologram && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]" 
          onClick={() => setShowHologram(false)}
        >
          <div className="relative p-10" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-reactor-cyan/10 rounded-full blur-[120px] animate-pulse"></div>
            
            {/* Contenedor del Logo con Glitch y Scanlines */}
            <div className="relative animate-[hologramAppear_0.5s_ease-out_forwards]">
              <img 
                src="/images/logo.jpg" 
                alt="Hologram" 
                className="w-80 h-80 object-contain mix-blend-screen opacity-90 shadow-[0_0_50px_rgba(0,240,255,0.3)]" 
              />
              {/* Scanlines Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,transparent_50%,rgba(0,0,0,0.5)_50%,rgba(0,0,0,0.5))] bg-[length:100%_4px] opacity-30 pointer-events-none"></div>
              {/* Flicker Overlay */}
              <div className="absolute inset-0 bg-reactor-cyan/5 animate-[flicker_2s_infinite] pointer-events-none"></div>
            </div>

            {/* Esquinas de Interfaz */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-reactor-cyan/40 rounded-tl-lg"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-reactor-cyan/40 rounded-br-lg"></div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050608]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHologram(true)} 
              className="flex items-center justify-center w-10 h-10 bg-transparent overflow-hidden hover:scale-110 transition-transform"
            >
              <img src="/images/logo.jpg" alt="Logo" className="w-full h-full object-contain block" />
            </button>
            <span className="font-mono font-bold text-sm tracking-widest text-white uppercase">
              Andromeda <span className="text-reactor-cyan">Core</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href={`/${locale}/docs`} className="text-[11px] font-mono text-gray-500 hover:text-reactor-cyan transition-colors uppercase tracking-widest">{t('nav.docs')}</Link>
            <Link href={`/${locale}/pricing`} className="text-[11px] font-mono text-gray-500 hover:text-reactor-cyan transition-colors uppercase tracking-widest">{t('nav.pricing')}</Link>
            <Link href={`/${locale}/registry`} className="text-[11px] font-mono text-gray-500 hover:text-reactor-cyan transition-colors uppercase tracking-widest">{t('nav.registry')}</Link>
            <LanguageSwitcher />
          </div>
          <Link href={`/${locale}/intelligence`} className="flex items-center gap-2 px-4 py-2 bg-reactor-cyan text-white text-[11px] font-mono font-bold uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            {t('nav.launch')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(rgba(0,240,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-reactor-cyan/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-reactor-cyan/20 bg-reactor-cyan/5 rounded-[2px] text-[10px] font-mono text-reactor-cyan uppercase tracking-[0.3em] mb-8">
            <span className="w-1.5 h-1.5 bg-reactor-cyan rounded-full animate-pulse" />
            {t('hero.tagline')}
          </div>

          <h1 className="text-5xl md:text-7xl font-mono font-bold leading-[1.05] mb-6 tracking-tighter uppercase">
            <span className="text-white">{t('how.heading1')}</span><br />
            <span className="text-reactor-cyan">{t('how.heading2')}</span>
          </h1>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed mb-10">{t('hero.subtitle')}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href={`/${locale}/intelligence`} className="flex items-center gap-2 px-8 py-3.5 bg-reactor-cyan text-white font-mono font-bold text-sm uppercase tracking-widest rounded-[2px] hover:bg-cyan-400 transition-all shadow-[0_0_30px_rgba(0,240,255,0.3)]">
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
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6 bg-black">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-gray-500 font-mono">
          <div className="flex items-center gap-3">
             <img src="/images/logo.jpg" alt="Logo" className="w-5 h-5 object-contain opacity-50" />
             <span className="text-sm uppercase tracking-widest">Andromeda <span className="text-reactor-cyan/60">Core</span></span>
          </div>
          <div className="flex gap-8 text-[11px] uppercase tracking-widest">
            <Link href={`/${locale}/docs`} className="hover:text-white transition-colors">{t('nav.docs')}</Link>
            <Link href={`/${locale}/pricing`} className="hover:text-white transition-colors">{t('nav.pricing')}</Link>
            <Link href={`/${locale}/registry`} className="hover:text-white transition-colors">{t('nav.registry')}</Link>
          </div>
          <span className="text-[10px] tracking-widest">© 2026 ANDROMEDA_COMPUTER</span>
        </div>
      </footer>

      <style>{`
        @keyframes flicker { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.3; } }
        @keyframes hologramAppear {
          0% { opacity: 0; transform: scale(1.1) translateY(20px); filter: brightness(3) blur(5px); }
          100% { opacity: 0.9; transform: scale(1) translateY(0); filter: brightness(1) blur(0px); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
