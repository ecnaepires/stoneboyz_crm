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

interface PieceDimensions {
  lengthIn: number;
  widthIn: number;
}

function pieceDimensions(piece: CanvasPieceLayout): PieceDimensions | null {
  const shape = piece.shape;
  if (shape === null || shape === undefined || shape.type !== 'chain') {
    return null;
  }

  const segment = shape.segments[0];
  if (segment === undefined) {
    return null;
  }

  return { lengthIn: segment.lengthIn, widthIn: segment.widthIn };
}

function sideLengthIn(dimensions: PieceDimensions, edge: CanvasEdgeLayout['edge']): number {
  return edge === 'top' || edge === 'bottom' ? dimensions.lengthIn : dimensions.widthIn;
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
  const dimensionsByPiece = new Map<string, PieceDimensions>();
  const pieces: CounterPieceInput[] = [];

  for (const piece of layout.pieces) {
    const dimensions = pieceDimensions(piece);
    if (dimensions === null) {
      continue;
    }
    dimensionsByPiece.set(piece.pieceId, dimensions);
    pieces.push({
      lengthIn: dimensions.lengthIn,
      widthIn: dimensions.widthIn,
      kind: piece.kind ?? 'countertop'
    });
  }

  const edges: EdgeSegmentInput[] = [];
  for (const edge of layout.edges) {
    const dimensions = dimensionsByPiece.get(edge.pieceId);
    if (dimensions === undefined) {
      continue;
    }
    edges.push(...edgeInputs(edge, sideLengthIn(dimensions, edge.edge)));
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
