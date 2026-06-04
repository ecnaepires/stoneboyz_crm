import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiClientWithAuth } from '@/lib/api';
import { generatePricingAction, overridePricingLineAction, savePricingSelectionsAction } from '../_actions';
import type { QuoteAreaWithMeasurementTotals } from './MeasurementsCard';

type PriceListItemGroup = 'material' | 'fabrication' | 'edge' | 'sink' | 'faucet_hole' | 'splash' | 'admin';

type GeneratedPriceLine = {
  id: string;
  quoteAreaId: string;
  category: 'material' | 'fabrication' | 'finished_edge' | 'splash' | 'sink_cutout' | 'sink_item' | 'faucet_hole';
  label: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  lineTotalCents: number;
  priceListItemId: string | null;
  sortOrder: number;
  overridePriceCents: number | null;
  overrideReason: string | null;
  overrideByUserId: string | null;
  overrideAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CatalogPriceList = {
  id: string;
  name: string;
  status: string;
  items?: CatalogPriceListItem[];
};

type CatalogPriceListItem = {
  id: string;
  priceListId: string;
  itemGroup: PriceListItemGroup;
  category: string;
  name: string;
  chargeMethod: 'square_foot' | 'linear_foot' | 'each';
  measurementBasis:
    | 'countertop_sqft'
    | 'backsplash_sqft'
    | 'combined_sqft'
    | 'finished_edge_linft'
    | 'splash_sqft'
    | 'sink_count'
    | 'faucet_hole_count'
    | 'each';
  unit: string;
  priceCents: number;
  sortOrder: number;
  hideOnQuote: boolean;
  priceListName?: string;
};

type QuotePricingSelection = {
  quoteId: string;
  defaultFabricationItemId: string | null;
  sinkItemId: string | null;
  faucetHoleItemId: string | null;
  areas: Array<{
    areaId: string;
    materialItemId: string | null;
    edgeItemId: string | null;
    splashItemId: string | null;
    fabricationItemId: string | null;
  }>;
};

type PricingReadClient = {
  GET: <T>(
    path: string,
    options?: { params?: { path?: Record<string, string>; query?: Record<string, unknown> } }
  ) => Promise<{ data?: T; error?: unknown }>;
};

interface PricingCardProps {
  customerId: string;
  quoteId: string;
  areas: QuoteAreaWithMeasurementTotals[];
  isDraft: boolean;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const measurementNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const formatCategory = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const chargeLabel = (value: CatalogPriceListItem['chargeMethod']) => {
  if (value === 'square_foot') return 'sq ft';
  if (value === 'linear_foot') return 'lin ft';
  return 'each';
};

const optionLabel = (item: CatalogPriceListItem) =>
  `${item.name} - ${money(item.priceCents)} / ${chargeLabel(item.chargeMethod)}${item.priceListName ? ` (${item.priceListName})` : ''}`;

const emptySelection = (quoteId: string): QuotePricingSelection => ({
  quoteId,
  defaultFabricationItemId: null,
  sinkItemId: null,
  faucetHoleItemId: null,
  areas: [],
});

async function getAreaPricingLines(customerId: string, quoteId: string, areaId: string) {
  const client = (await getApiClientWithAuth()) as unknown as PricingReadClient;
  const { data, error } = await client.GET<GeneratedPriceLine>(
    '/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pricing',
    {
      params: { path: { customerId, quoteId, areaId } },
    }
  );

  if (error) {
    throw new Error('Failed to load generated pricing');
  }

  return (data as { data?: GeneratedPriceLine[] } | undefined)?.data ?? [];
}

async function getPricingSelection(customerId: string, quoteId: string) {
  const client = (await getApiClientWithAuth()) as unknown as PricingReadClient;
  const { data, error } = await client.GET<QuotePricingSelection>(
    '/customers/{customerId}/quotes/{quoteId}/pricing-selections',
    {
      params: { path: { customerId, quoteId } },
    }
  );

  if (error) {
    throw new Error('Failed to load pricing selections');
  }

  return data ?? emptySelection(quoteId);
}

async function getCatalogItems() {
  const client = (await getApiClientWithAuth()) as unknown as PricingReadClient;
  const { data, error } = await client.GET<{ data: CatalogPriceList[] }>('/price-lists', {
    params: { query: { limit: 50, includeArchived: false } },
  });

  if (error) {
    throw new Error('Failed to load price lists');
  }

  const priceLists = data?.data ?? [];
  const details = await Promise.all(
    priceLists.map(async (priceList) => {
      const result = await client.GET<CatalogPriceList>('/price-lists/{priceListId}', {
        params: { path: { priceListId: priceList.id } },
      });
      if (result.error) throw new Error('Failed to load price list items');
      return result.data;
    })
  );

  return details
    .flatMap((priceList) => {
      if (!priceList) return [];
      return (priceList.items ?? []).map((item) => ({
        ...item,
        priceListName: priceList.name,
      }));
    })
    .filter((item) => !item.hideOnQuote)
    .sort((a, b) => a.itemGroup.localeCompare(b.itemGroup) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function PricingCard({ customerId, quoteId, areas, isDraft }: PricingCardProps) {
  const [catalogItems, selection, lineEntries] = await Promise.all([
    getCatalogItems(),
    getPricingSelection(customerId, quoteId),
    Promise.all(areas.map(async (area) => [area.id, await getAreaPricingLines(customerId, quoteId, area.id)] as const)),
  ]);
  const linesByArea = new Map(
    lineEntries
  );
  const itemsByGroup = new Map<PriceListItemGroup, CatalogPriceListItem[]>();
  for (const group of ['material', 'fabrication', 'edge', 'sink', 'faucet_hole', 'splash'] as PriceListItemGroup[]) {
    itemsByGroup.set(group, catalogItems.filter((item) => item.itemGroup === group));
  }
  const areaSelectionById = new Map(selection.areas.map((area) => [area.areaId, area]));
  const grandTotal = Array.from(linesByArea.values()).reduce(
    (sum, lines) => sum + lines.reduce((areaSum, line) => areaSum + (line.overridePriceCents ?? line.lineTotalCents), 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add an area before generating pricing.</p>
        ) : (
          <div className="space-y-4">
            <form action={savePricingSelectionsAction.bind(null, customerId, quoteId)} className="space-y-4 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium">Pricing Setup</h3>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href="/price-lists">Manage Items</a>
                  </Button>
                  {isDraft && (
                    <Button type="submit" size="sm">
                      Save Setup
                    </Button>
                  )}
                </div>
              </div>

              {catalogItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No price items available.</p>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">Default Fabrication</span>
                      <Select name="defaultFabricationItemId" defaultValue={selection.defaultFabricationItemId ?? ''} disabled={!isDraft}>
                        <option value="">None</option>
                        {(itemsByGroup.get('fabrication') ?? []).map((item) => (
                          <option key={item.id} value={item.id}>{optionLabel(item)}</option>
                        ))}
                      </Select>
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">Sink</span>
                      <Select name="sinkItemId" defaultValue={selection.sinkItemId ?? ''} disabled={!isDraft}>
                        <option value="">None</option>
                        {(itemsByGroup.get('sink') ?? []).map((item) => (
                          <option key={item.id} value={item.id}>{optionLabel(item)}</option>
                        ))}
                      </Select>
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">Faucet Holes</span>
                      <Select name="faucetHoleItemId" defaultValue={selection.faucetHoleItemId ?? ''} disabled={!isDraft}>
                        <option value="">None</option>
                        {(itemsByGroup.get('faucet_hole') ?? []).map((item) => (
                          <option key={item.id} value={item.id}>{optionLabel(item)}</option>
                        ))}
                      </Select>
                    </label>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area</TableHead>
                          <TableHead>Measurements</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Edge</TableHead>
                          <TableHead>Splash</TableHead>
                          <TableHead>Fabrication</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {areas.map((area) => {
                          const areaSelection = areaSelectionById.get(area.id);
                          const totals = area.measurementTotals;

                          return (
                            <TableRow key={area.id}>
                              <TableCell className="font-medium">{area.name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {measurementNumber(totals.combinedSqFt)} sq ft / {measurementNumber(totals.finishedEdgeLinFt)} lin ft / {totals.sinkCutoutCount} sinks
                              </TableCell>
                              <TableCell>
                                <Select name={`area:${area.id}:materialItemId`} defaultValue={areaSelection?.materialItemId ?? ''} disabled={!isDraft} className="min-w-56">
                                  <option value="">None</option>
                                  {(itemsByGroup.get('material') ?? []).map((item) => (
                                    <option key={item.id} value={item.id}>{optionLabel(item)}</option>
                                  ))}
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select name={`area:${area.id}:edgeItemId`} defaultValue={areaSelection?.edgeItemId ?? ''} disabled={!isDraft} className="min-w-56">
                                  <option value="">None</option>
                                  {(itemsByGroup.get('edge') ?? []).map((item) => (
                                    <option key={item.id} value={item.id}>{optionLabel(item)}</option>
                                  ))}
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select name={`area:${area.id}:splashItemId`} defaultValue={areaSelection?.splashItemId ?? ''} disabled={!isDraft} className="min-w-56">
                                  <option value="">None</option>
                                  {(itemsByGroup.get('splash') ?? []).map((item) => (
                                    <option key={item.id} value={item.id}>{optionLabel(item)}</option>
                                  ))}
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select name={`area:${area.id}:fabricationItemId`} defaultValue={areaSelection?.fabricationItemId ?? ''} disabled={!isDraft} className="min-w-56">
                                  <option value="">Use default</option>
                                  {(itemsByGroup.get('fabrication') ?? []).map((item) => (
                                    <option key={item.id} value={item.id}>{optionLabel(item)}</option>
                                  ))}
                                </Select>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </form>

            {areas.map((area) => {
              const lines = linesByArea.get(area.id) ?? [];
              const areaSubtotal = lines.reduce(
                (sum, line) => sum + (line.overridePriceCents ?? line.lineTotalCents),
                0
              );

              return (
                <section key={area.id} className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium">{area.name}</h3>
                    {isDraft && (
                      <form action={generatePricingAction.bind(null, customerId, quoteId, area.id)}>
                        <Button type="submit" size="sm">
                          Generate
                        </Button>
                      </form>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Label</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Override Price</TableHead>
                          <TableHead>Line Total</TableHead>
                          {isDraft && <TableHead>Override</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isDraft ? 8 : 7} className="text-sm text-muted-foreground">
                              No generated pricing lines.
                            </TableCell>
                          </TableRow>
                        ) : (
                          lines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>{formatCategory(line.category)}</TableCell>
                              <TableCell>{line.label}</TableCell>
                              <TableCell>{line.quantity.toFixed(3)}</TableCell>
                              <TableCell>{line.unit}</TableCell>
                              <TableCell>{money(line.unitPriceCents)}</TableCell>
                              <TableCell>{line.overridePriceCents ? money(line.overridePriceCents) : '-'}</TableCell>
                              <TableCell>{money(line.overridePriceCents ?? line.lineTotalCents)}</TableCell>
                              {isDraft && (
                                <TableCell>
                                  <form
                                    action={overridePricingLineAction.bind(
                                      null,
                                      customerId,
                                      quoteId,
                                      area.id,
                                      line.id
                                    )}
                                    className="flex min-w-80 items-end gap-2"
                                  >
                                    <Input
                                      name="overridePrice"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      defaultValue={
                                        line.overridePriceCents === null ? '' : (line.overridePriceCents / 100).toFixed(2)
                                      }
                                      aria-label={`Override price for ${line.label}`}
                                      className="w-28"
                                    />
                                    <Input
                                      name="overrideReason"
                                      defaultValue={line.overrideReason ?? ''}
                                      aria-label={`Override reason for ${line.label}`}
                                      placeholder="Reason"
                                      className="w-40"
                                    />
                                    <Button type="submit" variant="outline" size="sm">
                                      Save
                                    </Button>
                                  </form>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                        <TableRow>
                          <TableCell colSpan={isDraft ? 6 : 5} className="font-medium">
                            Area Subtotal
                          </TableCell>
                          <TableCell className="font-medium">{money(areaSubtotal)}</TableCell>
                          {isDraft && <TableCell />}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </section>
              );
            })}
            <div className="flex justify-end border-t pt-4 text-sm">
              <span className="font-medium">Grand Total: {money(grandTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
