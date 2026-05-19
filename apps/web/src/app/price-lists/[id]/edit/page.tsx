import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getApiClientWithAuth } from '@/lib/api';
import { updatePriceListAction } from '../../_actions';

export default async function EditPriceListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getApiClientWithAuth();
  const { data: priceList, error } = await client.GET('/price-lists/{priceListId}', {
    params: { path: { priceListId: id } },
  });

  if (error || !priceList) return <div className="text-red-600">Failed to load price list: {JSON.stringify(error)}</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Edit Price List</h2>
        <Button asChild variant="outline"><Link href={`/price-lists/${id}`}>Cancel</Link></Button>
      </div>
      <form action={updatePriceListAction.bind(null, id)} className="space-y-4">
        <input name="name" required defaultValue={priceList.name} className="h-10 w-full rounded-md border px-3 text-sm" />
        <textarea name="description" defaultValue={priceList.description ?? ''} className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-4">
          <input name="revision" type="number" min="1" defaultValue={priceList.revision} className="h-10 rounded-md border px-3 text-sm" />
          <input name="currencyCode" defaultValue={priceList.currencyCode} maxLength={3} className="h-10 rounded-md border px-3 text-sm" />
          <input name="defaultTaxRateBps" type="number" min="0" max="10000" defaultValue={priceList.defaultTaxRateBps} className="h-10 rounded-md border px-3 text-sm" />
          <input name="expirationDays" type="number" min="1" defaultValue={priceList.expirationDays ?? ''} className="h-10 rounded-md border px-3 text-sm" />
        </div>
        <input name="defaultPaymentTerms" defaultValue={priceList.defaultPaymentTerms ?? ''} className="h-10 w-full rounded-md border px-3 text-sm" />
        <Button type="submit">Save Price List</Button>
      </form>
    </div>
  );
}
