import { describe, expect, it } from 'vitest';
import {
  chainToPolygon,
  lShapeToPolygon,
  mapLegacyEdgeToPolygonIndex,
  zShapeToPolygon
} from './converters.js';
import { chainShapeAreaSqIn, legacyShapeToChain } from './geometry.js';
import { polygonAreaSqIn, polygonEdges, polygonValidate } from './polygon.js';
import type { ChainShapeLayout, DrawingEdgeKey } from './types.js';

const SCALE = 3;

const rectChain: ChainShapeLayout = {
  type: 'chain',
  segments: [
    { x: 0, y: 0, w: 50 * SCALE, h: 25 * SCALE, lengthIn: 50, widthIn: 25, orientation: 'horizontal' },
    { x: 50 * SCALE, y: 0, w: 50 * SCALE, h: 25 * SCALE, lengthIn: 50, widthIn: 25, orientation: 'horizontal' }
  ]
};

const lChain: ChainShapeLayout = {
  type: 'chain',
  segments: [
    { x: 0, y: 0, w: 100 * SCALE, h: 25 * SCALE, lengthIn: 100, widthIn: 25, orientation: 'horizontal' },
    { x: 0, y: 25 * SCALE, w: 25 * SCALE, h: 50 * SCALE, lengthIn: 25, widthIn: 50, orientation: 'vertical' }
  ]
};

const uChain: ChainShapeLayout = {
  type: 'chain',
  segments: [
    { x: 0, y: 30 * SCALE, w: 60 * SCALE, h: 10 * SCALE, lengthIn: 60, widthIn: 10, orientation: 'horizontal' },
    { x: 0, y: 0, w: 10 * SCALE, h: 40 * SCALE, lengthIn: 40, widthIn: 10, orientation: 'vertical' },
    { x: 50 * SCALE, y: 0, w: 10 * SCALE, h: 40 * SCALE, lengthIn: 40, widthIn: 10, orientation: 'vertical' }
  ]
};

describe('chainToPolygon', () => {
  it('preserves area for a rectangle', () => {
    expect(polygonAreaSqIn(chainToPolygon(rectChain))).toBeCloseTo(chainShapeAreaSqIn(rectChain), 3);
    expect(polygonAreaSqIn(chainToPolygon(rectChain))).toBe(2500);
  });

  it('preserves the union area for an L (not the bounding box)', () => {
    expect(polygonAreaSqIn(chainToPolygon(lChain))).toBeCloseTo(chainShapeAreaSqIn(lChain), 3);
    expect(polygonAreaSqIn(chainToPolygon(lChain))).toBe(3750);
  });

  it('preserves the union area for a U', () => {
    expect(polygonAreaSqIn(chainToPolygon(uChain))).toBeCloseTo(chainShapeAreaSqIn(uChain), 3);
    expect(polygonAreaSqIn(chainToPolygon(uChain))).toBe(1200);
  });

  it('returns an empty polygon for a degenerate chain', () => {
    expect(chainToPolygon({ type: 'chain', segments: [] })).toEqual({ vertices: [] });
  });
});

describe('mapLegacyEdgeToPolygonIndex', () => {
  const rect = chainToPolygon(rectChain);

  it('maps each named side to a distinct edge lying on that side of the bounds', () => {
    const edges = polygonEdges(rect);
    const sides: DrawingEdgeKey[] = ['top', 'right', 'bottom', 'left'];
    const indices = sides.map((side) => mapLegacyEdgeToPolygonIndex(rect, side));

    // every side resolves and they are all distinct
    expect(indices.every((i) => i !== null)).toBe(true);
    expect(new Set(indices).size).toBe(4);

    // top edge is horizontal at min Y; left edge is vertical at min X
    const ys = rect.vertices.map((v) => v.y);
    const xs = rect.vertices.map((v) => v.x);
    const topEdge = edges[indices[0] as number];
    const leftEdge = edges[indices[3] as number];
    expect(topEdge?.from.y).toBeCloseTo(Math.min(...ys), 6);
    expect(topEdge?.to.y).toBeCloseTo(Math.min(...ys), 6);
    expect(leftEdge?.from.x).toBeCloseTo(Math.min(...xs), 6);
    expect(leftEdge?.to.x).toBeCloseTo(Math.min(...xs), 6);
  });

  it('top and bottom map to the 100in runs, left and right to the 25in runs', () => {
    const edges = polygonEdges(rect);
    expect(edges[mapLegacyEdgeToPolygonIndex(rect, 'top') as number]?.lengthIn).toBe(100);
    expect(edges[mapLegacyEdgeToPolygonIndex(rect, 'bottom') as number]?.lengthIn).toBe(100);
    expect(edges[mapLegacyEdgeToPolygonIndex(rect, 'left') as number]?.lengthIn).toBe(25);
    expect(edges[mapLegacyEdgeToPolygonIndex(rect, 'right') as number]?.lengthIn).toBe(25);
  });

  it('returns null when the polygon is empty', () => {
    expect(mapLegacyEdgeToPolygonIndex({ vertices: [] }, 'top')).toBeNull();
  });
});

describe('lShapeToPolygon', () => {
  // 120x60 main body with a 25.5x40 notch removed at bottom-left.
  const piece = { lengthIn: 120, widthIn: 60 };
  const lShape = { type: 'l' as const, legX: 0, legY: 0, legWidthIn: 25.5, legLengthIn: 40 };

  it('produces a valid polygon whose area matches the legacy chain (main minus notch)', () => {
    const polygon = lShapeToPolygon(lShape, piece);
    expect(polygonValidate(polygon)).toEqual({ ok: true });
    expect(polygonAreaSqIn(polygon)).toBeCloseTo(
      chainShapeAreaSqIn(legacyShapeToChain(lShape, piece, 3)),
      3
    );
    // Legacy converter's silhouette for this L is 6690 sqin (the notch height
    // is the body below the leg, not the full leg length).
    expect(polygonAreaSqIn(polygon)).toBe(6690);
  });
});

describe('zShapeToPolygon', () => {
  const piece = { lengthIn: 60, widthIn: 100 };
  const zShape = {
    type: 'z' as const,
    legX: piece.lengthIn * 3 - 25.5 * 3,
    legY: piece.widthIn * 3 - 30 * 3,
    legWidthIn: 25.5,
    legLengthIn: 30,
    tailX: 0,
    tailY: -30 * 3,
    tailLengthIn: 30,
    tailWidthIn: 25.5
  };

  it('produces a valid polygon whose area matches the legacy chain', () => {
    const polygon = zShapeToPolygon(zShape, piece);
    expect(polygonValidate(polygon)).toEqual({ ok: true });
    expect(polygonAreaSqIn(polygon)).toBeCloseTo(
      chainShapeAreaSqIn(legacyShapeToChain(zShape, piece, 3)),
      3
    );
  });
});
