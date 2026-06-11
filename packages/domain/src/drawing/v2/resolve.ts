import { EPS, type OutlineV2, type Pt, type ResolvedEdge, type VertexV2 } from "./types.js";
import { cross, dot, outwardNormal, ptAdd, ptDist, ptScale, ptSub, vecNorm } from "./util.js";

type ExpandedPoint = { pt: Pt; bulgeToNext: number; sourceStartVertexId: string };

function cornerPoints(prev: VertexV2, vert: VertexV2, next: VertexV2): ExpandedPoint[] {
  const V = { x: vert.xIn, y: vert.yIn };
  const bulgeToNext = vert.bulge ?? 0;
  if (!vert.corner) return [{ pt: V, bulgeToNext, sourceStartVertexId: vert.vertexId }];

  const u1 = vecNorm(ptSub(V, { x: prev.xIn, y: prev.yIn }));
  const u2 = vecNorm(ptSub({ x: next.xIn, y: next.yIn }, V));
  const theta = Math.acos(Math.max(-1, Math.min(1, -dot(u1, u2))));

  const snap = (n: number) => Math.round(n * 1e9) / 1e9;
  if (vert.corner.type === "chamfer") {
    const s = vert.corner.valueIn;
    const A = { x: snap(V.x - u1.x * s), y: snap(V.y - u1.y * s) };
    const B = { x: snap(V.x + u2.x * s), y: snap(V.y + u2.y * s) };
    return [
      { pt: A, bulgeToNext: 0, sourceStartVertexId: vert.vertexId },
      { pt: B, bulgeToNext, sourceStartVertexId: vert.vertexId },
    ];
  }
  const r = vert.corner.valueIn;
  if (vert.corner.direction === "in") {
    const A = ptSub(V, ptScale(u1, r));
    const B = ptAdd(V, ptScale(u2, r));
    const sweep = Math.PI - theta === 0 ? Math.PI / 2 : Math.PI - theta;
    return [
      { pt: A, bulgeToNext: -Math.tan(sweep / 4), sourceStartVertexId: vert.vertexId },
      { pt: B, bulgeToNext, sourceStartVertexId: vert.vertexId },
    ];
  }
  // radius out
  const t = r / Math.tan(theta / 2);
  const A = { x: snap(V.x - u1.x * t), y: snap(V.y - u1.y * t) };
  const B = { x: snap(V.x + u2.x * t), y: snap(V.y + u2.y * t) };
  const sweep = Math.PI - theta;
  return [
    { pt: A, bulgeToNext: Math.tan(sweep / 4), sourceStartVertexId: vert.vertexId },
    { pt: B, bulgeToNext, sourceStartVertexId: vert.vertexId },
  ];
}

export function arcFromBulge(from: Pt, to: Pt, bulge: number, sourceStartVertexId: string): ResolvedEdge {
  const chord = ptDist(from, to);
  const theta = 4 * Math.atan(Math.abs(bulge));
  const radius = chord / (2 * Math.sin(theta / 2));
  const mid = ptScale(ptAdd(from, to), 0.5);
  const dir = vecNorm(ptSub(to, from));
  const n = outwardNormal(dir);
  const apothem = Math.sqrt(Math.max(0, radius * radius - (chord / 2) * (chord / 2)));
  const side = bulge > 0 ? -1 : 1;
  const centerOffset = theta > Math.PI ? -side : side;
  const center = ptAdd(mid, ptScale(n, apothem * centerOffset));
  return {
    kind: "arc",
    from,
    to,
    center,
    radiusIn: radius,
    sweep: bulge > 0 ? -theta : theta,
    sourceStartVertexId,
  };
}

export function resolveOutline(outline: OutlineV2): ResolvedEdge[] {
  const vs = outline.vertices;
  const expanded: ExpandedPoint[] = [];
  for (let i = 0; i < vs.length; i++) {
    const prev = vs[(i - 1 + vs.length) % vs.length]!;
    const next = vs[(i + 1) % vs.length]!;
    expanded.push(...cornerPoints(prev, vs[i]!, next));
  }
  const edges: ResolvedEdge[] = [];
  for (let i = 0; i < expanded.length; i++) {
    const a = expanded[i]!;
    const b = expanded[(i + 1) % expanded.length]!;
    if (ptDist(a.pt, b.pt) <= EPS) continue;
    if (Math.abs(a.bulgeToNext) <= EPS) {
      edges.push({ kind: "line", from: a.pt, to: b.pt, sourceStartVertexId: a.sourceStartVertexId });
    } else {
      edges.push(arcFromBulge(a.pt, b.pt, a.bulgeToNext, a.sourceStartVertexId));
    }
  }
  return edges;
}
