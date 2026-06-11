import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getApiClientWithAuth } from '@/lib/api';
import {
  activatePriceListAction,
  archivePriceListAction,
} from '../_actions';
import { filterItemsByGroup, type PriceListItemView } from './PriceGroupItems';
import { GROUPS, groupHref } from '../pricing-groups';

export default async function PriceListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getApiClientWithAuth();
  const { data: priceList, error } = await client.GET('/price-lists/{priceListId}', {
    params: { path: { priceListId: id } },
  });

  if (error || !priceList) {
    console.error('Failed to load price list', error);

    return <div className="text-red-600">Failed to load price list.</div>;
  }

  const isDraft = priceList.status === 'draft';
  const canEdit = priceList.status !== 'archived';
  const items = (priceList.items ?? []) as PriceListItemView[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{priceList.name}</h2>
          <p className="text-sm text-muted-foreground">
            Revision {priceList.revision} - <span className="capitalize">{priceList.status}</span>
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {canEdit && <Button asChild variant="outline"><Link href={`/price-lists/${id}/edit`}>Edit Info</Link></Button>}
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

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Pricing Groups</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((group) => {
            const groupItems = filterItemsByGroup(items, group);

            return (
              <Link
                key={group.value}
                href={groupHref(id, group.value)}
                className="rounded-md border p-4 transition-colors hover:bg-muted"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">{group.label}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{group.ruleLabel}</p>
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    {groupItems.length}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
