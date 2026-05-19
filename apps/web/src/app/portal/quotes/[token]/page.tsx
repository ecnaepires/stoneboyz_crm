import { notFound } from 'next/navigation';
import { getApiClient } from '@/lib/api';
import { acceptPortalQuoteAction, rejectPortalQuoteAction } from './_actions';

function formatDollars(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default async function PortalQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const client = getApiClient();
  const { data: quote, error } = await client.GET('/portal/quotes/{token}', {
    params: { path: { token } },
  });

  if (error || !quote) notFound();

  const canRespond = quote.status === 'sent';
  const totalCents = quote.subtotalCents + quote.taxCents - quote.discountCents;
  const acceptWithToken = acceptPortalQuoteAction.bind(null, token);
  const rejectWithToken = rejectPortalQuoteAction.bind(null, token);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <p className="text-sm text-gray-500">Quote for {quote.customerName}</p>
          <h1 className="text-3xl font-bold">{quote.title}</h1>
          <p className="text-sm text-gray-400">{quote.quoteNumber}</p>
          {quote.validUntil && (
            <p className="mt-1 text-sm text-gray-500">
              Valid until {new Date(quote.validUntil).toLocaleDateString()}
            </p>
          )}
        </div>

        {quote.status === 'accepted' && (
          <div className="mb-4 rounded bg-green-50 p-4 text-green-800 font-medium">
            Quote accepted. Thank you!
          </div>
        )}
        {quote.status === 'rejected' && (
          <div className="mb-4 rounded bg-red-50 p-4 text-red-800 font-medium">Quote declined.</div>
        )}
        {quote.status === 'draft' && (
          <div className="mb-4 rounded bg-yellow-50 p-4 text-yellow-800 text-sm">
            This quote is still being prepared.
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="p-4 font-medium">Item</th>
                <th className="p-4 font-medium">Qty</th>
                <th className="p-4 font-medium text-right">Unit Price</th>
                <th className="p-4 font-medium text-right">Labor</th>
                <th className="p-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.lineItems.map((item) => {
                const lineTotal = (item.unitPriceCents + item.laborPriceCents) * item.qty;
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-4">
                      <p className="font-medium">{item.stoneType}</p>
                      {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                    </td>
                    <td className="p-4">
                      {item.qty} {item.qtyUnit}
                    </td>
                    <td className="p-4 text-right">{formatDollars(item.unitPriceCents)}</td>
                    <td className="p-4 text-right">{formatDollars(item.laborPriceCents)}</td>
                    <td className="p-4 text-right font-medium">{formatDollars(lineTotal)}</td>
                  </tr>
                );
              })}
              {quote.lineItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">
                    No items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatDollars(quote.subtotalCents)}</span>
            </div>
            {quote.discountCents > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Discount</span>
                <span>-{formatDollars(quote.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">
                Tax ({(quote.taxRateBps / 100).toFixed(2)}%)
              </span>
              <span>{formatDollars(quote.taxCents)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <span>Total</span>
              <span>{formatDollars(totalCents)}</span>
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm text-sm">
            <p className="mb-1 font-medium">Notes</p>
            <p className="whitespace-pre-wrap text-gray-600">{quote.notes}</p>
          </div>
        )}

        {quote.termsAndConditions && (
          <div className="mb-6 rounded-lg bg-white p-4 shadow-sm text-sm">
            <p className="mb-1 font-medium">Terms and Conditions</p>
            <p className="whitespace-pre-wrap text-gray-600">{quote.termsAndConditions}</p>
          </div>
        )}

        {canRespond && (
          <div className="flex gap-3">
            <form action={acceptWithToken}>
              <button
                type="submit"
                className="rounded bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700"
              >
                Accept Quote
              </button>
            </form>
            <form action={rejectWithToken}>
              <button
                type="submit"
                className="rounded border px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Decline
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
