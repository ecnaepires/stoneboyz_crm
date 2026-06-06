import type { Metadata } from 'next';
import { Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { getApiClientWithAuth } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import './globals.css';

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Stoneboyz CRM',
  description: 'B2B CRM for Stoneboyz',
};

// Applies the saved theme before paint to avoid a flash of the wrong theme.
const themeInitScript = `
(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await getApiClientWithAuth();
  const { data: me } = await client.GET('/users/me', {});

  const fontClasses = `${sans.variable} ${mono.variable}`;

  if (!me) {
    return (
      <html lang='en' className={fontClasses} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body className='font-sans antialiased'>{children}</body>
      </html>
    );
  }

  return (
    <html lang='en' className={fontClasses} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className='font-sans antialiased'>
        <AppShell isAdmin={me.role === 'admin'}>{children}</AppShell>
      </body>
    </html>
  );
}
