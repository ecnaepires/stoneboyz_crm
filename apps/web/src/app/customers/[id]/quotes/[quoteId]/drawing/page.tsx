import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { DrawingCard } from '../DrawingCard';
import type { QuoteAreaWithMeasurementTotals } from '../MeasurementsCard';

export default async function QuoteDrawingWorkspacePage({
  params,
}: {
  params: Promise<{ id: string; quoteId: string }>;
}) {
  const { id: customerId, quoteId } = await params;
  const client = await getApiClientWithAuth();

  const [{ data: quote, error }, { data: customer }] = await Promise.all([
    client.GET('/customers/{customerId}/quotes/{quoteId}', {
      params: { path: { customerId, quoteId } },
    }),
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
  ]);

  if (error || !quote) {
    notFound();
  }

  const areas = (quote.areas ?? []) as QuoteAreaWithMeasurementTotals[];
  const isDraft = quote.status === 'draft';
  const hasPriceList = quote.priceListId !== null;

  return (
    <div className="max-w-none space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href={`/customers/${customerId}`} className="hover:underline">
              {customer?.name ?? 'Customer'}
            </Link>{' '}
            / <Link href={`/customers/${customerId}/quotes`} className="hover:underline">Quotes</Link> /{' '}
            <Link href={`/customers/${customerId}/quotes/${quoteId}`} className="hover:underline">
              {quote.quoteNumber}
            </Link>{' '}
            / Drawing Workspace
          </div>
          <h2 className="text-3xl font-bold">{quote.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            CounterGo-style workspace for drawing, edge treatment, sink placement, area setup, and pricing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize">
            {quote.status}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/customers/${customerId}/quotes/${quoteId}`}>Back to Quote</Link>
          </Button>
        </div>
      </div>

      <DrawingCard
        customerId={customerId}
        quoteId={quoteId}
        areas={areas}
        isDraft={isDraft}
        hasPriceList={hasPriceList}
        standalone
      />
    </div>
  );
}
