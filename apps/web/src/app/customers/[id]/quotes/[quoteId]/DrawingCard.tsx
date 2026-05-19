import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApiClientWithAuth } from '@/lib/api';
import { DrawingCanvasInner } from './DrawingCanvasInner';
import type { DrawingPiece, DrawingSink, CanvasLayout, DrawingRevisionSummary } from './DrawingCanvasInner';
import type { QuoteAreaWithMeasurementTotals } from './MeasurementsCard';

interface DrawingCardProps {
  customerId: string;
  quoteId: string;
  areas: QuoteAreaWithMeasurementTotals[];
  isDraft: boolean;
  hasPriceList: boolean;
  standalone?: boolean;
}

type MeasurementClient = {
  GET: <T>(path: string, options: { params: { path: Record<string, string> } }) => Promise<{ data?: { data: T[] }; error?: unknown }>;
};

type PricingLine = {
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

type DrawingClient = {
  GET: <T>(path: string, options: { params: { path: Record<string, string> } }) => Promise<{ data?: { data: T }; error?: unknown }>;
};

async function getAreaDrawingData(customerId: string, quoteId: string, areaId: string, hasPriceList: boolean) {
  const rawClient = await getApiClientWithAuth();
  const client = rawClient as unknown as MeasurementClient;
  const drawingClient = rawClient as unknown as DrawingClient;
  const pricingClient = rawClient as unknown as MeasurementClient;

  const [piecesRes, sinksRes, drawingRes, revisionsRes, pricingRes] = await Promise.all([
    client.GET<DrawingPiece>('/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces', {
      params: { path: { customerId, quoteId, areaId } },
    }),
    client.GET<DrawingSink>('/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/sinks', {
      params: { path: { customerId, quoteId, areaId } },
    }),
    drawingClient.GET<DrawingRevisionSummary | null>(
      '/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/drawing',
      {
        params: { path: { customerId, quoteId, areaId } },
      }
    ),
    drawingClient.GET<DrawingRevisionSummary[]>(
      '/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/drawing/revisions',
      {
        params: { path: { customerId, quoteId, areaId } },
      }
    ),
    hasPriceList
      ? pricingClient.GET<PricingLine>('/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pricing', {
          params: { path: { customerId, quoteId, areaId } },
        })
      : Promise.resolve({ data: { data: [] as PricingLine[] } }),
  ]);

  const pieces = (piecesRes.data?.data ?? []) as DrawingPiece[];
  const sinks = (sinksRes.data?.data ?? []) as DrawingSink[];
  const latestRevision = drawingRes.data?.data ?? null;
  const revisions = revisionsRes.data?.data ?? [];
  const pricingLines = pricingRes.data?.data ?? [];
  const initialLayout = latestRevision?.layout ?? null;

  return { pieces, sinks, initialLayout, latestRevision, revisions, pricingLines };
}

export async function DrawingCard({
  customerId,
  quoteId,
  areas,
  isDraft,
  hasPriceList,
  standalone = false,
}: DrawingCardProps) {
  const dataByArea = new Map(
    await Promise.all(
      areas.map(async (area) => [area.id, await getAreaDrawingData(customerId, quoteId, area.id, hasPriceList)] as const)
    )
  );

  const body = areas.length === 0 ? (
    <p className="text-sm text-muted-foreground">Add an area before using the drawing canvas.</p>
  ) : (
    <div className="space-y-6">
      {areas.map((area) => {
        const data = dataByArea.get(area.id) ?? {
          pieces: [],
          sinks: [],
          initialLayout: null,
          latestRevision: null,
          revisions: [],
          pricingLines: [],
        };

        return (
          <section key={area.id} className="space-y-2">
            <h3 className="font-medium">{area.name}</h3>
            {isDraft || data.pieces.length > 0 ? (
              <DrawingCanvasInner
                customerId={customerId}
                quoteId={quoteId}
                areaId={area.id}
                area={area}
                pieces={data.pieces}
                sinks={data.sinks}
                initialLayout={data.initialLayout}
                latestRevision={data.latestRevision}
                revisions={data.revisions}
                pricingLines={data.pricingLines}
                hasPriceList={hasPriceList}
                isDraft={isDraft}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No counter pieces have been drawn for this area.</p>
            )}
          </section>
        );
      })}
    </div>
  );

  if (standalone) {
    return <div className="space-y-6">{body}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Drawing</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href={`/customers/${customerId}/quotes/${quoteId}/drawing`}>Open Drawing Workspace</Link>
        </Button>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
