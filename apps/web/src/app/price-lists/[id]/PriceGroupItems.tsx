import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  createPriceListItemAction,
  deletePriceListItemAction,
  updatePriceListItemAction,
} from '../_actions';
import {
  CHARGE_METHODS,
  GROUPS,
  MEASUREMENT_BASES,
  type GroupConfig,
  type PriceListItemGroup,
} from '../pricing-groups';

export type PriceListItemView = {
  id: string;
  category: string;
  itemGroup?: PriceListItemGroup;
  name: string;
  description: string | null;
  chargeMethod?: string;
  measurementBasis?: string;
  unit: string;
  priceCents: number;
  sortOrder: number;
  taxable: boolean;
  allowDiscount: boolean;
  editableOnQuote: boolean;
  hideOnQuote: boolean;
};

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const inferItemGroup = (item: PriceListItemView): PriceListItemGroup =>
  item.itemGroup ?? GROUPS.find((group) => group.category === item.category)?.value ?? 'material';

export const filterItemsByGroup = (items: PriceListItemView[], group: GroupConfig): PriceListItemView[] =>
  items.filter((item) => inferItemGroup(item) === group.value);

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
      <Input name="name" required placeholder={`${group.label} name`} />
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

export function PriceGroupItems({
  priceListId,
  group,
  items,
  canEdit,
}: {
  priceListId: string;
  group: GroupConfig;
  items: PriceListItemView[];
  canEdit: boolean;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{group.label}</h3>
        <p className="text-sm text-muted-foreground">{group.rateLabel} - {group.ruleLabel}</p>
      </div>

      {canEdit && (
        group.advanced ? <AdminCreateForm priceListId={priceListId} /> : <PresetCreateForm priceListId={priceListId} group={group} />
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
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="text-sm text-muted-foreground">
                  No {group.label.toLowerCase()} yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{ruleLabelFor(item, group)}</TableCell>
                  <TableCell>{dollars(item.priceCents)}</TableCell>
                  <TableCell>{item.hideOnQuote ? 'Hidden' : 'Shown'}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <ItemEditForm priceListId={priceListId} item={item} group={group} />
                        <form action={deletePriceListItemAction.bind(null, priceListId, item.id)}>
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
}
