import { describe, expect, it } from "vitest";
import {
  mergeVertex,
  moveVertex,
  splitEdge,
  type PolygonEditState,
} from "./polygon-edit";
import {
  findEdgeTreatment,
  polygonRenderEdges,
  type EdgeTreatmentEntry,
} from "./polygon-render";

// Build an edge treatment with the nullable fields defaulted.
function et(
  fromVertexId: string,
  toVertexId: string,
  treatment: EdgeTreatmentEntry["treatment"],
): EdgeTreatmentEntry {
  return { fromVertexId, toVertexId, treatment, splashHeightIn: null, label: null };
}

// A 60 x 40 rectangle with a finished front edge (a->b) and a splash-less wall on
// the back (c->d), plus a radius on corner b.
function rectState(): PolygonEditState {
  return {
    polygon: {
      vertices: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 60, y: 0 },
        { id: "c", x: 60, y: 40 },
        { id: "d", x: 0, y: 40 },
      ],
    },
    edgeTreatments: [et("a", "b", "finished"), et("c", "d", "mitered")],
    cornerTreatments: [{ vertexId: "b", treatment: "radius", valueIn: 1.5 }],
  };
}

describe("moveVertex", () => {
  it("keeps a vertex id, so its edge treatment survives the move (RC-04)", () => {
    const next = moveVertex(rectState(), "b", { x: 72, y: 0 });
    const movedB = next.polygon.vertices.find((v) => v.id === "b");
    expect(movedB).toMatchObject({ x: 72, y: 0 });
    // a->b is now longer, still finished.
    const found = findEdgeTreatment(next.edgeTreatments, {
      fromVertexId: "a",
      toVertexId: "b",
    });
    expect(found?.treatment).toBe("finished");
  });

  it("is a no-op for an unknown vertex id", () => {
    const state = rectState();
    expect(moveVertex(state, "zzz", { x: 1, y: 1 })).toBe(state);
  });
});

describe("splitEdge", () => {
  it("inserts a vertex and both child edges inherit the parent treatment", () => {
    // Split the finished front edge a->b at its midpoint into a->m->b.
    const next = splitEdge(
      rectState(),
      { fromVertexId: "a", toVertexId: "b" },
      { x: 30, y: 0 },
      "m",
    );
    expect(next.polygon.vertices.map((v) => v.id)).toEqual([
      "a",
      "m",
      "b",
      "c",
      "d",
    ]);
    expect(
      findEdgeTreatment(next.edgeTreatments, {
        fromVertexId: "a",
        toVertexId: "m",
      })?.treatment,
    ).toBe("finished");
    expect(
      findEdgeTreatment(next.edgeTreatments, {
        fromVertexId: "m",
        toVertexId: "b",
      })?.treatment,
    ).toBe("finished");
    // The parent edge no longer exists as a treatment entry.
    expect(next.edgeTreatments).toHaveLength(3);
  });

  it("creates a true angled run when the split point is off the straight line", () => {
    // Push the inserted vertex outward → a->m and m->b are no longer colinear.
    const next = splitEdge(
      rectState(),
      { fromVertexId: "a", toVertexId: "b" },
      { x: 30, y: -16 },
      "m",
    );
    const edges = polygonRenderEdges(next.polygon);
    const am = edges.find((e) => e.fromVertexId === "a" && e.toVertexId === "m");
    expect(am?.lengthIn).toBeCloseTo(Math.hypot(30, 16), 6); // 34
  });

  it("adds no treatment when the split edge had none", () => {
    const next = splitEdge(
      rectState(),
      { fromVertexId: "b", toVertexId: "c" },
      { x: 60, y: 20 },
      "m",
    );
    expect(next.edgeTreatments).toHaveLength(2); // unchanged count
    expect(
      findEdgeTreatment(next.edgeTreatments, {
        fromVertexId: "b",
        toVertexId: "m",
      }),
    ).toBeUndefined();
  });

  it("is a no-op for an unknown edge", () => {
    const state = rectState();
    expect(
      splitEdge(state, { fromVertexId: "a", toVertexId: "c" }, { x: 0, y: 0 }, "m"),
    ).toBe(state);
  });
});

describe("mergeVertex", () => {
  // A pentagon so a merge stays above the triangle floor.
  function pentagon(
    treatments: PolygonEditState["edgeTreatments"] = [],
  ): PolygonEditState {
    return {
      polygon: {
        vertices: [
          { id: "a", x: 0, y: 0 },
          { id: "b", x: 40, y: 0 },
          { id: "c", x: 50, y: 20 },
          { id: "d", x: 25, y: 40 },
          { id: "e", x: 0, y: 30 },
        ],
      },
      edgeTreatments: treatments,
      cornerTreatments: [{ vertexId: "c", treatment: "clip", valueIn: 2 }],
    };
  }

  it("removes the vertex and its corner treatment", () => {
    const result = mergeVertex(pentagon(), "c");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.polygon.vertices.map((v) => v.id)).toEqual([
      "a",
      "b",
      "d",
      "e",
    ]);
    expect(result.state.cornerTreatments).toHaveLength(0);
  });

  it("keeps the treatment when only one adjacent edge had one", () => {
    const result = mergeVertex(
      pentagon([et("b", "c", "finished")]),
      "c",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      findEdgeTreatment(result.state.edgeTreatments, {
        fromVertexId: "b",
        toVertexId: "d",
      })?.treatment,
    ).toBe("finished");
  });

  it("requires an explicit choice when the two edges disagree", () => {
    const result = mergeVertex(
      pentagon([et("b", "c", "finished"), et("c", "d", "mitered")]),
      "c",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("ambiguous-merge");
    if (result.reason !== "ambiguous-merge") return;
    expect(result.candidates).toEqual(["finished", "mitered"]);
  });

  it("resolves an ambiguous merge to the caller's chosen treatment", () => {
    const result = mergeVertex(
      pentagon([et("b", "c", "finished"), et("c", "d", "mitered")]),
      "c",
      "mitered",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      findEdgeTreatment(result.state.edgeTreatments, {
        fromVertexId: "b",
        toVertexId: "d",
      })?.treatment,
    ).toBe("mitered");
  });

  it("refuses to drop below a triangle", () => {
    const tri: PolygonEditState = {
      polygon: {
        vertices: [
          { id: "a", x: 0, y: 0 },
          { id: "b", x: 30, y: 0 },
          { id: "c", x: 0, y: 40 },
        ],
      },
      edgeTreatments: [],
      cornerTreatments: [],
    };
    const result = mergeVertex(tri, "b");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("would-degenerate");
  });

  it("reports an unknown vertex", () => {
    const result = mergeVertex(pentagon(), "zzz");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("vertex-not-found");
  });
});
