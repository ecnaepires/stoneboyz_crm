import Link from 'next/link';
import type { components } from '@stoneboyz/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type QuoteArea = components['schemas']['QuoteArea'];
type QuoteMeasurementAreaTotals = components['schemas']['QuoteMeasurementAreaTotals'];

export type QuoteAreaWithMeasurementTotals = QuoteArea & {
  measurementTotals: QuoteMeasurementAreaTotals;
};

interface MeasurementsCardProps {
  customerId: string;
  quoteId: string;
  areas: QuoteAreaWithMeasurementTotals[];
}

const emptyMeasurementTotals: QuoteMeasurementAreaTotals = {
  pieceCount: 0,
  countertopSqFt: 0,
  backsplashSqFt: 0,
  combinedSqFt: 0,
  finishedEdgeLinFt: 0,
  splashSqFt: 0,
  sinkCutoutCount: 0,
  faucetHoleCount: 0,
};

const measurementNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

function TotalsGrid({ totals }: { totals: QuoteMeasurementAreaTotals }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3 lg:grid-cols-6">
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Countertop</dt>
        <dd className="font-medium">{measurementNumber(totals.countertopSqFt)} sq ft</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Backsplash</dt>
        <dd className="font-medium">{measurementNumber(totals.backsplashSqFt)} sq ft</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Combined</dt>
        <dd className="font-medium">{measurementNumber(totals.combinedSqFt)} sq ft</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Finished Edge</dt>
        <dd className="font-medium">{measurementNumber(totals.finishedEdgeLinFt)} lin ft</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Splash</dt>
        <dd className="font-medium">{measurementNumber(totals.splashSqFt)} sq ft</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Pieces</dt>
        <dd className="font-medium">{measurementNumber(totals.pieceCount)}</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Sinks</dt>
        <dd className="font-medium">{measurementNumber(totals.sinkCutoutCount)}</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Faucet Holes</dt>
        <dd className="font-medium">{measurementNumber(totals.faucetHoleCount)}</dd>
      </div>
    </dl>
  );
}

// Read-only summary. Measurements come from each Sheet's drawing (ADR 0003: the
// drawing is the single source of truth). Editing happens in the Drawing
// workspace, never in this card.
export function MeasurementsCard({ customerId, quoteId, areas }: MeasurementsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Measurements</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href={`/customers/${customerId}/quotes/${quoteId}/drawing`}>Edit in Drawing</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a Sheet and draw it to see measurements. Measurements are read off the drawing.
          </p>
        ) : (
          <div className="space-y-4">
            {areas.map((area) => (
              <section key={area.id} className="space-y-3 rounded-md border p-3">
                <div>
                  <h3 className="font-medium">{area.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {[area.material, area.color, area.edgeProfile].filter(Boolean).join(' - ') || 'No area details'}
                  </p>
                </div>
                <TotalsGrid totals={area.measurementTotals ?? emptyMeasurementTotals} />
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
