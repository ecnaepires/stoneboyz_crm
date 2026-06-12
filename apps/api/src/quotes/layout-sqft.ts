import {
  drawingV2,
  measurementTotalsFromLayout,
  type CanvasChainShapeLayout,
  type CanvasLayout,
  type QuoteMeasurementAreaTotals,
} from '@stoneboyz/domain';

const EMPTY_TOTALS: QuoteMeasurementAreaTotals = {
  pieceCount: 0,
  countertopSqFt: 0,
  backsplashSqFt: 0,
  combinedSqFt: 0,
  finishedEdgeLinFt: 0,
  splashSqFt: 0,
  sinkCutoutCount: 0,
  faucetHoleCount: 0,
};

const RECTANGLE_SHAPE_SCALE = 3;

const rectangleChainShape = (lengthIn: number, widthIn: number): CanvasChainShapeLayout => {
  const halfLengthIn = lengthIn / 2;
  return {
    type: 'chain',
    segments: [
      { x: 0, y: 0, w: halfLengthIn * RECTANGLE_SHAPE_SCALE, h: widthIn * RECTANGLE_SHAPE_SCALE, lengthIn: halfLengthIn, widthIn, orientation: 'horizontal' },
      { x: halfLengthIn * RECTANGLE_SHAPE_SCALE, y: 0, w: halfLengthIn * RECTANGLE_SHAPE_SCALE, h: widthIn * RECTANGLE_SHAPE_SCALE, lengthIn: halfLengthIn, widthIn, orientation: 'horizontal' },
    ],
  };
};

const parseV1Layout = (value: CanvasLayout | string): CanvasLayout | null => {
  const parsed = (() => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value) as unknown; } catch { return null; }
  })();

  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as { pieces?: unknown }).pieces)) {
    return null;
  }
  if ((parsed as { schemaVersion?: unknown }).schemaVersion === 2) {
    return null;
  }
  return parsed as CanvasLayout;
};

export type CounterPieceRow = {
  quote_area_id: string;
  id: string;
  length_in: number | string;
  width_in: number | string;
  kind: string;
};

export type LayoutRow = {
  quote_area_id: string;
  layout: CanvasLayout | string;
};

export function computeAreaTotals(
  layoutRows: LayoutRow[],
  counterPieceRows: CounterPieceRow[],
): Map<string, QuoteMeasurementAreaTotals> {
  const totals = new Map<string, QuoteMeasurementAreaTotals>();

  const counterPiecesByArea = new Map<string, Map<string, CounterPieceRow>>();
  for (const piece of counterPieceRows) {
    const areaPieces = counterPiecesByArea.get(piece.quote_area_id) ?? new Map<string, CounterPieceRow>();
    areaPieces.set(piece.id, piece);
    counterPiecesByArea.set(piece.quote_area_id, areaPieces);
  }

  for (const row of layoutRows) {
    const rawLayout = typeof row.layout === 'string'
      ? (() => { try { return JSON.parse(row.layout) as unknown; } catch { return null; } })()
      : row.layout as unknown;

    if (rawLayout && typeof rawLayout === 'object' && (rawLayout as { schemaVersion?: number }).schemaVersion === 2) {
      const parsed = drawingV2.layoutV2Schema.safeParse(rawLayout);
      totals.set(
        row.quote_area_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsed.success ? drawingV2.quoteAreaTotalsFromLayoutV2(parsed.data as any) : { ...EMPTY_TOTALS },
      );
      continue;
    }

    const layout = parseV1Layout(row.layout);
    if (layout === null) continue;

    const piecesById = counterPiecesByArea.get(row.quote_area_id) ?? new Map<string, CounterPieceRow>();
    const augmentedLayout: CanvasLayout = {
      ...layout,
      pieces: layout.pieces.map((piece) => {
        const cp = piecesById.get(piece.pieceId);
        if (!cp) return piece;
        return {
          ...piece,
          kind: piece.kind ?? (cp.kind === 'backsplash' ? 'backsplash' : 'countertop'),
          shape: piece.shape ?? rectangleChainShape(Number(cp.length_in), Number(cp.width_in)),
        };
      }),
    };

    totals.set(row.quote_area_id, measurementTotalsFromLayout(augmentedLayout));
  }

  return totals;
}
