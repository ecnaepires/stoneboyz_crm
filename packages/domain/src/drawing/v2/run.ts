// packages/domain/src/drawing/v2/run.ts
import { EPS, MIN_EDGE_IN, type OutlineV2, type Pt } from "./types.js";
import { near, newVertexId, ptDist } from "./util.js";
import { validateOutline, type ValidateResult } from "./validate.js";

const vert = (p: Pt) => ({ vertexId: newVertexId(), xIn: p.x, yIn: p.y });

/** Clockwise rectangle (screen coords) from top-left origin. */
export function outlineFromRect(xIn: number, yIn: number, wIn: number, hIn: number): OutlineV2 {
  return {
    vertices: [
      vert({ x: xIn, y: yIn }),
      vert({ x: xIn + wIn, y: yIn }),
      vert({ x: xIn + wIn, y: yIn + hIn }),
      vert({ x: xIn, y: yIn + hIn }),
    ],
  };
}

/**
 * Trace an L/U/G counter: `points` are clicked along the BACK (wall) line,
 * axis-aligned; the counter body extends `depthIn` to the RIGHT of travel
 * (screen coords). Outline = forward along the wall, end cap, back along the
 * offset (front) line with miter corners, start cap.
 */
export function outlineFromRun(points: Pt[], depthIn: number): ValidateResult {
  if (points.length < 2) return { ok: false, error: "run needs at least 2 points" };
  if (depthIn < MIN_EDGE_IN) return { ok: false, error: 'depth must be at least 1/16"' };

  // right normal of travel per segment; reject diagonals and dwarf segments
  const offsets: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (ptDist(a, b) < MIN_EDGE_IN) return { ok: false, error: 'run segment shorter than 1/16"' };
    const horizontal = near(a.y, b.y);
    const vertical = near(a.x, b.x);
    if (!horizontal && !vertical) return { ok: false, error: "run segments must be horizontal or vertical" };
    if (horizontal) {
      offsets.push({ x: 0, y: b.x > a.x ? depthIn : -depthIn });
    } else {
      offsets.push({ x: b.y > a.y ? -depthIn : depthIn, y: 0 });
    }
  }

  // Validate that the depth fits within adjacent segment lengths at each interior corner.
  // If the miter offset exceeds either segment, the shape would be degenerate/self-intersecting.
  for (let j = 1; j < points.length - 1; j++) {
    const oj = offsets[j]!;
    const op = offsets[j - 1]!;
    // Check segment j: the offset from offsets[j-1] must fit within segment j length
    const segJLen = ptDist(points[j]!, points[j + 1]!);
    // The offset component along segment j is the magnitude of op projected onto segment j
    // The offset from segment (j-1) has a component along segment j's direction.
    // When segment j is vertical (segJDir.x ≈ 0), that component is op.y; otherwise op.x.
    const segJDir = { x: points[j + 1]!.x - points[j]!.x, y: points[j + 1]!.y - points[j]!.y };
    const opAlongJ = Math.abs(near(segJDir.x, 0) ? op.y : op.x);
    if (opAlongJ > segJLen - EPS) {
      return { ok: false, error: "depth exceeds segment length — outline would self-intersect" };
    }
    // The offset from segment j has a component along segment (j-1)'s direction.
    // When segment (j-1) is vertical, that component is oj.y; otherwise oj.x.
    const segPLen = ptDist(points[j - 1]!, points[j]!);
    const segPDir = { x: points[j]!.x - points[j - 1]!.x, y: points[j]!.y - points[j - 1]!.y };
    const ojAlongP = Math.abs(near(segPDir.x, 0) ? oj.y : oj.x);
    if (ojAlongP > segPLen - EPS) {
      return { ok: false, error: "depth exceeds segment length — outline would self-intersect" };
    }
  }

  const vertices = [...points.map(vert)];
  const last = points.length - 1;
  const oLast = offsets[offsets.length - 1]!;
  vertices.push(vert({ x: points[last]!.x + oLast.x, y: points[last]!.y + oLast.y }));
  // interior miter corners, walking backward
  for (let j = last - 1; j >= 1; j--) {
    const oj = offsets[j]!;
    const op = offsets[j - 1]!;
    vertices.push(vert({ x: points[j]!.x + oj.x + op.x, y: points[j]!.y + oj.y + op.y }));
  }
  const o0 = offsets[0]!;
  vertices.push(vert({ x: points[0]!.x + o0.x, y: points[0]!.y + o0.y }));

  // drop accidental duplicate consecutive points (collinear runs)
  const cleaned = vertices.filter((v, k) => {
    const nxt = vertices[(k + 1) % vertices.length]!;
    return ptDist({ x: v.xIn, y: v.yIn }, { x: nxt.xIn, y: nxt.yIn }) > EPS;
  });
  return validateOutline({ vertices: cleaned });
}
