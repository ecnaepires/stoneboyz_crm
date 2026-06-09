// Pure edit engine for angled polygon pieces (ADR 0007 Rule 4).
//
// These are the authoring primitives the canvas wires UI gestures to: drag a
// vertex, split an edge to draw an angle/notch, merge a vertex away. They operate
// on plain data and return new data — no React, no canvas, no mutation — so the
// edit semantics are proven in tests before any UI exists.
//
// Identity is everything (ADR 0007): treatments key by vertex id, so an edit
// preserves a treatment by preserving the ids it points at, never by position.
// This is the structural reason treatments cannot slide to the wrong edge
// (RC-04). It operates on the domain-derived types from polygon-render, so it
// stays in lockstep with the persisted EdgeLayout / CornerLayout shape.

import {
  edgeIdentityKey,
  type CornerTreatmentEntry,
  type EdgeIdentity,
  type EdgeTreatmentEntry,
  type RenderPolygon,
} from "./polygon-render";

// The edge-treatment vocabulary, taken straight from the domain-derived entry so
// it stays in lockstep with the persisted EdgeLayout (full DrawingEdgeTreatment).
type EdgeTreatmentValue = EdgeTreatmentEntry["treatment"];

export interface Point {
  x: number;
  y: number;
}

// The full editable piece: outline plus the treatments attached to its edges and
// corners. Edits keep all three in sync.
export interface PolygonEditState {
  polygon: RenderPolygon;
  edgeTreatments: EdgeTreatmentEntry[];
  cornerTreatments: CornerTreatmentEntry[];
}

// Merge can fail in three ways that the caller must handle; success carries the
// new state. `ambiguous-merge` is a user decision (ADR 0007 Rule 4), not a bug:
// the two edges disagree and the caller must pick which treatment survives.
export type PolygonEditResult =
  | { ok: true; state: PolygonEditState }
  | { ok: false; reason: "vertex-not-found" }
  | { ok: false; reason: "would-degenerate" }
  | { ok: false; reason: "ambiguous-merge"; candidates: [EdgeTreatmentValue, EdgeTreatmentValue] };

function sameEdge(a: EdgeIdentity, b: EdgeIdentity): boolean {
  return (
    edgeIdentityKey(a.fromVertexId, a.toVertexId) ===
    edgeIdentityKey(b.fromVertexId, b.toVertexId)
  );
}

// --- Move (drag / extend) ---

// Move one vertex to new coordinates. Its id is unchanged, so every edge and
// corner treatment that referenced it still does — extending or dragging a run
// keeps its treatment (RC-04). Unknown id is a safe no-op.
export function moveVertex(
  state: PolygonEditState,
  vertexId: string,
  point: Point,
): PolygonEditState {
  let found = false;
  const vertices = state.polygon.vertices.map((v) => {
    if (v.id !== vertexId) {
      return v;
    }
    found = true;
    return { ...v, x: point.x, y: point.y };
  });
  if (!found) {
    return state;
  }
  return { ...state, polygon: { vertices } };
}

// --- Split (draw an angle / notch into a run) ---

// Insert `newVertexId` at `point` on the edge, turning one edge into two. Per ADR
// 0007 Rule 4, both child edges inherit the parent edge's treatment. The new
// vertex has no corner treatment. Unknown edge is a safe no-op. The caller owns
// id generation (ids are never reused).
export function splitEdge(
  state: PolygonEditState,
  edge: EdgeIdentity,
  point: Point,
  newVertexId: string,
): PolygonEditState {
  const { vertices } = state.polygon;
  const n = vertices.length;
  let insertAt = -1;
  for (let i = 0; i < n; i += 1) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % n]!;
    if (sameEdge({ fromVertexId: a.id, toVertexId: b.id }, edge)) {
      insertAt = i + 1;
      break;
    }
  }
  if (insertAt === -1) {
    return state;
  }

  const a = vertices[insertAt - 1]!;
  const b = vertices[insertAt % n]!;
  const newVertices = [
    ...vertices.slice(0, insertAt),
    { id: newVertexId, x: point.x, y: point.y },
    ...vertices.slice(insertAt),
  ];

  const parentKey = edgeIdentityKey(a.id, b.id);
  const parent = state.edgeTreatments.find(
    (t) => edgeIdentityKey(t.fromVertexId, t.toVertexId) === parentKey,
  );
  const rest = state.edgeTreatments.filter(
    (t) => edgeIdentityKey(t.fromVertexId, t.toVertexId) !== parentKey,
  );
  const children: EdgeTreatmentEntry[] = parent
    ? [
        { ...parent, fromVertexId: a.id, toVertexId: newVertexId },
        { ...parent, fromVertexId: newVertexId, toVertexId: b.id },
      ]
    : [];

  return {
    polygon: { vertices: newVertices },
    edgeTreatments: [...rest, ...children],
    cornerTreatments: state.cornerTreatments,
  };
}

// --- Merge (remove a vertex) ---

function mergedEntry(
  treatment: EdgeTreatmentValue,
  source: EdgeTreatmentEntry | undefined,
  fromId: string,
  toId: string,
): EdgeTreatmentEntry {
  return {
    fromVertexId: fromId,
    toVertexId: toId,
    treatment,
    splashHeightIn: source?.splashHeightIn ?? null,
    label: source?.label ?? null,
  };
}

// Remove a vertex, merging its two adjacent edges into one (ADR 0007 Rule 4):
// - both edges untreated → merged edge untreated;
// - exactly one treated → merged edge keeps it;
// - both same treatment → kept;
// - both treated differently → returns `ambiguous-merge` unless `resolution` is
//   given; never silently picks one.
// The removed vertex's corner treatment is dropped. Cannot drop below a triangle.
export function mergeVertex(
  state: PolygonEditState,
  vertexId: string,
  resolution?: EdgeTreatmentValue | null,
): PolygonEditResult {
  const { vertices } = state.polygon;
  const n = vertices.length;
  const idx = vertices.findIndex((v) => v.id === vertexId);
  if (idx === -1) {
    return { ok: false, reason: "vertex-not-found" };
  }
  if (n <= 3) {
    return { ok: false, reason: "would-degenerate" };
  }

  const prev = vertices[(idx - 1 + n) % n]!;
  const next = vertices[(idx + 1) % n]!;
  const leftKey = edgeIdentityKey(prev.id, vertexId);
  const rightKey = edgeIdentityKey(vertexId, next.id);
  const left = state.edgeTreatments.find(
    (t) => edgeIdentityKey(t.fromVertexId, t.toVertexId) === leftKey,
  );
  const right = state.edgeTreatments.find(
    (t) => edgeIdentityKey(t.fromVertexId, t.toVertexId) === rightKey,
  );
  const lt = left?.treatment;
  const rt = right?.treatment;

  let merged: EdgeTreatmentEntry | null;
  if (resolution !== undefined) {
    const source = left?.treatment === resolution ? left : right;
    merged =
      resolution === null
        ? null
        : mergedEntry(resolution, source, prev.id, next.id);
  } else if (lt === undefined && rt === undefined) {
    merged = null;
  } else if (lt !== undefined && rt === undefined) {
    merged = { ...left!, fromVertexId: prev.id, toVertexId: next.id };
  } else if (rt !== undefined && lt === undefined) {
    merged = { ...right!, fromVertexId: prev.id, toVertexId: next.id };
  } else if (lt === rt) {
    merged = { ...left!, fromVertexId: prev.id, toVertexId: next.id };
  } else {
    return { ok: false, reason: "ambiguous-merge", candidates: [lt!, rt!] };
  }

  const restEdges = state.edgeTreatments.filter((t) => {
    const k = edgeIdentityKey(t.fromVertexId, t.toVertexId);
    return k !== leftKey && k !== rightKey;
  });

  return {
    ok: true,
    state: {
      polygon: { vertices: vertices.filter((v) => v.id !== vertexId) },
      edgeTreatments: merged ? [...restEdges, merged] : restEdges,
      cornerTreatments: state.cornerTreatments.filter(
        (c) => c.vertexId !== vertexId,
      ),
    },
  };
}
