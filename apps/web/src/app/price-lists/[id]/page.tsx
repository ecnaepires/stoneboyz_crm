import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiClientWithAuth } from '@/lib/api';
import {
  activatePriceListAction,
  archivePriceListAction,
  createPriceListItemAction,
  deletePriceListItemAction,
  updatePriceListItemAction,
} from '../_actions';

type PriceListItemGroup = 'material' | 'fabrication' | 'edge' | 'sink' | 'faucet_hole' | 'splash' | 'admin';
type ChargeMethod = 'square_foot' | 'linear_foot' | 'each';
type MeasurementBasis =
  | 'countertop_sqft'
  | 'backsplash_sqft'
  | 'combined_sqft'
  | 'finished_edge_linft'
  | 'splash_sqft'
  | 'sink_count'
  | 'faucet_hole_count'
  | 'each';

type PriceListItemView = {
  id: string;
  category: string;
  itemGroup?: PriceListItemGroup;
  name: string;
  description: string | null;
  chargeMethod?: ChargeMethod;
  measurementBasis?: MeasurementBasis;
  unit: string;
  priceCents: number;
  sortOrder: number;
  taxable: boolean;
  allowDiscount: boolean;
  editableOnQuote: boolean;
  hideOnQuote: boolean;
};

type GroupConfig = {
  value: PriceListItemGroup;
  label: string;
  category: string;
  chargeMethod: ChargeMethod;
  measurementBasis: MeasurementBasis;
  rateLabel: string;
  ratePlaceholder: string;
  ruleLabel: string;
  advanced?: boolean;
};

const GROUPS: GroupConfig[] = [
  {
    value: 'material',
    label: 'Material',
    category: 'material',
    chargeMethod: 'square_foot',
    measurementBasis: 'combined_sqft',
    rateLabel: '$/sq ft',
    ratePlaceholder: 'Rate per sq ft',
    ruleLabel: 'Countertops + backsplash sq ft'
  },
  {
    value: 'fabrication',
    label: 'Fabrication',
    category: 'fabrication',
    chargeMethod: 'square_foot',
    measurementBasis: 'combined_sqft',
    rateLabel: '$/sq ft',
    ratePlaceholder: 'Rate per sq ft',
    ruleLabel: 'Countertops + backsplash sq ft'
  },
  {
    value: 'edge',
    label: 'Edge',
    category: 'finished_edge',
    chargeMethod: 'linear_foot',
    measurementBasis: 'finished_edge_linft',
    rateLabel: '$/lin ft',
    ratePlaceholder: 'Rate per lin ft',
    ruleLabel: 'Finished edge linear feet'
  },
  {
    value: 'sink',
    label: 'Sink',
    category: 'sink_item',
    chargeMethod: 'each',
    measurementBasis: 'sink_count',
    rateLabel: '$/each',
    ratePlaceholder: 'Rate each',
    ruleLabel: 'Sink count'
  },
  {
    value: 'faucet_hole',
    label: 'Faucet Hole',
    category: 'faucet_hole',
    chargeMethod: 'each',
    measurementBasis: 'faucet_hole_count',
    rateLabel: '$/each',
    ratePlaceholder: 'Rate each',
    ruleLabel: 'Faucet-hole count'
  },
  {
    value: 'splash',
    label: 'Splash',
    category: 'splash',
    chargeMethod: 'square_foot',
    measurementBasis: 'splash_sqft',
    rateLabel: '$/sq ft',
    ratePlaceholder: 'Rate per sq ft',
    ruleLabel: 'Special splash sq ft'
  },
  {
    value: 'admin',
    label: 'Admin Item',
    category: 'admin_item',
    chargeMethod: 'each',
    measurementBasis: 'each',
    rateLabel: 'Rate',
    ratePlaceholder: 'Rate',
    ruleLabel: 'Advanced charge setup',
    advanced: true
  },
];

const CHARGE_METHODS: Array<{ value: ChargeMethod; label: string }> = [
  { value: 'square_foot', label: 'Square foot' },
  { value: 'linear_foot', label: 'Linear foot' },
  { value: 'each', label: 'Each / unit' },
];

const MEASUREMENT_BASES: Array<{ value: MeasurementBasis; label: string }> = [
  { value: 'combined_sqft', label: 'Countertops + backsplash sq ft' },
  { value: 'countertop_sqft', label: 'Countertop sq ft' },
  { value: 'backsplash_sqft', label: 'Backsplash sq ft' },
  { value: 'finished_edge_linft', label: 'Finished-edge LF' },
  { value: 'splash_sqft', label: 'Splash sq ft' },
  { value: 'sink_count', label: 'Sink count' },
  { value: 'faucet_hole_count', label: 'Faucet-hole count' },
  { value: 'each', label: 'Each' },
];

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const inferItemGroup = (item: PriceListItemView): PriceListItemGroup =>
  item.itemGroup ?? GROUPS.find((group) => group.category === item.category)?.value ?? 'material';

const chargeLabel = (value?: string) => CHARGE_METHODS.find((method) => method.value === value)?.label ?? value ?? '-';
const measurementLabel = (value?: string) => MEASUREMENT_BASES.find((basis) => basis.value === value)?.label ?? value ?? '-';

function ruleLabelFor(item: PriceListItemView, group: GroupConfig) {
  if (!group.advanced) return group.ruleLabel;
  return `${item.category} - ${chargeLabel(item.chargeMethod)} - ${measurementLabel(item.measurementBasis)}`;
}

function PresetCreateForm({ priceListId, group }: { priceListId: string; group: GroupConfig }) {
  return (
    <form action={createPriceListItemAction.bind(null, priceListId)} className="mb-4 grid gap-2 md:grid-cols-[1.5fr_1fr_auto]">
      <input type="hidden" name="itemGroup" value={group.value} />
      <input type="hidden" name="category" value={group.category} />
      <input type="hidden" name="itemType" value={group.value} />
      <input type="hidden" name="chargeMethod" value={group.chargeMethod} />
      <input type="hidden" name="measurementBasis" value={group.measurementBasis} />
      <Input name="name" required placeholder={`${group.label} item`} />
      <Input name="price" required type="number" step="0.01" min="0" placeholder={group.ratePlaceholder} />
      <Button type="submit">Add</Button>
    </form>
  );
}

function AdminCreateForm({ priceListId }: { priceListId: string }) {
  return (
    <form action={createPriceListItemAction.bind(null, priceListId)} className="mb-4 grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_1.2fr_0.8fr_0.7fr_auto]">
      <input type="hidden" name="itemGroup" value="admin" />
      <input type="hidden" name="itemType" value="admin" />
      <Input name="name" required placeholder="Item name" />
      <Input name="category" required defaultValue="admin_item" aria-label="Admin item category" />
      <Select name="chargeMethod" defaultValue="each">
        {CHARGE_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
      </Select>
      <Select name="measurementBasis" defaultValue="each">
        {MEASUREMENT_BASES.map((basis) => <option key={basis.value} value={basis.value}>{basis.label}</option>)}
      </Select>
      <Input name="price" required type="number" step="0.01" min="0" placeholder="Rate" />
      <Input name="sortOrder" type="number" defaultValue="0" aria-label="Sort order" />
      <Button type="submit">Add</Button>
    </form>
  );
}

function ItemEditForm({
  priceListId,
  item,
  group,
}: {
  priceListId: string;
  item: PriceListItemView;
  group: GroupConfig;
}) {
  if (group.advanced) {
    return (
      <form action={updatePriceListItemAction.bind(null, priceListId, item.id)} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="itemGroup" value="admin" />
        <input type="hidden" name="itemType" value="admin" />
        <Input name="name" defaultValue={item.name} className="w-40" aria-label={`Name for ${item.name}`} />
        <Input name="category" defaultValue={item.category} className="w-32" aria-label={`Category for ${item.name}`} />
        <Select name="chargeMethod" defaultValue={item.chargeMethod ?? 'each'} className="w-36">
          {CHARGE_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
        </Select>
        <Select name="measurementBasis" defaultValue={item.measurementBasis ?? 'each'} className="w-52">
          {MEASUREMENT_BASES.map((basis) => <option key={basis.value} value={basis.value}>{basis.label}</option>)}
        </Select>
        <Input name="price" type="number" step="0.01" min="0" defaultValue={(item.priceCents / 100).toFixed(2)} className="w-28" aria-label={`Rate for ${item.name}`} />
        <Input name="sortOrder" type="number" defaultValue={item.sortOrder} className="w-20" aria-label={`Sort order for ${item.name}`} />
        <label className="flex items-center gap-2 text-sm">
          <input name="hideOnQuote" type="checkbox" defaultChecked={item.hideOnQuote} />
          Hide
        </label>
        <Button type="submit" variant="outline">Save</Button>
      </form>
    );
  }

  return (
    <form action={updatePriceListItemAction.bind(null, priceListId, item.id)} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="itemGroup" value={group.value} />
      <input type="hidden" name="category" value={group.category} />
      <input type="hidden" name="itemType" value={group.value} />
      <input type="hidden" name="chargeMethod" value={group.chargeMethod} />
      <input type="hidden" name="measurementBasis" value={group.measurementBasis} />
      <Input name="name" defaultValue={item.name} className="w-44" aria-label={`Name for ${item.name}`} />
      <Input name="price" type="number" step="0.01" min="0" defaultValue={(item.priceCents / 100).toFixed(2)} className="w-28" aria-label={`Rate for ${item.name}`} />
      <Input name="sortOrder" type="number" defaultValue={item.sortOrder} className="w-20" aria-label={`Sort order for ${item.name}`} />
      <label className="flex items-center gap-2 text-sm">
        <input name="hideOnQuote" type="checkbox" defaultChecked={item.hideOnQuote} />
        Hide
      </label>
      <Button type="submit" variant="outline">Save</Button>
    </form>
  );
}

export default async function PriceListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getApiClientWithAuth();
  const { data: priceList, error } = await client.GET('/price-lists/{priceListId}', {
    params: { path: { priceListId: id } },
  });

  if (error || !priceList) return <div className="text-red-600">Failed to load price list: {JSON.stringify(error)}</div>;

  const isDraft = priceList.status === 'draft';
  const canEdit = priceList.status !== 'archived';
  const items = (priceList.items ?? []) as PriceListItemView[];
  const itemsByGroup = new Map<PriceListItemGroup, PriceListItemView[]>();

  for (const group of GROUPS) itemsByGroup.set(group.value, []);
  for (const item of items) itemsByGroup.get(inferItemGroup(item))?.push(item);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{priceList.name}</h2>
          <p className="text-sm text-muted-foreground">
            Revision {priceList.revision} - <span className="capitalize">{priceList.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
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
        <h3 className="text-lg font-semibold">Items</h3>

        {GROUPS.map((group) => {
          const groupItems = itemsByGroup.get(group.value) ?? [];

          return (
            <section key={group.value} className="rounded-md border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold">{group.label}</h4>
                  <p className="text-sm text-muted-foreground">{group.rateLabel} - {group.ruleLabel}</p>
                </div>
              </div>

              {canEdit && (
                group.advanced ? <AdminCreateForm priceListId={id} /> : <PresetCreateForm priceListId={id} group={group} />
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Quote</TableHead>
                      {canEdit && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 5 : 4} className="text-sm text-muted-foreground">
                          No {group.label.toLowerCase()} items yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{ruleLabelFor(item, group)}</TableCell>
                          <TableCell>{dollars(item.priceCents)}</TableCell>
                          <TableCell>{item.hideOnQuote ? 'Hidden' : 'Shown'}</TableCell>
                          {canEdit && (
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <ItemEditForm priceListId={id} item={item} group={group} />
                                <form action={deletePriceListItemAction.bind(null, id, item.id)}>
                                  <Button type="submit" variant="outline">Delete</Button>
                                </form>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          );
        })}
      </section>
    </div>
  );
}
