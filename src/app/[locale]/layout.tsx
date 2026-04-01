import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from "next";
import "../globals.css";
import "../andromeda-core.css";
import { ModeProvider } from "@/components/andromeda/modes/ModeContext";
import WalletProvider from "@/components/providers/WalletProvider";

import { locales, defaultLocale } from '@/i18n/locales';

import FaroProvider from "@/components/providers/FaroProvider";

// Fuente del sistema en lugar de Google Fonts
const fontClass = "font-sans";

export const metadata: Metadata = {
  title: "Andromeda Computer | Sistema de Coordinación Web3",
  description: "Sistema operativo conceptual para validación, coordinación y construcción de infraestructura Web3 con propósito.",
  keywords: ["Andromeda Computer", "Web3", "DAO", "Gobernanza", "Ecosistema", "Validación", "Blockchain", "Algorand", "Ethereum"],
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params
}: RootLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body className={`${fontClass} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <FaroProvider>
            <WalletProvider>
              <ModeProvider>
                <main>
                  {children}
                </main>
              </ModeProvider>
            </WalletProvider>
          </FaroProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
