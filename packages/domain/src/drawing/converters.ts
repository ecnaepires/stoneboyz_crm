// Convert legacy/current shape representations into the canonical Polygon
// (ADR 0006). These let stored chain/l/z revisions load as polygons without a
// data migration: measurement and the canvas normalize to Polygon on load.

import { chainShapeGeometry, legacyShapeToChain } from './geometry.js';
import { polygonEdges, type Polygon, type PolygonVertex } from './polygon.js';
import type {
  ChainShapeLayout,
  DrawingEdgeKey,
  LShapeLayout,
  ZShapeLayout,
} from './types.js';

const EMPTY: Polygon = { vertices: [] };

// Rect-union chain → polygon. The outline is already the union boundary in
// pixels; divide by the chain's scale (px per inch, taken from the first
// horizontal segment) to land in inches.
export function chainToPolygon(shape: ChainShapeLayout): Polygon {
  const first = shape.segments[0];
  if (!first || first.lengthIn === 0) {
    return EMPTY;
  }
  const scale = first.w / first.lengthIn;
  if (scale === 0) {
    return EMPTY;
  }

  const { outline } = chainShapeGeometry(shape);
  const vertices: PolygonVertex[] = [];
  for (let i = 0; i + 1 < outline.length; i += 2) {
    vertices.push({ x: (outline[i] as number) / scale, y: (outline[i + 1] as number) / scale });
  }
  return { vertices };
}

// Legacy l/z shapes reconstruct their full silhouette from the piece's main
// bounding box, so they need the piece dimensions. Both route through the chain
// converter (legacyShapeToChain already retires l/z into rect-union chains).
export function lShapeToPolygon(
  shape: LShapeLayout,
  piece: { lengthIn: number; widthIn: number },
  scale = 3,
): Polygon {
  return chainToPolygon(legacyShapeToChain(shape, piece, scale));
}

export function zShapeToPolygon(
  shape: ZShapeLayout,
  piece: { lengthIn: number; widthIn: number },
  scale = 3,
): Polygon {
  return chainToPolygon(legacyShapeToChain(shape, piece, scale));
}

const EPSILON = 1e-6;

// Translate a legacy named side (top/right/bottom/left) into the index of the
// polygon edge that lies on that side of the bounding box. Used to carry edge
// treatments stored against the old four-side model onto the per-segment polygon
// edges on load. Canvas Y grows downward, so "top" is the minimum Y. When a side
// has more than one edge (an L/U leg), the longest one wins. Returns null when no
// axis-aligned edge sits on that side.
export function mapLegacyEdgeToPolygonIndex(
  polygon: Polygon,
  side: DrawingEdgeKey,
): number | null {
  const edges = polygonEdges(polygon);
  if (edges.length === 0) {
    return null;
  }

  const xs = polygon.vertices.map((v) => v.x);
  const ys = polygon.vertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const near = (a: number, b: number) => Math.abs(a - b) < EPSILON;
  const isHorizontal = (e: (typeof edges)[number]) => near(e.from.y, e.to.y);
  const isVertical = (e: (typeof edges)[number]) => near(e.from.x, e.to.x);

  const onSide = edges.filter((e) => {
    switch (side) {
      case 'top':
        return isHorizontal(e) && near(e.from.y, minY);
      case 'bottom':
        return isHorizontal(e) && near(e.from.y, maxY);
      case 'left':
        return isVertical(e) && near(e.from.x, minX);
      case 'right':
        return isVertical(e) && near(e.from.x, maxX);
    }
  });

  if (onSide.length === 0) {
    return null;
  }

  return onSide.reduce((longest, e) => (e.lengthIn > longest.lengthIn ? e : longest)).index;
}
