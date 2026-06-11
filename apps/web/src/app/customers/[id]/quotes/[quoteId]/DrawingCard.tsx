import { getApiClientWithAuth } from '@/lib/api';
import type { DrawingPiece, DrawingSink, CanvasLayout, DrawingRevisionSummary } from './DrawingCanvasInner';
import type { QuoteAreaWithMeasurementTotals } from './MeasurementsCard';
import { DrawingWorkspaceShell } from './DrawingWorkspaceShell';
import type { DrawingWorkspaceAreaData } from './DrawingWorkspaceShell';

interface DrawingCardProps {
  customerId: string;
  quoteId: string;
  areas: QuoteAreaWithMeasurementTotals[];
  isDraft: boolean;
}

type MeasurementClient = {
  GET: <T>(path: string, options: { params: { path: Record<string, string> } }) => Promise<{ data?: { data: T[] }; error?: unknown }>;
};

type DrawingClient = {
  GET: <T>(path: string, options: { params: { path: Record<string, string> } }) => Promise<{ data?: { data: T }; error?: unknown }>;
};

async function getAreaDrawingData(customerId: string, quoteId: string, areaId: string) {
  const rawClient = await getApiClientWithAuth();
  const client = rawClient as unknown as MeasurementClient;
  const drawingClient = rawClient as unknown as DrawingClient;

  const [piecesRes, sinksRes, drawingRes, revisionsRes] = await Promise.all([
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
  ]);

  const pieces = (piecesRes.data?.data ?? []) as DrawingPiece[];
  const sinks = (sinksRes.data?.data ?? []) as DrawingSink[];
  const latestRevision = drawingRes.data?.data ?? null;
  const revisions = revisionsRes.data?.data ?? [];
  const initialLayout = latestRevision?.layout ?? null;

  return { pieces, sinks, initialLayout, latestRevision, revisions };
}

export async function DrawingCard({
  customerId,
  quoteId,
  areas,
  isDraft,
}: DrawingCardProps) {
  const workspaceAreas: DrawingWorkspaceAreaData[] = await Promise.all(
    areas.map(async (area) => ({
      area,
      ...(await getAreaDrawingData(customerId, quoteId, area.id)),
    }))
  );

  return (
    <DrawingWorkspaceShell
      customerId={customerId}
      quoteId={quoteId}
      areas={workspaceAreas}
      isDraft={isDraft}
    />
  );
}
