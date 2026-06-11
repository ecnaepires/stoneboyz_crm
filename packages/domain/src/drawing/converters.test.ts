import { describe, expect, it } from 'vitest';
import {
  chainToPolygon,
  lShapeToPolygon,
  mapLegacyEdgeToPolygonIndex,
  mergeEdgeLayouts,
  splitEdgeLayout,
  zShapeToPolygon
} from './converters.js';
import { chainShapeAreaSqIn, legacyShapeToChain } from './geometry.js';
import { polygonAreaSqIn, polygonEdges, polygonValidate } from './polygon.js';
import type { ChainShapeLayout, DrawingEdgeKey, EdgeLayout } from './types.js';

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

  it('assigns stable vertex ids when normalizing legacy chains', () => {
    const polygon = chainToPolygon(lChain);
    expect(polygon.vertices.map((vertex) => vertex.id)).toEqual(
      polygon.vertices.map((_, index) => `legacy-v${index}`)
    );
    expect(new Set(polygon.vertices.map((vertex) => vertex.id)).size).toBe(polygon.vertices.length);
    expect(polygonEdges(polygon)[0]).toMatchObject({
      fromVertexId: polygon.vertices[0]?.id,
      toVertexId: polygon.vertices[1]?.id
    });
  });
});

describe('mapLegacyEdgeToPolygonIndex', () => {
  const rect = chainToPolygon(rectChain);

  it('maps each named side to a distinct edge lying on that side of the bounds', () => {
    const edges = polygonEdges(rect);
    const sides: DrawingEdgeKey[] = ['top', 'right', 'bottom', 'left'];
    const identities = sides.map((side) => mapLegacyEdgeToPolygonIndex(rect, side));
    const indices = identities.map((identity) =>
      identity === null
        ? null
        : edges.findIndex(
            (edge) =>
              edge.fromVertexId === identity.fromVertexId &&
              edge.toVertexId === identity.toVertexId
          )
    );

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
    const edgeForSide = (side: DrawingEdgeKey) => {
      const identity = mapLegacyEdgeToPolygonIndex(rect, side);
      return edges.find(
        (edge) =>
          edge.fromVertexId === identity?.fromVertexId &&
          edge.toVertexId === identity?.toVertexId
      );
    };
    expect(edgeForSide('top')?.lengthIn).toBe(100);
    expect(edgeForSide('bottom')?.lengthIn).toBe(100);
    expect(edgeForSide('left')?.lengthIn).toBe(25);
    expect(edgeForSide('right')?.lengthIn).toBe(25);
  });

  it('returns null when the polygon is empty', () => {
    expect(mapLegacyEdgeToPolygonIndex({ vertices: [] }, 'top')).toBeNull();
  });

  it('maps a legacy L-shape side treatment to the exact polygon edge identity', () => {
    const polygon = chainToPolygon(lChain);
    const topIdentity = mapLegacyEdgeToPolygonIndex(polygon, 'top');
    const topEdge = polygonEdges(polygon).find(
      (edge) =>
        edge.fromVertexId === topIdentity?.fromVertexId &&
        edge.toVertexId === topIdentity?.toVertexId
    );

    expect(topIdentity).not.toBeNull();
    expect(topEdge?.lengthIn).toBe(100);
    expect(topEdge?.from.y).toBe(0);
    expect(topEdge?.to.y).toBe(0);
  });
});

describe('polygon treatment identity', () => {
  it('keys angled polygon edge treatments by ordered vertex identity', () => {
    const polygon = {
      vertices: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 50, y: 0 },
        { id: 'c', x: 60, y: 10 },
        { id: 'd', x: 0, y: 25 }
      ]
    };
    const treatments: EdgeLayout[] = [
      {
        pieceId: 'piece-1',
        fromVertexId: 'b',
        toVertexId: 'c',
        treatment: 'finished',
        splashHeightIn: null,
        label: null
      },
      {
        pieceId: 'piece-1',
        fromVertexId: 'c',
        toVertexId: 'd',
        treatment: 'splash',
        splashHeightIn: 4,
        label: null
      }
    ];

    const edges = polygonEdges(polygon);
    expect(
      treatments.map((treatment) =>
        edges.find(
          (edge) =>
            edge.fromVertexId === treatment.fromVertexId &&
            edge.toVertexId === treatment.toVertexId
        )?.lengthIn
      )
    ).toEqual([Math.hypot(10, 10), Math.hypot(60, 15)]);
  });

  it('splits edge treatments onto both child edges without moving sibling treatments', () => {
    const parent: EdgeLayout = {
      pieceId: 'piece-1',
      fromVertexId: 'a',
      toVertexId: 'b',
      treatment: 'finished',
      splashHeightIn: null,
      label: null
    };
    const sibling: EdgeLayout = {
      pieceId: 'piece-1',
      fromVertexId: 'b',
      toVertexId: 'c',
      treatment: 'splash',
      splashHeightIn: 4,
      label: null
    };

    expect([...splitEdgeLayout(parent, 'new'), sibling]).toEqual([
      { ...parent, toVertexId: 'new' },
      { ...parent, fromVertexId: 'new' },
      sibling
    ]);
  });

  it('requires an explicit treatment choice when merged edges differ', () => {
    const first: EdgeLayout = {
      pieceId: 'piece-1',
      fromVertexId: 'a',
      toVertexId: 'b',
      treatment: 'finished',
      splashHeightIn: null,
      label: null
    };
    const second: EdgeLayout = {
      pieceId: 'piece-1',
      fromVertexId: 'b',
      toVertexId: 'c',
      treatment: 'splash',
      splashHeightIn: 4,
      label: null
    };

    expect(mergeEdgeLayouts(first, second)).toEqual({
      ok: false,
      error: 'treatment_choice_required'
    });
    expect(mergeEdgeLayouts(first, second, 'finished')).toEqual({
      ok: true,
      edge: {
        pieceId: 'piece-1',
        fromVertexId: 'a',
        toVertexId: 'c',
        treatment: 'finished',
        splashHeightIn: null,
        label: null
      }
    });
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
