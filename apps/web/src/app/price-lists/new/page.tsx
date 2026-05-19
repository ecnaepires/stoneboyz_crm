import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createPriceListAction } from '../_actions';

export default function NewPriceListPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">New Price List</h2>
        <Button asChild variant="outline"><Link href="/price-lists">Cancel</Link></Button>
      </div>
      <form action={createPriceListAction} className="space-y-4">
        <input name="name" required placeholder="Name" className="h-10 w-full rounded-md border px-3 text-sm" />
        <textarea name="description" placeholder="Description" className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-4">
          <input name="revision" type="number" min="1" defaultValue="1" className="h-10 rounded-md border px-3 text-sm" />
          <input name="currencyCode" defaultValue="USD" maxLength={3} className="h-10 rounded-md border px-3 text-sm" />
          <input name="defaultTaxRateBps" type="number" min="0" max="10000" defaultValue="0" className="h-10 rounded-md border px-3 text-sm" />
          <input name="expirationDays" type="number" min="1" placeholder="Expiration days" className="h-10 rounded-md border px-3 text-sm" />
        </div>
        <input name="defaultPaymentTerms" placeholder="Payment terms" className="h-10 w-full rounded-md border px-3 text-sm" />
        <Button type="submit">Create Price List</Button>
      </form>
    </div>
  );
}
