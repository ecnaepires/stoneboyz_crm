import { calculateMeasurementAreaTotals } from './quote-measurements.js';
import type {
  CounterPieceInput,
  EdgeSegmentInput,
  EdgeTreatment,
  QuoteMeasurementAreaTotals,
  SinkCutoutInput
} from './quote-measurements.types.js';
import type {
  CanvasEdgeLayout,
  CanvasLayout,
  CanvasPieceLayout,
  CanvasSinkLayout
} from './quote-drawing.types.js';

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

function edgeTreatment(treatment: CanvasEdgeLayout['treatment']): EdgeTreatment {
  return treatment === 'finished' ? 'finished' : 'unfinished';
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
    edges.push({
      lengthIn: sideLengthIn(dimensions, edge.edge),
      treatment: edgeTreatment(edge.treatment),
      splashHeightIn: edge.splashHeightIn ?? undefined
    });
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
