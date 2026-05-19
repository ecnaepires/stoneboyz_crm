import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiClientWithAuth } from '@/lib/api';
import {
  activatePriceListAction,
  archivePriceListAction,
  createPriceListItemAction,
  deletePriceListItemAction,
  updatePriceListItemAction,
} from '../_actions';

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function PriceListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getApiClientWithAuth();
  const { data: priceList, error } = await client.GET('/price-lists/{priceListId}', {
    params: { path: { priceListId: id } },
  });

  if (error || !priceList) return <div className="text-red-600">Failed to load price list: {JSON.stringify(error)}</div>;
  const isDraft = priceList.status === 'draft';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{priceList.name}</h2>
          <p className="text-sm text-muted-foreground">Revision {priceList.revision} · <span className="capitalize">{priceList.status}</span></p>
        </div>
        <div className="flex gap-2">
          {isDraft && <Button asChild variant="outline"><Link href={`/price-lists/${id}/edit`}>Edit</Link></Button>}
          {isDraft && <form action={activatePriceListAction.bind(null, id)}><Button type="submit" variant="outline">Activate</Button></form>}
          {isDraft && <form action={archivePriceListAction.bind(null, id)}><Button type="submit" variant="outline">Archive</Button></form>}
        </div>
      </div>

      <section className="rounded-md border p-4">
        <h3 className="mb-3 text-lg font-semibold">Info</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted-foreground">Currency</dt><dd>{priceList.currencyCode}</dd></div>
          <div><dt className="text-muted-foreground">Tax rate</dt><dd>{(priceList.defaultTaxRateBps / 100).toFixed(2)}%</dd></div>
          <div><dt className="text-muted-foreground">Payment terms</dt><dd>{priceList.defaultPaymentTerms ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Expiration</dt><dd>{priceList.expirationDays ?? 'None'}</dd></div>
        </dl>
      </section>

      <section className="rounded-md border p-4">
        <h3 className="mb-3 text-lg font-semibold">Items</h3>
        {isDraft && (
          <form action={createPriceListItemAction.bind(null, id)} className="mb-4 grid grid-cols-6 gap-2">
            <input name="category" required placeholder="Category" className="h-10 rounded-md border px-3 text-sm" />
            <input name="itemType" required placeholder="Type" className="h-10 rounded-md border px-3 text-sm" />
            <input name="name" required placeholder="Name" className="h-10 rounded-md border px-3 text-sm" />
            <input name="unit" required placeholder="Unit" className="h-10 rounded-md border px-3 text-sm" />
            <input name="price" required type="number" step="0.01" min="0" placeholder="Price" className="h-10 rounded-md border px-3 text-sm" />
            <input name="sortOrder" type="number" defaultValue="0" className="h-10 rounded-md border px-3 text-sm" />
            <input name="description" placeholder="Description" className="col-span-2 h-10 rounded-md border px-3 text-sm" />
            <label className="flex items-center gap-2 text-sm"><input name="taxable" type="checkbox" defaultChecked /> Taxable</label>
            <label className="flex items-center gap-2 text-sm"><input name="allowDiscount" type="checkbox" defaultChecked /> Discount</label>
            <label className="flex items-center gap-2 text-sm"><input name="editableOnQuote" type="checkbox" defaultChecked /> Editable</label>
            <label className="flex items-center gap-2 text-sm"><input name="hideOnQuote" type="checkbox" /> Hide</label>
            <Button type="submit" className="col-span-6 w-fit">Add Item</Button>
          </form>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sort</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceList.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.sortOrder}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>{dollars(item.priceCents)}</TableCell>
                <TableCell>
                  {isDraft && (
                    <div className="flex gap-2">
                      <form action={updatePriceListItemAction.bind(null, id, item.id)} className="flex gap-2">
                        <input name="sortOrder" type="number" defaultValue={item.sortOrder} className="h-9 w-20 rounded-md border px-2 text-sm" />
                        <input name="price" type="number" step="0.01" min="0" defaultValue={(item.priceCents / 100).toFixed(2)} className="h-9 w-24 rounded-md border px-2 text-sm" />
                        <Button type="submit" variant="outline">Save</Button>
                      </form>
                      <form action={deletePriceListItemAction.bind(null, id, item.id)}><Button type="submit" variant="outline">Delete</Button></form>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
