import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiClientWithAuth } from '@/lib/api';
import { generatePricingAction, overridePricingLineAction } from '../_actions';
import type { QuoteAreaWithMeasurementTotals } from './MeasurementsCard';

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

type PricingReadClient = {
  GET: <T>(
    path: string,
    options: { params: { path: Record<string, string> } }
  ) => Promise<{ data?: { data: T[] }; error?: unknown }>;
};

interface PricingCardProps {
  customerId: string;
  quoteId: string;
  areas: QuoteAreaWithMeasurementTotals[];
  isDraft: boolean;
  hasPriceList: boolean;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const formatCategory = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

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

  return data?.data ?? [];
}

export async function PricingCard({ customerId, quoteId, areas, isDraft, hasPriceList }: PricingCardProps) {
  const linesByArea = new Map(
    hasPriceList
      ? await Promise.all(
          areas.map(async (area) => [area.id, await getAreaPricingLines(customerId, quoteId, area.id)] as const)
        )
      : []
  );
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
        ) : !hasPriceList ? (
          <p className="text-sm text-muted-foreground">Assign a price list to this quote to generate pricing.</p>
        ) : (
          <div className="space-y-4">
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
