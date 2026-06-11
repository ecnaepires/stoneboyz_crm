// Read-side render model for angled polygon pieces (ADR 0007 + ADR 0006).
//
// The chain model can only express axis-aligned (90°) rectangles. This module is
// the read path for an arbitrary-vertex polygon: given a closed outline whose
// vertices carry stable ids, it produces the screen geometry the canvas needs to
// DRAW the piece — vertex handles, per-edge segments with their exact length and
// label anchor, and interior angles for rendering angled / radius / clip corners.
//
// TEMP CONTRACT MIRROR: `PolygonVertex` (with a stable `id`) and treatments keyed
// by vertex identity are declared here only until Codex lands Phase 1 in
// packages/domain (ADR 0007 Rules 1-3). Once the domain exports the identity-keyed
// `PolygonVertex` and `polygonEdges`, replace the mirror + local edge geometry
// with:
//     import { type PolygonVertex, polygonEdges } from "@stoneboyz/domain";
// The exported function signatures below are the stable contract and do not change
// when that swap happens. The treatment vocabularies are imported from the domain
// already (they are unchanged by ADR 0007 — only the *key* changes, not the
// values), so they are never mirrored.

import type {
  CornerLayout,
  EdgeLayout,
  Polygon,
  PolygonVertex,
} from "@stoneboyz/domain";

// Pixels per inch. Matches the canvas + regression-catalog default (scale 3).
export const DEFAULT_RENDER_SCALE = 3;

// --- Domain contract (ADR 0007) ---
// Phase 1 landed the identity-keyed model in packages/domain, so this module now
// consumes it directly — no local mirror. `PolygonVertex` carries a stable `id`;
// edge/corner treatments key by vertex identity. The view types below derive from
// the domain EdgeLayout / CornerLayout (minus `pieceId`, which the single-piece
// read/edit path does not need), so they can never drift from the persisted shape.

export type { PolygonVertex };

// A piece outline — alias of the domain Polygon.
export type RenderPolygon = Polygon;

// An edge identified by its ordered endpoint vertex ids (ADR 0007 Rule 2).
export interface EdgeIdentity {
  fromVertexId: string;
  toVertexId: string;
}

// Per-edge / per-corner treatment as the view layer consumes it: the persisted
// domain shape without pieceId. `treatment` is the full DrawingEdgeTreatment /
// DrawingCornerTreatment vocabulary (splash included).
export type EdgeTreatmentEntry = Omit<EdgeLayout, "pieceId">;
export type CornerTreatmentEntry = Omit<CornerLayout, "pieceId">;

// --- Render outputs ---

export interface RenderEdge extends EdgeIdentity {
  fromPx: [number, number];
  toPx: [number, number];
  // Exact edge length in inches, straight from the canonical vertices via the
  // hypotenuse — never derived from pixels (RC-05) and never the bounding box
  // (ADR 0006 Rule 3). Holds for any angle, and for every leg of an L or U.
  lengthIn: number;
  // Anchor for the dimension label: the edge midpoint, in pixels.
  midpointPx: [number, number];
}

export interface RenderVertex {
  id: string;
  px: [number, number];
  // Interior angle of the outline at this vertex, in degrees. 90 for a square
  // corner, !=90 for an angled run — this is what lets the canvas show and edit
  // non-rectilinear pieces, and where Radius / Clip annotations attach.
  interiorAngleDeg: number;
}

// --- Read-side geometry (pure) ---

function toPx(v: PolygonVertex, scale: number): [number, number] {
  return [v.x * scale, v.y * scale];
}

// Ordered edges of the closed ring: edge i runs from vertex i to vertex i+1, the
// last wrapping back to the first. Mirrors domain `polygonEdges`, adding the
// pixel endpoints and label anchor the canvas needs. Degenerate input (<2
// vertices) yields no edges.
export function polygonRenderEdges(
  polygon: RenderPolygon,
  scale: number = DEFAULT_RENDER_SCALE,
): RenderEdge[] {
  const { vertices } = polygon;
  if (vertices.length < 2) {
    return [];
  }
  return vertices.map((from, index) => {
    const to = vertices[(index + 1) % vertices.length] as PolygonVertex;
    const fromPx = toPx(from, scale);
    const toPx2 = toPx(to, scale);
    return {
      fromVertexId: from.id,
      toVertexId: to.id,
      fromPx,
      toPx: toPx2,
      lengthIn: Math.hypot(to.x - from.x, to.y - from.y),
      midpointPx: [(fromPx[0] + toPx2[0]) / 2, (fromPx[1] + toPx2[1]) / 2],
    };
  });
}

// SVG `points` string for the outline: "x,y x,y ..." in pixels. Feeds an
// <polygon> element. Empty for fewer than 3 vertices (nothing to fill).
export function polygonOutlinePoints(
  polygon: RenderPolygon,
  scale: number = DEFAULT_RENDER_SCALE,
): string {
  if (polygon.vertices.length < 3) {
    return "";
  }
  return polygon.vertices
    .map((v) => {
      const [px, py] = toPx(v, scale);
      return `${px},${py}`;
    })
    .join(" ");
}

// Interior angle (degrees) at vertex `b`, between incoming edge a->b and outgoing
// edge b->c. Reflex corners return >180 degrees.
function interiorAngleDeg(
  a: PolygonVertex,
  b: PolygonVertex,
  c: PolygonVertex,
  isCounterClockwise: boolean,
): number {
  const ux = a.x - b.x;
  const uy = a.y - b.y;
  const vx = c.x - b.x;
  const vy = c.y - b.y;
  const dot = ux * vx + uy * vy;
  const magU = Math.hypot(ux, uy);
  const magV = Math.hypot(vx, vy);
  if (magU === 0 || magV === 0) {
    return 0;
  }
  const cross = ux * vy - uy * vx;
  const ang = Math.atan2(cross, dot);
  let deg = (ang * 180) / Math.PI;
  if (deg < 0) {
    deg += 360;
  }
  return isCounterClockwise ? (360 - deg) % 360 : deg;
}

function signedArea(vertices: PolygonVertex[]): number {
  let sum = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const current = vertices[i] as PolygonVertex;
    const next = vertices[(i + 1) % vertices.length] as PolygonVertex;
    sum += current.x * next.y - current.y * next.x;
  }
  return sum / 2;
}

// Vertex handles in pixels, each with its interior angle for display/snapping.
export function polygonRenderVertices(
  polygon: RenderPolygon,
  scale: number = DEFAULT_RENDER_SCALE,
): RenderVertex[] {
  const { vertices } = polygon;
  if (vertices.length < 3) {
    return vertices.map((v) => ({
      id: v.id,
      px: toPx(v, scale),
      interiorAngleDeg: 0,
    }));
  }
  const isCounterClockwise = signedArea(vertices) > 0;
  return vertices.map((v, index) => {
    const prev = vertices[(index - 1 + vertices.length) % vertices.length] as PolygonVertex;
    const next = vertices[(index + 1) % vertices.length] as PolygonVertex;
    return {
      id: v.id,
      px: toPx(v, scale),
      interiorAngleDeg: interiorAngleDeg(prev, v, next, isCounterClockwise),
    };
  });
}

// Canonical, direction-tolerant key for an edge between two vertices. An edge is
// the same physical edge whether stored a->b or b->a, so treatment lookup matches
// either direction even though ADR 0007 persists the ordered pair.
export function edgeIdentityKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

// Resolve the treatment for a render edge by vertex identity. Returns undefined
// when the edge has no stored treatment (the canvas renders it as a plain/wall
// edge). Identity keying is what makes a treatment survive extend / vertex-insert
// (RC-04) instead of sliding to the wrong edge.
export function findEdgeTreatment(
  treatments: readonly EdgeTreatmentEntry[],
  edge: EdgeIdentity,
): EdgeTreatmentEntry | undefined {
  const key = edgeIdentityKey(edge.fromVertexId, edge.toVertexId);
  return treatments.find(
    (t) => edgeIdentityKey(t.fromVertexId, t.toVertexId) === key,
  );
}

// Resolve the corner treatment for a vertex by id (ADR 0007 Rule 3).
export function findCornerTreatment(
  treatments: readonly CornerTreatmentEntry[],
  vertexId: string,
): CornerTreatmentEntry | undefined {
  return treatments.find((t) => t.vertexId === vertexId);
}
