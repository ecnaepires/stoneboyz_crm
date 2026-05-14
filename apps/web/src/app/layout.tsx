import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stoneboyz CRM',
  description: 'B2B CRM for Stoneboyz',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <nav className="w-64 border-r bg-muted/40 p-4">
            <div className="mb-6">
              <h1 className="text-lg font-semibold">Stoneboyz CRM</h1>
            </div>
            <ul className="space-y-1">
              <li>
                <a
                  href="/customers"
                  className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Customers
                </a>
              </li>
              <li>
                <a
                  href="/projects"
                  className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Projects
                </a>
              </li>
              <li>
                <a
                  href="/customers/archived"
                  className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Archived
                </a>
              </li>
            </ul>
          </nav>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
