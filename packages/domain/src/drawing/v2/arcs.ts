import { EPS, MIN_EDGE_IN, type OutlineV2, type Pt } from "./types.js";
import { cross, dot, newVertexId, outwardNormal, ptAdd, ptDist, ptScale, ptSub, vecNorm } from "./util.js";
import { validateOutline, type ValidateResult } from "./validate.js";

export function circleThrough(p1: Pt, p2: Pt, p3: Pt): { center: Pt; radius: number } | null {
  const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
  if (Math.abs(d) <= EPS) return null;
  const s1 = p1.x * p1.x + p1.y * p1.y;
  const s2 = p2.x * p2.x + p2.y * p2.y;
  const s3 = p3.x * p3.x + p3.y * p3.y;
  const center = {
    x: (s1 * (p2.y - p3.y) + s2 * (p3.y - p1.y) + s3 * (p1.y - p2.y)) / d,
    y: (s1 * (p3.x - p2.x) + s2 * (p1.x - p3.x) + s3 * (p2.x - p1.x)) / d,
  };
  return { center, radius: ptDist(center, p1) };
}

function bulgeThrough(a: Pt, b: Pt, mid: Pt): number | null {
  const circ = circleThrough(a, mid, b);
  if (!circ) return null;
  const chord = ptDist(a, b);
  const sagitta = circ.radius - Math.sqrt(Math.max(0, circ.radius ** 2 - (chord / 2) ** 2));
  const chordMid = ptScale(ptAdd(a, b), 0.5);
  const midDist = ptDist(chordMid, mid);
  // handles major arcs via apex distance
  const s = midDist > circ.radius ? 2 * circ.radius - sagitta : sagitta;
  const bulgeMag = (2 * s) / chord;
  const dir = vecNorm(ptSub(b, a));
  const n = outwardNormal(dir);
  const side = dot(ptSub(mid, chordMid), n);
  return side >= 0 ? bulgeMag : -bulgeMag;
}

export function arcThroughPoints(
  outline: OutlineV2,
  edgeStartVertexId: string,
  p1: Pt,
  apex: Pt,
  p3: Pt,
): ValidateResult {
  const vs = outline.vertices;
  const i = vs.findIndex((v) => v.vertexId === edgeStartVertexId);
  if (i < 0) return { ok: false, error: `no edge starts at ${edgeStartVertexId}` };
  const a = vs[i]!;
  const b = vs[(i + 1) % vs.length]!;
  const A = { x: a.xIn, y: a.yIn };
  const B = { x: b.xIn, y: b.yIn };
  const dir = vecNorm(ptSub(B, A));
  const len = ptDist(A, B);

  const project = (p: Pt) => dot(ptSub(p, A), dir);
  let t1 = project(p1);
  let t3 = project(p3);
  let q1 = p1;
  let q3 = p3;
  if (t1 > t3) {
    [t1, t3] = [t3, t1];
    [q1, q3] = [q3, q1];
  }
  if (t1 < -EPS || t3 > len + EPS || t3 - t1 < MIN_EDGE_IN) {
    return { ok: false, error: "arc span does not land on the selected edge" };
  }
  const foot1 = ptAdd(A, ptScale(dir, t1));
  const foot3 = ptAdd(A, ptScale(dir, t3));
  const bulge = bulgeThrough(q1, q3, apex);
  if (bulge === null) return { ok: false, error: "the three points are collinear" };

  const inserted: typeof vs = [];
  if (t1 > MIN_EDGE_IN) inserted.push({ vertexId: newVertexId(), xIn: foot1.x, yIn: foot1.y });
  inserted.push({ vertexId: newVertexId(), xIn: q1.x, yIn: q1.y, bulge });
  inserted.push({ vertexId: newVertexId(), xIn: q3.x, yIn: q3.y });
  if (ptDist(foot3, q3) > MIN_EDGE_IN && len - t3 > MIN_EDGE_IN) {
    inserted.push({ vertexId: newVertexId(), xIn: foot3.x, yIn: foot3.y });
  }
  const vertices = [...vs.slice(0, i + 1), ...inserted, ...vs.slice(i + 1)];
  const deduped = vertices.filter((v, k) => {
    const nxt = vertices[(k + 1) % vertices.length]!;
    return ptDist({ x: v.xIn, y: v.yIn }, { x: nxt.xIn, y: nxt.yIn }) > EPS;
  });
  return validateOutline({ vertices: deduped });
}
