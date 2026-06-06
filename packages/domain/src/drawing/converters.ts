// Convert legacy/current shape representations into the canonical Polygon
// (ADR 0006). These let stored chain/l/z revisions load as polygons without a
// data migration: measurement and the canvas normalize to Polygon on load.

import { chainShapeGeometry } from './geometry.js';
import type { Polygon, PolygonVertex } from './polygon.js';
import type { ChainShapeLayout } from './types.js';

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
