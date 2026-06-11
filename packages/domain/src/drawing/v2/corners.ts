import { EPS, type OutlineV2 } from "./types.js";
import { cross, newVertexId, ptAdd, ptDist, ptScale, ptSub, vecNorm } from "./util.js";
import { validateOutline, type ValidateResult } from "./validate.js";

function vertexIndex(outline: OutlineV2, vertexId: string): number {
  return outline.vertices.findIndex((v) => v.vertexId === vertexId);
}

function adjacentEdgeLengths(outline: OutlineV2, i: number): { prevLen: number; nextLen: number } {
  const vs = outline.vertices;
  const prev = vs[(i - 1 + vs.length) % vs.length]!;
  const cur = vs[i]!;
  const next = vs[(i + 1) % vs.length]!;
  return {
    prevLen: ptDist({ x: prev.xIn, y: prev.yIn }, { x: cur.xIn, y: cur.yIn }),
    nextLen: ptDist({ x: cur.xIn, y: cur.yIn }, { x: next.xIn, y: next.yIn }),
  };
}

export function filletCorner(
  outline: OutlineV2,
  vertexId: string,
  type: "radius" | "chamfer" | "sharp",
  valueIn: number,
  direction: "out" | "in",
): ValidateResult {
  const i = vertexIndex(outline, vertexId);
  if (i < 0) return { ok: false, error: `unknown vertex ${vertexId}` };
  if (type === "sharp") {
    const vertices = outline.vertices.map((v, k) => {
      if (k !== i) return v;
      const { corner: _c, ...rest } = v;
      return rest;
    });
    return validateOutline({ vertices });
  }
  if (valueIn <= 0) return { ok: false, error: "corner value must be positive" };
  if (type === "chamfer" && direction === "in") {
    return { ok: false, error: "inward direction applies to radius corners only" };
  }
  const { prevLen, nextLen } = adjacentEdgeLengths(outline, i);
  if (valueIn >= prevLen - EPS || valueIn >= nextLen - EPS) {
    return { ok: false, error: `value ${valueIn}" does not fit the adjacent edges` };
  }
  const vertices = outline.vertices.map((v, k) =>
    k === i ? { ...v, corner: { type, valueIn, direction } } : v,
  );
  return validateOutline({ vertices });
}

export function fullRadiusEdge(outline: OutlineV2, startVertexId: string): ValidateResult {
  const i = vertexIndex(outline, startVertexId);
  if (i < 0) return { ok: false, error: `no edge starts at ${startVertexId}` };
  const vertices = outline.vertices.map((v, k) => (k === i ? { ...v, bulge: 1 } : v));
  return validateOutline({ vertices });
}

export function cornerToAngle(
  outline: OutlineV2,
  vertexId: string,
  angleDeg: number,
  runLengthIn: number,
): ValidateResult {
  const i = vertexIndex(outline, vertexId);
  if (i < 0) return { ok: false, error: `unknown vertex ${vertexId}` };
  if (runLengthIn <= 0) return { ok: false, error: "diagonal length must be positive" };
  const vs = outline.vertices;
  const prev = vs[(i - 1 + vs.length) % vs.length]!;
  const cur = vs[i]!;
  const next = vs[(i + 1) % vs.length]!;
  const V = { x: cur.xIn, y: cur.yIn };
  const u1 = vecNorm(ptSub(V, { x: prev.xIn, y: prev.yIn }));
  const u2 = vecNorm(ptSub({ x: next.xIn, y: next.yIn }, V));
  const phi = (angleDeg * Math.PI) / 180;
  const s1 = runLengthIn * Math.sin(phi);
  const s2 = runLengthIn * Math.cos(phi);
  const { prevLen, nextLen } = adjacentEdgeLengths(outline, i);
  if (s1 >= prevLen - EPS || s2 >= nextLen - EPS) {
    return { ok: false, error: "diagonal does not fit the adjacent edges" };
  }
  const A = ptSub(V, ptScale(u1, s1));
  const B = ptAdd(V, ptScale(u2, s2));
  const inserted = [
    { vertexId: newVertexId(), xIn: A.x, yIn: A.y },
    { vertexId: newVertexId(), xIn: B.x, yIn: B.y, ...(cur.bulge !== undefined ? { bulge: cur.bulge } : {}) },
  ];
  const vertices = [...vs.slice(0, i), ...inserted, ...vs.slice(i + 1)];
  return validateOutline({ vertices });
}

export function cornerTo90(outline: OutlineV2, diagStartVertexId: string): ValidateResult {
  const i = vertexIndex(outline, diagStartVertexId);
  if (i < 0) return { ok: false, error: `no edge starts at ${diagStartVertexId}` };
  const vs = outline.vertices;
  const j = (i + 1) % vs.length;
  const prev = vs[(i - 1 + vs.length) % vs.length]!;
  const A = vs[i]!;
  const B = vs[j]!;
  const next = vs[(j + 1) % vs.length]!;
  const d1 = ptSub({ x: A.xIn, y: A.yIn }, { x: prev.xIn, y: prev.yIn });
  const d2 = ptSub({ x: next.xIn, y: next.yIn }, { x: B.xIn, y: B.yIn });
  const denom = cross(d1, d2);
  if (Math.abs(denom) <= EPS) return { ok: false, error: "adjacent edges are parallel; cannot restore corner" };
  const diff = ptSub({ x: B.xIn, y: B.yIn }, { x: prev.xIn, y: prev.yIn });
  const t = cross(diff, d2) / denom;
  const Vx = prev.xIn + d1.x * t;
  const Vy = prev.yIn + d1.y * t;
  const corner = { vertexId: newVertexId(), xIn: Vx, yIn: Vy, ...(B.bulge !== undefined ? { bulge: B.bulge } : {}) };
  const vertices = vs.filter((_, k) => k !== i && k !== j);
  vertices.splice(Math.min(i, vertices.length), 0, corner);
  return validateOutline({ vertices });
}
