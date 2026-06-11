import { EPS, MIN_EDGE_IN, type OutlineV2 } from "./types.js";
import { near, ptDist, ptSub, vecNorm } from "./util.js";
import { validateOutline, type ValidateResult } from "./validate.js";

export function setEdgeLength(
  outline: OutlineV2,
  startVertexId: string,
  lengthIn: number,
  anchor: "start" | "end",
): ValidateResult {
  if (lengthIn < MIN_EDGE_IN) return { ok: false, error: 'length must be at least 1/16"' };
  const vs = outline.vertices;
  const i = vs.findIndex((v) => v.vertexId === startVertexId);
  if (i < 0) return { ok: false, error: `no edge starts at ${startVertexId}` };
  const a = vs[i]!;
  const b = vs[(i + 1) % vs.length]!;
  const cur = ptDist({ x: a.xIn, y: a.yIn }, { x: b.xIn, y: b.yIn });
  const delta = lengthIn - cur;
  if (Math.abs(delta) <= EPS) return { ok: true, outline };

  const horizontal = near(a.yIn, b.yIn);
  const vertical = near(a.xIn, b.xIn);

  if (horizontal || vertical) {
    const axis = horizontal ? "xIn" : ("yIn" as const);
    const aPos = a[axis];
    const bPos = b[axis];
    const sign = bPos >= aPos ? 1 : -1;
    if (anchor === "start") {
      const threshold = bPos;
      const vertices = vs.map((v) =>
        sign * (v[axis] - threshold) >= -EPS ? { ...v, [axis]: v[axis] + sign * delta } : v,
      );
      return validateOutline({ vertices });
    }
    const threshold = aPos;
    const vertices = vs.map((v) =>
      sign * (v[axis] - threshold) <= EPS ? { ...v, [axis]: v[axis] - sign * delta } : v,
    );
    return validateOutline({ vertices });
  }

  const prev = vs[(i - 1 + vs.length) % vs.length]!;
  const next = vs[(i + 2) % vs.length]!;
  const u1 = vecNorm(ptSub({ x: a.xIn, y: a.yIn }, { x: prev.xIn, y: prev.yIn }));
  const u2 = vecNorm(ptSub({ x: next.xIn, y: next.yIn }, { x: b.xIn, y: b.yIn }));
  const perEndpoint = delta / Math.SQRT2;
  const vertices = vs.map((v, k) => {
    if (k === i) return { ...v, xIn: v.xIn - u1.x * perEndpoint, yIn: v.yIn - u1.y * perEndpoint };
    if (k === (i + 1) % vs.length) return { ...v, xIn: v.xIn + u2.x * perEndpoint, yIn: v.yIn + u2.y * perEndpoint };
    return v;
  });
  return validateOutline({ vertices });
}
