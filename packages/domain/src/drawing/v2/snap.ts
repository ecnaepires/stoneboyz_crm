import { EPS, type AnnotationV2, type OutlineV2, type Pt } from "./types.js";
import { cross, ptDist, ptSub, roundIn } from "./util.js";

export type SnapKind = "intersection" | "endpoint" | "midpoint" | "edge" | "grid";
export type SnapResult = { kind: SnapKind; ptIn: Pt };

const RANK: Record<SnapKind, number> = { intersection: 0, endpoint: 1, midpoint: 2, edge: 3, grid: 4 };

type Line = { from: Pt; to: Pt };

function lineLineIntersection(a: Line, b: Line): Pt | null {
  const d1 = ptSub(a.to, a.from);
  const d2 = ptSub(b.to, b.from);
  const denom = cross(d1, d2);
  if (Math.abs(denom) <= EPS) return null;
  const t = cross(ptSub(b.from, a.from), d2) / denom;
  const u = cross(ptSub(b.from, a.from), d1) / denom;
  if (t < EPS || t > 1 - EPS || u < EPS || u > 1 - EPS) return null;
  return { x: a.from.x + d1.x * t, y: a.from.y + d1.y * t };
}

function annotationLine(a: AnnotationV2): Line | null {
  if (a.type === "label") return null;
  return { from: a.fromIn, to: a.toIn };
}

export function snapPoint(
  scene: { outlines: OutlineV2[]; annotations: AnnotationV2[] },
  raw: Pt,
  tolIn: number,
): SnapResult {
  const candidates: SnapResult[] = [];
  const lines: Line[] = [];

  for (const o of scene.outlines) {
    const vs = o.vertices;
    for (let i = 0; i < vs.length; i++) {
      const a = { x: vs[i]!.xIn, y: vs[i]!.yIn };
      const b = { x: vs[(i + 1) % vs.length]!.xIn, y: vs[(i + 1) % vs.length]!.yIn };
      lines.push({ from: a, to: b });
      candidates.push({ kind: "endpoint", ptIn: a });
      candidates.push({ kind: "midpoint", ptIn: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } });
    }
  }
  for (const ann of scene.annotations) {
    const l = annotationLine(ann);
    if (!l) continue;
    lines.push(l);
    candidates.push({ kind: "endpoint", ptIn: l.from });
    candidates.push({ kind: "endpoint", ptIn: l.to });
    candidates.push({ kind: "midpoint", ptIn: { x: (l.from.x + l.to.x) / 2, y: (l.from.y + l.to.y) / 2 } });
  }
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const p = lineLineIntersection(lines[i]!, lines[j]!);
      if (p) candidates.push({ kind: "intersection", ptIn: p });
    }
  }

  const within = candidates
    .filter((c) => ptDist(c.ptIn, raw) <= tolIn)
    .sort((l, r) => RANK[l.kind] - RANK[r.kind] || ptDist(l.ptIn, raw) - ptDist(r.ptIn, raw));
  if (within[0]) return within[0];

  return { kind: "grid", ptIn: { x: roundIn(raw.x), y: roundIn(raw.y) } };
}
