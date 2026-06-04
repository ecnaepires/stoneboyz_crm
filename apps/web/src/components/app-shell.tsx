'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AppShellProps {
  isAdmin: boolean;
  children: React.ReactNode;
}

export function AppShell({ isAdmin, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className='flex min-h-screen'>
      {/* Sidebar */}
      <nav
        className={`border-r bg-muted/40 transition-all duration-200 overflow-hidden ${collapsed ? 'w-0 min-w-0 p-0' : 'w-64 p-4'}`}
      >
        <div className='mb-6'>
          <h1 className='text-lg font-semibold whitespace-nowrap'>Stoneboyz CRM</h1>
        </div>
        <ul className='space-y-1'>
          {[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/customers', label: 'Customers' },
            { href: '/projects', label: 'Jobs' },
            { href: '/pipeline', label: 'Pipeline' },
            { href: '/customers', label: 'Quotes' },
            { href: '/schedule', label: 'Scheduling' },
            { href: '/price-lists', label: 'Pricing' },
            { href: '/slabs', label: 'Slabs' },
            { href: '/customers/archived', label: 'Archived' },
          ].map(({ href, label }) => (
            <li key={label}>
              <Link
                href={href}
                className='block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted whitespace-nowrap'
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <div className='mt-6 border-t pt-4'>
            <p className='mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap'>
              Admin
            </p>
            <ul className='space-y-1'>
              <li>
                <Link
                  href='/admin/users'
                  className='block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted whitespace-nowrap'
                >
                  Users
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Main */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Topbar with toggle */}
        <div className='flex items-center gap-3 border-b bg-background px-4 py-2'>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className='rounded-md border p-1.5 text-muted-foreground hover:bg-muted'
            aria-label='Toggle sidebar'
          >
            <svg width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='currentColor' strokeWidth='1.5'>
              <line x1='2' y1='4' x2='14' y2='4'/>
              <line x1='2' y1='8' x2='14' y2='8'/>
              <line x1='2' y1='12' x2='14' y2='12'/>
            </svg>
          </button>
        </div>
        <main className='flex-1 overflow-y-auto p-6'>{children}</main>
      </div>
    </div>
  );
}
