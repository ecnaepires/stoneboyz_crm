import { EPS, type PieceV2, type Pt, type VertexV2 } from "./types.js";
import { near, newVertexId } from "./util.js";
import { validateOutline } from "./validate.js";
import { resolveOutline } from "./resolve.js";

export type SeamSplitResult = { ok: true; pieces: [PieceV2, PieceV2] } | { ok: false; error: string };

type Crossing = { edgeIndex: number; pt: Pt };

export function splitPieceAtSeam(piece: PieceV2, seam: { fromIn: Pt; toIn: Pt }): SeamSplitResult {
  const vertical = near(seam.fromIn.x, seam.toIn.x);
  const horizontal = near(seam.fromIn.y, seam.toIn.y);
  if (!vertical && !horizontal) return { ok: false, error: "seam must be horizontal or vertical (v1)" };
  const coord = vertical ? seam.fromIn.x : seam.fromIn.y;

  const vs = piece.outline.vertices;
  const resolved = resolveOutline(piece.outline);
  for (const e of resolved) {
    if (e.kind !== "arc") continue;
    const lo = vertical ? e.center.x - e.radiusIn : e.center.y - e.radiusIn;
    const hi = vertical ? e.center.x + e.radiusIn : e.center.y + e.radiusIn;
    if (coord > lo - EPS && coord < hi + EPS) {
      return { ok: false, error: "seam crosses a curved edge or radius corner; move the seam" };
    }
  }

  const crossings: Crossing[] = [];
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i]!;
    const b = vs[(i + 1) % vs.length]!;
    const a1 = vertical ? a.xIn : a.yIn;
    const b1 = vertical ? b.xIn : b.yIn;
    if ((a1 < coord - EPS && b1 > coord + EPS) || (a1 > coord + EPS && b1 < coord - EPS)) {
      const t = (coord - a1) / (b1 - a1);
      crossings.push({
        edgeIndex: i,
        pt: { x: a.xIn + (b.xIn - a.xIn) * t, y: a.yIn + (b.yIn - a.yIn) * t },
      });
    }
  }
  if (crossings.length !== 2) return { ok: false, error: "seam must cross the piece exactly twice" };

  const [c1, c2] = crossings as [Crossing, Crossing];
  const cut1: VertexV2 = { vertexId: newVertexId(), xIn: c1.pt.x, yIn: c1.pt.y };
  const cut2: VertexV2 = { vertexId: newVertexId(), xIn: c2.pt.x, yIn: c2.pt.y };

  const loopA: VertexV2[] = [cut1];
  for (let k = c1.edgeIndex + 1; ; k = (k + 1) % vs.length) {
    loopA.push(vs[k % vs.length]!);
    if (k % vs.length === c2.edgeIndex) break;
  }
  loopA.push({ ...cut2 });

  const loopB: VertexV2[] = [{ ...cut2, vertexId: newVertexId() }];
  for (let k = c2.edgeIndex + 1; ; k = (k + 1) % vs.length) {
    loopB.push(vs[k % vs.length]!);
    if (k % vs.length === c1.edgeIndex) break;
  }
  loopB.push({ ...cut1, vertexId: newVertexId() });

  const va = validateOutline({ vertices: loopA });
  const vb = validateOutline({ vertices: loopB });
  if (!va.ok) return { ok: false, error: va.error };
  if (!vb.ok) return { ok: false, error: vb.error };

  const sideOf = (p: Pt) => (vertical ? p.x : p.y) <= coord;
  const splitEdges = (loopIds: Set<string>) => piece.edges.filter((e) => loopIds.has(e.startVertexId));
  const centroid = (loop: VertexV2[]) => ({
    x: loop.reduce((s, v) => s + v.xIn, 0) / loop.length,
    y: loop.reduce((s, v) => s + v.yIn, 0) / loop.length,
  });
  const aIsFirst = sideOf(centroid(loopA));
  const firstLoop = aIsFirst ? va.outline : vb.outline;
  const secondLoop = aIsFirst ? vb.outline : va.outline;
  const firstIds = new Set(firstLoop.vertices.map((v) => v.vertexId));
  const secondIds = new Set(secondLoop.vertices.map((v) => v.vertexId));

  const first: PieceV2 = {
    ...piece,
    outline: firstLoop,
    edges: splitEdges(firstIds),
    cutouts: piece.cutouts.filter((c) => sideOf(c.centerIn)),
  };
  const second: PieceV2 = {
    ...piece,
    pieceId: crypto.randomUUID(),
    label: `${piece.label} (2)`,
    outline: secondLoop,
    edges: splitEdges(secondIds),
    cutouts: piece.cutouts.filter((c) => !sideOf(c.centerIn)),
  };
  return { ok: true, pieces: [first, second] };
}
