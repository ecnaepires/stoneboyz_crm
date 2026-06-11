import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getApiClientWithAuth } from '@/lib/api';
import { PriceGroupItems, filterItemsByGroup, type PriceListItemView } from '../PriceGroupItems';
import { getGroupBySegment } from '../../pricing-groups';

export default async function PriceListGroupPage({
  params,
}: {
  params: Promise<{ id: string; group: string }>;
}) {
  const { id, group: groupSegment } = await params;
  const group = getGroupBySegment(groupSegment);

  if (group === null) {
    notFound();
  }

  const client = await getApiClientWithAuth();
  const { data: priceList, error } = await client.GET('/price-lists/{priceListId}', {
    params: { path: { priceListId: id } },
  });

  if (error || !priceList) {
    console.error('Failed to load price list', error);

    return <div className="text-red-600">Failed to load price list.</div>;
  }

  const items = filterItemsByGroup((priceList.items ?? []) as PriceListItemView[], group);
  const canEdit = priceList.status !== 'archived';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href={`/price-lists/${id}`} className="hover:underline">{priceList.name}</Link> / {group.label}
          </div>
          <h2 className="text-2xl font-bold">{group.label}</h2>
        </div>
        <Button asChild variant="outline">
          <Link href={`/price-lists/${id}`}>Pricing Groups</Link>
        </Button>
      </div>

      <section className="rounded-md border p-4">
        <PriceGroupItems priceListId={id} group={group} items={items} canEdit={canEdit} />
      </section>
    </div>
  );
}
