'use client';

import { ReactNode, useState, useEffect } from 'react';
import HardTechContainer from '@/components/layout/HardTechContainer';
import { AuditSafetySwitch } from '@/components/ui/AuditSafetySwitch';
import { LayoutDashboard, Activity, Terminal, Shield, Settings, Database, Cpu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { locales } from '@/i18n/locales';
import { useTranslations } from 'next-intl';

interface DashboardUnifiedProps {
    children: ReactNode;
}

export default function DashboardUnified({ children }: DashboardUnifiedProps) {
    const pathname = usePathname();
    const [auditActive, setAuditActive] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [sessionId] = useState(() => Math.floor(Math.random() * 9999));
    const t = useTranslations('DashboardUnified');

    // Extraer locale actual y ruta sin prefijo de locale
    const localeMatch = pathname?.match(/^\/(es|en|pt)/);
    const currentLocale = localeMatch ? localeMatch[1] : 'es';
    const pathBase = pathname?.replace(/^\/(es|en|pt)/, '') || '';

    useEffect(() => {
        setMounted(true);
    }, []);

    const navItems = [
        { icon: LayoutDashboard, label: t('Navigation.global'), href: '/intelligence' },
        { icon: Activity, label: t('Navigation.coordination'), href: '/coordination' },
        { icon: Database, label: t('Navigation.registry'), href: '/registry' },
        { icon: Shield, label: t('Navigation.audit'), href: '/audit' },
        { icon: Terminal, label: t('Navigation.devtools'), href: '/desarrollo' },
    ];

    const handleAuditClick = () => {
        setAuditActive(!auditActive);
        // Future: Trigger audit logic
    };

    return (
        <div className="design-andromeda-core min-h-screen">
            <HardTechContainer className="flex-row">
                {/* SIDEBAR DE NAVEGACIÓN (ZONA B) */}
                <aside className="fixed left-0 top-0 bottom-0 w-20 bg-[#0d0f14] border-r border-[#1e2430] z-50 flex flex-col items-center py-6 shadow-2xl">
                    <div className="mb-8 p-2 bg-reactor-cyan/10 rounded-lg border border-reactor-cyan/20">
                        <Cpu className="w-8 h-8 text-reactor-cyan animate-pulse" />
                    </div>

                    <nav className="flex-1 flex flex-col gap-6 w-full px-2">
                        {navItems.map((item) => {
                            const isActive = pathBase === item.href || pathBase.startsWith(item.href + '/');
                            return (
                                <Link key={item.href} href={`/${currentLocale}${item.href}`} className="w-full">
                                    <div
                                        className={`
                    group flex flex-col items-center justify-center p-3 rounded-[4px] transition-all duration-200
                    border border-transparent hover:border-gray-700 hover:bg-white/5
                    ${isActive ? 'bg-white/10 border-reactor-cyan/30 shadow-[inset_0_0_10px_rgba(0,240,255,0.1)]' : 'opacity-60 hover:opacity-100'}
                  `}
                                    >
                                        <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'text-reactor-cyan drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]' : 'text-gray-500 group-hover:text-gray-300'}`} />
                                        <span className={`text-[9px] text-mono font-bold tracking-widest uppercase ${isActive ? 'text-reactor-cyan' : 'text-gray-600'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* LANGUAGE SELECTOR */}
                    <div className="mt-auto flex flex-col items-center gap-2 w-full px-2">
                        <div className="w-full border-t border-[#1e2430] pt-4 mb-1">
                            <div className="text-[8px] text-mono text-gray-700 tracking-[0.2em] text-center mb-2 uppercase">{t('Sidebar.language')}</div>
                            <div className="flex flex-col gap-1 w-full">
                                {locales.map((locale) => (
                                    <Link
                                        key={locale}
                                        href={`/${locale}${pathBase || '/intelligence'}`}
                                        className={`
                                        w-full py-1 text-[9px] text-mono font-bold tracking-widest text-center
                                        border rounded-[1px] transition-all duration-200 uppercase block
                                        ${currentLocale === locale
                                                ? 'border-reactor-cyan/50 text-reactor-cyan bg-reactor-cyan/10 shadow-[0_0_8px_rgba(0,212,255,0.1)]'
                                                : 'border-transparent text-gray-700 hover:text-gray-400 bg-transparent'
                                            }
                                    `}
                                    >
                                        {locale.toUpperCase()}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <button className="p-2 text-gray-700 hover:text-reactor-cyan transition-colors">
                            <Settings className="w-5 h-5 opacity-40 hover:opacity-100" />
                        </button>
                    </div>
                </aside>

                {/* ÁREA PRINCIPAL (ZONA A + C + D) */}
                <main className="flex-1 ml-20 flex flex-col min-h-screen">

                    {/* ZONA A: CABECERA DE CONTROL */}
                    <header className="h-16 bg-[#0a0b0e]/80 backdrop-blur-md border-b border-[#1e2430] sticky top-0 z-40 px-8 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-4">
                            <h1 className="title-orbitron text-lg font-bold">
                                {t('Header.title')}<span className="text-reactor-cyan opacity-80">{t('Header.core')}</span>
                                <span className="text-[10px] text-mono text-gray-600 ml-3 font-normal tracking-wider border border-[#1e2430] px-2 py-0.5 rounded-[1px]">{t('Header.version')}</span>
                            </h1>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-[1px] border border-[#1e2430] text-[10px] text-mono text-reactor-cyan font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 bg-reactor-cyan rounded-full animate-pulse shadow-[0_0_8px_rgba(0,212,255,0.6)]" />
                                {t('Header.systemOnline')}
                            </div>

                            <AuditSafetySwitch isActive={auditActive} onClick={handleAuditClick} />
                        </div>
                    </header>

                    {/* ZONA C: VIEWPORT CENTRAL */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {children}
                    </div>

                    {/* ZONA D: BARRA DE ESTADO */}
                    <footer className="h-7 bg-[#050505] border-t border-[#1e2430] flex items-center justify-between px-6 text-[9px] text-mono text-gray-600 uppercase tracking-widest">
                        <div className="flex gap-6">
                            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-green-500 rounded-full"></div>{t('Status.uptime')}: 100%</span>
                            <span>LAT: 24MS</span>
                            <span>MEM: 48%</span>
                        </div>
                        <div className="flex gap-6">
                            <span className="text-reactor-cyan opacity-80">{t('Status.secureConnection')}</span>
                            <span className="opacity-40">{t('Status.sessionId')}: {mounted ? sessionId : '----'}</span>
                        </div>
                    </footer>

                </main>
            </HardTechContainer>
        </div>
    );
}
