import { MIN_EDGE_IN, type OutlineV2 } from "./types.js";
import { outwardNormal, ptDist, ptSub, vecNorm } from "./util.js";
import { validateOutline, type ValidateResult } from "./validate.js";

export function offsetEdge(outline: OutlineV2, startVertexId: string, distanceIn: number): ValidateResult {
  const vs = outline.vertices;
  const i = vs.findIndex((v) => v.vertexId === startVertexId);
  if (i < 0) return { ok: false, error: `no edge starts at vertex ${startVertexId}` };
  const j = (i + 1) % vs.length;
  const a = vs[i]!;
  const b = vs[j]!;
  const dir = vecNorm(ptSub({ x: b.xIn, y: b.yIn }, { x: a.xIn, y: a.yIn }));
  const n = outwardNormal(dir);
  const moved = vs.map((v, idx) =>
    idx === i || idx === j ? { ...v, xIn: v.xIn + n.x * distanceIn, yIn: v.yIn + n.y * distanceIn } : v,
  );
  const merged: typeof moved = [];
  for (let k = 0; k < moved.length; k++) {
    const cur = moved[k]!;
    const nxt = moved[(k + 1) % moved.length]!;
    if (ptDist({ x: cur.xIn, y: cur.yIn }, { x: nxt.xIn, y: nxt.yIn }) < MIN_EDGE_IN) {
      continue;
    }
    merged.push(cur);
  }
  const cleaned = merged.filter((cur, k) => {
    const prev = merged[(k - 1 + merged.length) % merged.length]!;
    const nxt = merged[(k + 1) % merged.length]!;
    const crossV =
      (cur.xIn - prev.xIn) * (nxt.yIn - cur.yIn) - (cur.yIn - prev.yIn) * (nxt.xIn - cur.xIn);
    return Math.abs(crossV) > 1e-9 || cur.corner !== undefined || cur.bulge !== undefined;
  });
  return validateOutline({ vertices: cleaned });
}
