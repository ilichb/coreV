import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ModeProvider } from '@/components/andromeda/modes/ModeContext';
import WalletProvider from '@/components/providers/WalletProvider';
import FaroProvider from '@/components/providers/FaroProvider';
import "../globals.css";
import "../andromeda-core.css";

export const metadata = {
  title: "Andromeda Computer | Sistema de Coordinación Web3",
  description: "Sistema operativo conceptual para validación, coordinación y construcción de infraestructura Web3 con propósito.",
  keywords: ["Andromeda Computer", "Web3", "DAO", "Gobernanza", "Ecosistema", "Validación", "Blockchain", "Algorand", "Ethereum"],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) notFound();

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <FaroProvider>
        <WalletProvider>
          <ModeProvider>
            {children}
          </ModeProvider>
        </WalletProvider>
      </FaroProvider>
    </NextIntlClientProvider>
  );
}
