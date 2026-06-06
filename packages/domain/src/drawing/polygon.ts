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

export type PolygonValidationError =
  | 'too_few_vertices'
  | 'zero_length_edge'
  | 'zero_area'
  | 'self_intersecting';

export type PolygonValidation =
  | { ok: true }
  | { ok: false; error: PolygonValidationError };

// Reject invalid outlines at the domain boundary (ADR 0006). A valid polygon has
// at least 3 vertices, no zero-length edges, positive area, and no
// self-intersection. The ring is implicitly closed, so an explicit duplicate of
// the first vertex at the end is treated as a zero-length closing edge.
export function polygonValidate(polygon: Polygon): PolygonValidation {
  const { vertices } = polygon;

  if (vertices.length < 3) {
    return { ok: false, error: 'too_few_vertices' };
  }

  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i] as PolygonVertex;
    const b = vertices[(i + 1) % vertices.length] as PolygonVertex;
    if (a.x === b.x && a.y === b.y) {
      return { ok: false, error: 'zero_length_edge' };
    }
  }

  // Checked before area: a self-intersecting ring can have a cancelling signed
  // area of zero, which would otherwise be misreported as zero_area.
  if (hasSelfIntersection(vertices)) {
    return { ok: false, error: 'self_intersecting' };
  }

  if (polygonAreaSqIn(polygon) <= 0) {
    return { ok: false, error: 'zero_area' };
  }

  return { ok: true };
}

// True if any pair of non-adjacent edges crosses. Adjacent edges share a vertex
// by construction and are skipped, as is the wrap-around pair of the first and
// last edges.
function hasSelfIntersection(vertices: PolygonVertex[]): boolean {
  const n = vertices.length;
  for (let i = 0; i < n; i += 1) {
    const p1 = vertices[i] as PolygonVertex;
    const p2 = vertices[(i + 1) % n] as PolygonVertex;
    for (let j = i + 1; j < n; j += 1) {
      if (j === i) continue;
      // Skip edges that share a vertex with edge i (adjacent or wrap-around).
      if (j === (i + 1) % n || (j + 1) % n === i) continue;
      const p3 = vertices[j] as PolygonVertex;
      const p4 = vertices[(j + 1) % n] as PolygonVertex;
      if (segmentsProperlyIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  return false;
}

function orientation(a: PolygonVertex, b: PolygonVertex, c: PolygonVertex): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsProperlyIntersect(
  p1: PolygonVertex,
  p2: PolygonVertex,
  p3: PolygonVertex,
  p4: PolygonVertex,
): boolean {
  const d1 = orientation(p3, p4, p1);
  const d2 = orientation(p3, p4, p2);
  const d3 = orientation(p1, p2, p3);
  const d4 = orientation(p1, p2, p4);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}
