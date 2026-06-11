import { EPS, type OutlineV2, type Pt } from "./types.js";
import { cross, dot, ptDist, ptSub, vecNorm } from "./util.js";

export type HitResult =
  | { kind: "vertex"; vertexId: string }
  | { kind: "edge"; startVertexId: string; atIn: Pt }
  | { kind: "inside" }
  | { kind: "outside" };

export function extendLineToBoundary(
  outline: OutlineV2,
  line: { fromIn: Pt; toIn: Pt },
): { fromIn: Pt; toIn: Pt } | null {
  const dir = vecNorm(ptSub(line.toIn, line.fromIn));
  let bestT = Infinity;
  let bestPt: Pt | null = null;
  const vs = outline.vertices;
  for (let i = 0; i < vs.length; i++) {
    const a = { x: vs[i]!.xIn, y: vs[i]!.yIn };
    const b = { x: vs[(i + 1) % vs.length]!.xIn, y: vs[(i + 1) % vs.length]!.yIn };
    const edgeDir = ptSub(b, a);
    const denom = cross(dir, edgeDir);
    if (Math.abs(denom) <= EPS) continue;
    const t = cross(ptSub(a, line.fromIn), edgeDir) / denom;
    const u = cross(ptSub(a, line.fromIn), dir) / denom;
    const beyondTick = ptDist(line.fromIn, line.toIn);
    if (t > beyondTick + EPS && u >= -EPS && u <= 1 + EPS && t < bestT) {
      bestT = t;
      bestPt = { x: line.fromIn.x + dir.x * t, y: line.fromIn.y + dir.y * t };
    }
  }
  if (!bestPt) return null;
  return { fromIn: line.fromIn, toIn: bestPt };
}

export function pointInOutline(outline: OutlineV2, p: Pt): boolean {
  const vs = outline.vertices;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i]!.xIn;
    const yi = vs[i]!.yIn;
    const xj = vs[j]!.xIn;
    const yj = vs[j]!.yIn;
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function hitTest(outline: OutlineV2, p: Pt, tolIn: number): HitResult {
  for (const v of outline.vertices) {
    if (ptDist({ x: v.xIn, y: v.yIn }, p) <= tolIn) return { kind: "vertex", vertexId: v.vertexId };
  }
  const vs = outline.vertices;
  for (let i = 0; i < vs.length; i++) {
    const a = { x: vs[i]!.xIn, y: vs[i]!.yIn };
    const b = { x: vs[(i + 1) % vs.length]!.xIn, y: vs[(i + 1) % vs.length]!.yIn };
    const ab = ptSub(b, a);
    const len = ptDist(a, b);
    const t = Math.max(0, Math.min(1, dot(ptSub(p, a), ab) / (len * len)));
    const proj = { x: a.x + ab.x * t, y: a.y + ab.y * t };
    if (ptDist(proj, p) <= tolIn) return { kind: "edge", startVertexId: vs[i]!.vertexId, atIn: proj };
  }
  return pointInOutline(outline, p) ? { kind: "inside" } : { kind: "outside" };
}
