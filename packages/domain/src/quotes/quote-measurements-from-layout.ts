import { chainShapeAreaSqIn, chainShapeGeometry } from '../drawing/geometry.js';
import { calculateMeasurementAreaTotals } from './quote-measurements.js';
import type {
  CounterPieceInput,
  EdgeSegmentInput,
  QuoteMeasurementAreaTotals,
  SinkCutoutInput
} from './quote-measurements.types.js';
import type {
  CanvasEdgeLayout,
  CanvasEdgeTreatment,
  CanvasLayout,
  CanvasPieceLayout,
  CanvasSinkLayout
} from './quote-drawing.types.js';

// Every drawn edge treatment except the wall edge ('unfinished') is fabricated
// and counts as finished-edge footage (see CONTEXT.md "Finished Edge"). Splash
// is handled separately because it also contributes square footage.
const FINISHED_TREATMENTS: ReadonlySet<CanvasEdgeTreatment> = new Set([
  'finished',
  'appliance',
  'mitered',
  'waterfall',
  'additionalFinished'
]);

interface PieceExtents {
  lengthIn: number; // bounding-box extent along X
  widthIn: number; // bounding-box extent along Y
}

// Bounding-box extents of a piece in inches. Edge linear footage is keyed by
// pieceId + top/right/bottom/left, which is exact for a single-segment
// rectangle. KNOWN GAP (ADR 0003 step 5): for a multi-segment chain this uses
// the bounding box, so an L/U over-reports a side's run; resolved when the edge
// tool is reshaped to address per-segment boundary edges.
function pieceExtents(piece: CanvasPieceLayout): PieceExtents | null {
  const shape = piece.shape;
  if (shape === null || shape === undefined || shape.type !== 'chain') {
    return null;
  }
  const first = shape.segments[0];
  if (first === undefined || first.lengthIn === 0) {
    return null;
  }
  const scale = first.w / first.lengthIn;
  if (scale === 0) {
    return null;
  }

  const { rects } = chainShapeGeometry(shape as Parameters<typeof chainShapeGeometry>[0]);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  if (!Number.isFinite(minX)) {
    return null;
  }

  return { lengthIn: (maxX - minX) / scale, widthIn: (maxY - minY) / scale };
}

function sideLengthIn(extents: PieceExtents, edge: CanvasEdgeLayout['edge']): number {
  return edge === 'top' || edge === 'bottom' ? extents.lengthIn : extents.widthIn;
}

// Translate one canvas edge into the domain edge inputs that reproduce its
// measurement contribution. A splash is emitted as two finished runs — the top
// run (length, which also carries the splash height for square footage) plus the
// two vertical sides (2 * height) — because its bottom touches the counter and
// its back touches the wall, so only the outline is finished.
function edgeInputs(edge: CanvasEdgeLayout, sideLengthIn: number): EdgeSegmentInput[] {
  if (edge.treatment === 'splash') {
    const height = edge.splashHeightIn ?? undefined;
    const inputs: EdgeSegmentInput[] = [
      { lengthIn: sideLengthIn, treatment: 'finished', splashHeightIn: height }
    ];
    if (height !== undefined && height > 0) {
      inputs.push({ lengthIn: 2 * height, treatment: 'finished' });
    }
    return inputs;
  }

  return [
    {
      lengthIn: sideLengthIn,
      treatment: FINISHED_TREATMENTS.has(edge.treatment) ? 'finished' : 'unfinished'
    }
  ];
}

export function measurementTotalsFromLayout(layout: CanvasLayout): QuoteMeasurementAreaTotals {
  const extentsByPiece = new Map<string, PieceExtents>();
  const pieces: CounterPieceInput[] = [];

  for (const piece of layout.pieces) {
    const shape = piece.shape;
    if (shape === null || shape === undefined || shape.type !== 'chain') {
      continue;
    }
    const areaSqIn = chainShapeAreaSqIn(shape as Parameters<typeof chainShapeAreaSqIn>[0]);
    if (areaSqIn <= 0) {
      continue;
    }
    const extents = pieceExtents(piece);
    if (extents !== null) {
      extentsByPiece.set(piece.pieceId, extents);
    }
    // Route the precomputed union area through the canonical sqft formula
    // (area / 144) by feeding it as length with unit width.
    pieces.push({
      lengthIn: areaSqIn,
      widthIn: 1,
      kind: piece.kind ?? 'countertop'
    });
  }

  const edges: EdgeSegmentInput[] = [];
  for (const edge of layout.edges) {
    const extents = extentsByPiece.get(edge.pieceId);
    if (extents === undefined) {
      continue;
    }
    edges.push(...edgeInputs(edge, sideLengthIn(extents, edge.edge)));
  }

  const sinks = layout.sinks.map(sinkToCutoutInput);

  return calculateMeasurementAreaTotals({ name: '', pieces, edges, sinks });
}

// Only quantity and faucet hole count feed the summary; sink spec fields are
// inert for measurements and carried as neutral defaults until sinks are fully
// modelled on the layout (ADR 0003).
function sinkToCutoutInput(sink: CanvasSinkLayout): SinkCutoutInput {
  return {
    sinkType: 'undermount',
    shape: 'rectangle',
    cutoutLengthIn: 0,
    cutoutWidthIn: 0,
    quantity: sink.quantity ?? 1,
    faucetHoleCount: sink.faucetHoleCount ?? 0
  };
}
