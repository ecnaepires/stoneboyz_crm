import type { Metadata } from 'next';
import { getApiClientWithAuth } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stoneboyz CRM',
  description: 'B2B CRM for Stoneboyz',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await getApiClientWithAuth();
  const { data: me } = await client.GET('/users/me', {});

  if (!me) {
    return (
      <html lang='en'>
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang='en'>
      <body>
        <AppShell isAdmin={me.role === 'admin'}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
