import type {
  EdgeSegmentInput,
  MeasurementRounding,
  QuoteMeasurementAreaInput,
  QuoteMeasurementAreaTotals,
  QuoteMeasurementTotals
} from './quote-measurements.types.js';

const INCHES_PER_FOOT = 12;
const SQUARE_INCHES_PER_SQUARE_FOOT = 144;
const SIXTEENTH_INCH = 1 / 16;

export function roundInches(value: number, rounding: MeasurementRounding = 'nearest_1_16'): number {
  assertFiniteNonNegative(value, 'value');

  if (rounding === 'none') {
    return value;
  }

  return roundToPrecision(Math.round(value / SIXTEENTH_INCH) * SIXTEENTH_INCH, 4);
}

export function calculateCountertopSqFt(lengthIn: number, widthIn: number, quantity = 1): number {
  assertPositive(lengthIn, 'lengthIn');
  assertPositive(widthIn, 'widthIn');
  assertPositive(quantity, 'quantity');

  return roundToPrecision((lengthIn * widthIn * quantity) / SQUARE_INCHES_PER_SQUARE_FOOT, 3);
}

export function calculateLinearFeet(lengthIn: number): number {
  assertPositive(lengthIn, 'lengthIn');
  return roundToPrecision(lengthIn / INCHES_PER_FOOT, 3);
}

export function calculateSplashSqFt(edge: EdgeSegmentInput): number {
  assertPositive(edge.lengthIn, 'lengthIn');

  if (edge.splashHeightIn === undefined) {
    return 0;
  }

  assertPositive(edge.splashHeightIn, 'splashHeightIn');
  return roundToPrecision((edge.lengthIn * edge.splashHeightIn) / SQUARE_INCHES_PER_SQUARE_FOOT, 3);
}

export function calculateMeasurementAreaTotals(area: QuoteMeasurementAreaInput): QuoteMeasurementAreaTotals {
  const pieces = area.pieces;
  const edges = area.edges ?? [];
  const sinks = area.sinks ?? [];

  return {
    pieceCount: pieces.reduce((total, piece) => total + (piece.quantity ?? 1), 0),
    countertopSqFt: sumRounded(
      pieces.map((piece) => calculateCountertopSqFt(piece.lengthIn, piece.widthIn, piece.quantity ?? 1))
    ),
    finishedEdgeLinFt: sumRounded(
      edges
        .filter((edge) => edge.treatment === 'finished')
        .map((edge) => calculateLinearFeet(edge.lengthIn))
    ),
    splashSqFt: sumRounded(edges.map(calculateSplashSqFt)),
    sinkCutoutCount: sinks.reduce((total, sink) => total + (sink.quantity ?? 1), 0),
    faucetHoleCount: sinks.reduce(
      (total, sink) => total + (sink.quantity ?? 1) * (sink.faucetHoleCount ?? 0),
      0
    )
  };
}

export function calculateMeasurementTotals(areas: QuoteMeasurementAreaInput[]): QuoteMeasurementTotals {
  const areaTotals = areas.map(calculateMeasurementAreaTotals);

  return {
    areaCount: areas.length,
    pieceCount: areaTotals.reduce((total, area) => total + area.pieceCount, 0),
    countertopSqFt: sumRounded(areaTotals.map((area) => area.countertopSqFt)),
    finishedEdgeLinFt: sumRounded(areaTotals.map((area) => area.finishedEdgeLinFt)),
    splashSqFt: sumRounded(areaTotals.map((area) => area.splashSqFt)),
    sinkCutoutCount: areaTotals.reduce((total, area) => total + area.sinkCutoutCount, 0),
    faucetHoleCount: areaTotals.reduce((total, area) => total + area.faucetHoleCount, 0)
  };
}

const sumRounded = (values: number[]): number =>
  roundToPrecision(values.reduce((total, value) => total + value, 0), 3);

const roundToPrecision = (value: number, precision: number): number => {
  const multiplier = 10 ** precision;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

function assertPositive(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
}

function assertFiniteNonNegative(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
}
