// Canonical polygon geometry (ADR 0006). A Polygon is the single source of truth
// for a piece's outline — used by both billing square footage and (future) Slab
// Layout cut-fit. Vertices are ordered (clockwise or counterclockwise) and stored
// in inches. The ring is implicitly closed: the last vertex connects back to the
// first. This module is pure: no canvas, no pixels.

export interface PolygonVertex {
  x: number;
  y: number;
}

export interface Polygon {
  vertices: PolygonVertex[];
}

// Signed twice-area via the shoelace formula. Positive for counterclockwise
// rings, negative for clockwise (in standard math axes). Useful for orientation
// checks; most callers want polygonAreaSqIn.
export function polygonSignedTwiceArea(polygon: Polygon): number {
  const { vertices } = polygon;
  let sum = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i] as PolygonVertex;
    const b = vertices[(i + 1) % vertices.length] as PolygonVertex;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum;
}

// Absolute outline area in square inches. Returns 0 for degenerate input
// (fewer than 3 vertices); validity is enforced separately by polygonValidate.
export function polygonAreaSqIn(polygon: Polygon): number {
  if (polygon.vertices.length < 3) {
    return 0;
  }
  return Math.abs(polygonSignedTwiceArea(polygon)) / 2;
}
