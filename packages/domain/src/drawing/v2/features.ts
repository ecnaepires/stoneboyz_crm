import { EPS, MIN_EDGE_IN, type OutlineV2 } from "./types.js";
import { newVertexId, outwardNormal, ptAdd, ptDist, ptScale, ptSub, vecNorm } from "./util.js";
import { validateOutline, type ValidateResult } from "./validate.js";

function insertRectangularFeature(
  outline: OutlineV2,
  edgeStartVertexId: string,
  startOffsetIn: number,
  widthIn: number,
  projectionIn: number,
): ValidateResult {
  const vs = outline.vertices;
  const i = vs.findIndex((v) => v.vertexId === edgeStartVertexId);
  if (i < 0) return { ok: false, error: `no edge starts at ${edgeStartVertexId}` };
  if (widthIn < MIN_EDGE_IN || Math.abs(projectionIn) < MIN_EDGE_IN) {
    return { ok: false, error: 'width and projection must be at least 1/16"' };
  }
  const a = vs[i]!;
  const b = vs[(i + 1) % vs.length]!;
  const A = { x: a.xIn, y: a.yIn };
  const B = { x: b.xIn, y: b.yIn };
  const len = ptDist(A, B);
  if (startOffsetIn < -EPS || startOffsetIn + widthIn > len + EPS) {
    return { ok: false, error: "feature span exceeds the edge" };
  }
  const dir = vecNorm(ptSub(B, A));
  const n = outwardNormal(dir);
  const p0 = ptAdd(A, ptScale(dir, startOffsetIn));
  const p1 = ptAdd(p0, ptScale(n, projectionIn));
  const p2 = ptAdd(p1, ptScale(dir, widthIn));
  const p3 = ptAdd(p0, ptScale(dir, widthIn));
  const inserted = [p0, p1, p2, p3].map((p) => ({ vertexId: newVertexId(), xIn: p.x, yIn: p.y }));
  const vertices = [...vs.slice(0, i + 1), ...inserted, ...vs.slice(i + 1)].filter((v, k, arr) => {
    const nxt = arr[(k + 1) % arr.length]!;
    return ptDist({ x: v.xIn, y: v.yIn }, { x: nxt.xIn, y: nxt.yIn }) > EPS;
  });
  return validateOutline({ vertices });
}

export function addBumpOut(
  outline: OutlineV2,
  edgeStartVertexId: string,
  startOffsetIn: number,
  widthIn: number,
  projectionIn: number,
): ValidateResult {
  return insertRectangularFeature(outline, edgeStartVertexId, startOffsetIn, widthIn, Math.abs(projectionIn));
}

export function addNotch(
  outline: OutlineV2,
  edgeStartVertexId: string,
  startOffsetIn: number,
  widthIn: number,
  depthIn: number,
): ValidateResult {
  return insertRectangularFeature(outline, edgeStartVertexId, startOffsetIn, widthIn, -Math.abs(depthIn));
}
