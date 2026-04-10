'use client';

import { ReactNode, useState, useEffect } from 'react';
import HardTechContainer from '@/components/layout/HardTechContainer';
import { AuditSafetySwitch } from '@/components/ui/AuditSafetySwitch';
import { LayoutDashboard, Activity, Terminal, Shield, Settings, Database, Cpu, Menu, X } from 'lucide-react';
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const t = useTranslations('DashboardUnified');

    const localeMatch = pathname?.match(/^\/(es|en|pt)/);
    const currentLocale = localeMatch ? localeMatch[1] : 'es';
    const pathBase = pathname?.replace(/^\/(es|en|pt)/, '') || '';

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { setMobileMenuOpen(false); }, [pathname]);
    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    const navItems = [
        { icon: LayoutDashboard, label: t('Navigation.global'), href: '/intelligence' },
        { icon: Activity, label: t('Navigation.coordination'), href: '/coordination' },
        { icon: Database, label: t('Navigation.registry'), href: '/registry' },
        { icon: Shield, label: t('Navigation.audit'), href: '/audit' },
        { icon: Terminal, label: t('Navigation.devtools'), href: '/desarrollo' },
    ];

    const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
        <>
            <nav className={`flex-1 flex ${mobile ? 'flex-col gap-2 w-full' : 'flex-col gap-6 w-full px-2'}`}>
                {navItems.map((item) => {
                    const isActive = pathBase === item.href || pathBase.startsWith(item.href + '/');
                    return (
                        <Link key={item.href} href={`/${currentLocale}${item.href}`} className="w-full">
                            <div className={`
                                group flex ${mobile ? 'flex-row gap-3 px-4 py-3' : 'flex-col items-center justify-center p-3'}
                                rounded-[4px] transition-all duration-200
                                border border-transparent hover:border-gray-700 hover:bg-white/5
                                ${isActive ? 'bg-white/10 border-reactor-cyan/30 shadow-[inset_0_0_10px_rgba(0,240,255,0.1)]' : 'opacity-60 hover:opacity-100'}
                            `}>
                                <item.icon className={`${mobile ? 'w-5 h-5' : 'w-6 h-6 mb-1'} ${isActive ? 'text-reactor-cyan drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]' : 'text-gray-500 group-hover:text-gray-300'}`} />
                                <span className={`${mobile ? 'text-sm' : 'text-[9px]'} text-mono font-bold tracking-widest uppercase ${isActive ? 'text-reactor-cyan' : 'text-gray-600'}`}>
                                    {item.label}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </nav>
            <div className={`mt-auto flex flex-col items-center gap-2 w-full ${mobile ? '' : 'px-2'}`}>
                <div className={`w-full border-t border-[#1e2430] pt-4 mb-1 ${mobile ? 'px-4' : ''}`}>
                    <div className="text-[8px] text-mono text-gray-700 tracking-[0.2em] text-center mb-2 uppercase">{t('Sidebar.language')}</div>
                    <div className={`flex ${mobile ? 'flex-row justify-center gap-3' : 'flex-col gap-1'} w-full`}>
                        {locales.map((locale) => (
                            <Link key={locale} href={`/${locale}${pathBase || '/intelligence'}`}
                                className={`${mobile ? 'px-4 py-2' : 'w-full py-1'} text-[9px] text-mono font-bold tracking-widest text-center border rounded-[1px] transition-all duration-200 uppercase block
                                    ${currentLocale === locale ? 'border-reactor-cyan/50 text-reactor-cyan bg-reactor-cyan/10' : 'border-transparent text-gray-700 hover:text-gray-400'}`}>
                                {locale.toUpperCase()}
                            </Link>
                        ))}
                    </div>
                </div>
                {!mobile && (
                    <button className="p-2 text-gray-700 hover:text-reactor-cyan transition-colors">
                        <Settings className="w-5 h-5 opacity-40 hover:opacity-100" />
                    </button>
                )}
            </div>
        </>
    );

    return (
        <div className="design-andromeda-core min-h-screen">
            <HardTechContainer className="flex-row">

                {/* SIDEBAR DESKTOP */}
                <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-[#0d0f14] border-r border-[#1e2430] z-50 flex-col items-center py-6 shadow-2xl">
                    <div className="mb-8 p-2 bg-reactor-cyan/10 rounded-lg border border-reactor-cyan/20">
                        <Cpu className="w-8 h-8 text-reactor-cyan animate-pulse" />
                    </div>
                    <NavContent mobile={false} />
                </aside>

                {/* OVERLAY MÓVIL */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setMobileMenuOpen(false)} />
                )}

                {/* DRAWER MÓVIL */}
                <aside className={`md:hidden fixed left-0 top-0 bottom-0 w-72 bg-[#0d0f14] border-r border-[#1e2430] z-50 flex flex-col py-6 shadow-2xl transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex items-center justify-between px-4 mb-8">
                        <div className="p-2 bg-reactor-cyan/10 rounded-lg border border-reactor-cyan/20">
                            <Cpu className="w-8 h-8 text-reactor-cyan animate-pulse" />
                        </div>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 hover:text-reactor-cyan transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <NavContent mobile={true} />
                </aside>

                {/* ÁREA PRINCIPAL */}
                <main className="flex-1 md:ml-20 flex flex-col min-h-screen">
                    <header className="h-16 bg-[#0a0b0e]/80 backdrop-blur-md border-b border-[#1e2430] sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <button className="md:hidden p-2 text-gray-500 hover:text-reactor-cyan transition-colors" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
                                <Menu className="w-6 h-6" />
                            </button>
                            <h1 className="title-orbitron text-sm md:text-lg font-bold">
                                {t('Header.title')}<span className="text-reactor-cyan opacity-80">{t('Header.core')}</span>
                                <span className="hidden md:inline text-[10px] text-mono text-gray-600 ml-3 font-normal tracking-wider border border-[#1e2430] px-2 py-0.5 rounded-[1px]">{t('Header.version')}</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 md:gap-6">
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-[1px] border border-[#1e2430] text-[10px] text-mono text-reactor-cyan font-bold uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 bg-reactor-cyan rounded-full animate-pulse" />
                                {t('Header.systemOnline')}
                            </div>
                            <AuditSafetySwitch isActive={auditActive} onClick={() => window.location.href = `/${currentLocale}/audit`} />
                        </div>
                    </header>

                    <div className="flex-1 p-3 md:p-6 overflow-y-auto">
                        {children}
                    </div>

                    <footer className="h-7 bg-[#050505] border-t border-[#1e2430] flex items-center justify-between px-3 md:px-6 text-[9px] text-mono text-gray-600 uppercase tracking-widest">
                        <div className="flex gap-3 md:gap-6">
                            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-green-500 rounded-full"></div>{t('Status.uptime')}: 100%</span>
                            <span className="hidden md:inline">LAT: 24MS</span>
                            <span className="hidden md:inline">MEM: 48%</span>
                        </div>
                        <div className="flex gap-3 md:gap-6">
                            <span className="text-reactor-cyan opacity-80">{t('Status.secureConnection')}</span>
                            <span className="hidden md:inline opacity-40">{t('Status.sessionId')}: {mounted ? sessionId : '----'}</span>
                        </div>
                    </footer>
                </main>
            </HardTechContainer>
        </div>
    );
}
