import { resolveOutline } from "./resolve.js";
import type { OutlineV2, ResolvedEdge } from "./types.js";
import { cross, ptDist } from "./util.js";

function chordPolygonArea(edges: ResolvedEdge[]): number {
  let sum = 0;
  for (const e of edges) {
    sum += cross({ x: e.from.x, y: e.from.y }, { x: e.to.x, y: e.to.y });
  }
  return sum / 2;
}

function segmentArea(e: ResolvedEdge): number {
  if (e.kind !== "arc") return 0;
  const theta = Math.abs(e.sweep);
  const seg = (e.radiusIn * e.radiusIn * (theta - Math.sin(theta))) / 2;
  return e.sweep < 0 ? seg : -seg;
}

export function outlineAreaSqIn(outline: OutlineV2): number {
  const edges = resolveOutline(outline);
  return Math.abs(chordPolygonArea(edges)) + edges.reduce((acc, e) => acc + segmentArea(e), 0);
}

export type EdgeLength = { kind: "line" | "arc"; sourceStartVertexId: string; lengthIn: number };

export function edgeLengthsIn(outline: OutlineV2): EdgeLength[] {
  return resolveOutline(outline).map((e) => ({
    kind: e.kind,
    sourceStartVertexId: e.sourceStartVertexId,
    lengthIn: e.kind === "line" ? ptDist(e.from, e.to) : e.radiusIn * Math.abs(e.sweep),
  }));
}

export function outlinePerimeterIn(outline: OutlineV2): number {
  return edgeLengthsIn(outline).reduce((acc, e) => acc + e.lengthIn, 0);
}
