import { headers } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Obtener el locale desde la URL para establecer el atributo lang
  const headersList = await headers();
  const pathname = headersList.get('x-next-pathname') || '';
  const locale = pathname.split('/')[1] || 'es';
  
  return (
    <html lang={locale} className="dark">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="font-sans antialiased bg-[#050608] text-gray-100">
        {children}
      </body>
    </html>
  );
}
