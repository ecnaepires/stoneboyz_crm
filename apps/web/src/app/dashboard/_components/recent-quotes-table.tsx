import type { components } from '@stoneboyz/api-client';
import Link from 'next/link';
import { formatCurrencyFromCents, initialsFromTitle, statusStyle } from './utils';

type RecentQuote = components['schemas']['RecentQuote'];

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function RecentQuotesTable({ quotes }: { quotes: RecentQuote[] }) {
  return (
    <div className='overflow-hidden rounded-2xl border border-border bg-card'>
      <div className='flex items-center justify-between border-b border-border px-5 py-4'>
        <h2 className='text-sm font-bold'>Recent Quotes</h2>
        <Link href='/customers' className='text-xs font-semibold text-accent hover:underline'>
          View all →
        </Link>
      </div>

      {quotes.length === 0 ? (
        <p className='p-6 text-sm text-muted-foreground'>No recent quotes yet.</p>
      ) : (
        <div className='divide-y divide-border'>
          <div className='grid grid-cols-[1.6fr_150px_120px_100px_64px] items-center px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
            <span>Quote</span>
            <span>Customer</span>
            <span>Status</span>
            <span className='text-right'>Value</span>
            <span className='text-right'>Date</span>
          </div>
          {quotes.map((quote) => {
            const status = statusStyle(quote.status);
            return (
              <div
                key={quote.id}
                className='grid grid-cols-[1.6fr_150px_120px_100px_64px] items-center px-5 py-3 text-sm transition-colors hover:bg-muted/50'
              >
                <div className='flex items-center gap-3'>
                  <span className='grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted text-[11px] font-bold text-muted-foreground'>
                    {initialsFromTitle(quote.title)}
                  </span>
                  <div className='min-w-0'>
                    <Link
                      href={`/customers/${quote.customerId}/quotes/${quote.id}`}
                      className='block truncate font-semibold hover:text-accent'
                    >
                      {quote.title}
                    </Link>
                    <span className='font-mono text-[11px] text-muted-foreground'>{quote.quoteNumber}</span>
                  </div>
                </div>
                <Link
                  href={`/customers/${quote.customerId}`}
                  className='truncate text-muted-foreground hover:text-foreground'
                >
                  {quote.customerName}
                </Link>
                <span>
                  <span
                    className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold'
                    style={{ color: status.color, backgroundColor: `${status.color}1f` }}
                  >
                    <span className='h-1.5 w-1.5 rounded-full' style={{ backgroundColor: status.color }} />
                    {status.label}
                  </span>
                </span>
                <span className='text-right font-mono text-[13px]'>
                  {formatCurrencyFromCents(quote.valueCents)}
                </span>
                <span className='text-right font-mono text-[11px] text-muted-foreground'>
                  {formatDate(quote.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
