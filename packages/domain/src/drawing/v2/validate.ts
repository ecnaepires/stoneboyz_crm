import { EPS, MIN_EDGE_IN, type OutlineV2, type Pt } from "./types.js";
import { cross, ptDist, ptSub } from "./util.js";

export type ValidateResult = { ok: true; outline: OutlineV2 } | { ok: false; error: string };

export function shoelaceArea(outline: OutlineV2): number {
  const vs = outline.vertices;
  let sum = 0;
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i]!;
    const b = vs[(i + 1) % vs.length]!;
    sum += a.xIn * b.yIn - b.xIn * a.yIn;
  }
  return sum / 2;
}

function segmentsIntersect(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  const d1 = ptSub(p2, p1);
  const d2 = ptSub(q2, q1);
  const denom = cross(d1, d2);
  if (Math.abs(denom) <= EPS) return false;
  const t = cross(ptSub(q1, p1), d2) / denom;
  const u = cross(ptSub(q1, p1), d1) / denom;
  return t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS;
}

export function validateOutline(outline: OutlineV2): ValidateResult {
  const vs = outline.vertices;
  if (vs.length < 3) return { ok: false, error: "outline needs at least 3 vertices" };

  const ids = new Set(vs.map((v) => v.vertexId));
  if (ids.size !== vs.length) return { ok: false, error: "duplicate vertex ids" };

  for (let i = 0; i < vs.length; i++) {
    const a = vs[i]!;
    const b = vs[(i + 1) % vs.length]!;
    const len = ptDist({ x: a.xIn, y: a.yIn }, { x: b.xIn, y: b.yIn });
    if (len < MIN_EDGE_IN - EPS) {
      return { ok: false, error: `edge at vertex ${a.vertexId} is shorter than 1/16"` };
    }
  }

  for (let i = 0; i < vs.length; i++) {
    for (let j = i + 1; j < vs.length; j++) {
      if (j === i || (i === 0 && j === vs.length - 1) || j === i + 1) continue;
      const p1 = { x: vs[i]!.xIn, y: vs[i]!.yIn };
      const p2 = { x: vs[(i + 1) % vs.length]!.xIn, y: vs[(i + 1) % vs.length]!.yIn };
      const q1 = { x: vs[j]!.xIn, y: vs[j]!.yIn };
      const q2 = { x: vs[(j + 1) % vs.length]!.xIn, y: vs[(j + 1) % vs.length]!.yIn };
      if (segmentsIntersect(p1, p2, q1, q2)) {
        return { ok: false, error: "outline self-intersects" };
      }
    }
  }

  const area = shoelaceArea(outline);
  if (Math.abs(area) <= EPS) return { ok: false, error: "outline has zero area" };
  if (area < 0) {
    const reversed = [...vs].reverse();
    const fixed = reversed.map((v: typeof reversed[number], i: number) => {
      const prevInNew = reversed[(i + 1) % reversed.length]!;
      const { bulge: _bulge, ...rest } = v;
      if (prevInNew.bulge !== undefined) return { ...rest, bulge: -prevInNew.bulge };
      return rest;
    });
    return { ok: true, outline: { vertices: fixed } };
  }
  return { ok: true, outline };
}
