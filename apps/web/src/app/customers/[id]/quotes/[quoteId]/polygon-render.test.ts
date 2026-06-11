import { describe, expect, it } from "vitest";
import {
  DEFAULT_RENDER_SCALE,
  edgeIdentityKey,
  findCornerTreatment,
  findEdgeTreatment,
  polygonOutlinePoints,
  polygonRenderEdges,
  polygonRenderVertices,
  type CornerTreatmentEntry,
  type EdgeTreatmentEntry,
  type RenderPolygon,
} from "./polygon-render";

// Helper: build a polygon from [id, xIn, yIn] tuples.
function poly(...vs: Array<[string, number, number]>): RenderPolygon {
  return { vertices: vs.map(([id, x, y]) => ({ id, x, y })) };
}

describe("polygonRenderEdges", () => {
  it("returns one edge per side, closing the ring", () => {
    // 96in x 25.5in rectangle.
    const p = poly(
      ["a", 0, 0],
      ["b", 96, 0],
      ["c", 96, 25.5],
      ["d", 0, 25.5],
    );
    const edges = polygonRenderEdges(p);
    expect(edges).toHaveLength(4);
    expect(edges[0]).toMatchObject({ fromVertexId: "a", toVertexId: "b" });
    expect(edges[3]).toMatchObject({ fromVertexId: "d", toVertexId: "a" });
  });

  it("measures each edge exactly in inches, not from the bounding box", () => {
    // L-shape: 6 vertices. The two long legs are 60 and 40; an L billed by
    // bounding box would mis-report these (ADR 0006 Rule 3). Every leg exact.
    const p = poly(
      ["a", 0, 0],
      ["b", 60, 0],
      ["c", 60, 20],
      ["d", 25, 20],
      ["e", 25, 40],
      ["f", 0, 40],
    );
    const edges = polygonRenderEdges(p);
    expect(edges).toHaveLength(6);
    expect(edges.map((e) => e.lengthIn)).toEqual([60, 20, 35, 20, 25, 40]);
  });

  it("measures angled (non-90°) edges by true length", () => {
    // Right triangle 3-4-5: the hypotenuse is the angled run.
    const p = poly(["a", 0, 0], ["b", 30, 0], ["c", 0, 40]);
    const edges = polygonRenderEdges(p);
    const hyp = edges.find(
      (e) => e.fromVertexId === "b" && e.toVertexId === "c",
    );
    expect(hyp?.lengthIn).toBeCloseTo(50, 6);
  });

  it("scales pixels and anchors the label at the edge midpoint", () => {
    const p = poly(["a", 0, 0], ["b", 10, 0], ["c", 0, 10]);
    const [first] = polygonRenderEdges(p, DEFAULT_RENDER_SCALE);
    expect(first?.fromPx).toEqual([0, 0]);
    expect(first?.toPx).toEqual([30, 0]); // 10in * scale 3
    expect(first?.midpointPx).toEqual([15, 0]);
  });

  it("returns no edges for degenerate input", () => {
    expect(polygonRenderEdges(poly(["a", 0, 0]))).toHaveLength(0);
  });
});

describe("polygonRenderVertices", () => {
  it("reports 90° interior angles for a rectangle", () => {
    const p = poly(["a", 0, 0], ["b", 10, 0], ["c", 10, 5], ["d", 0, 5]);
    const verts = polygonRenderVertices(p);
    for (const v of verts) {
      expect(v.interiorAngleDeg).toBeCloseTo(90, 6);
    }
  });

  it("reports the true angle at an angled corner", () => {
    // Right triangle: the angle at the right-angle vertex is 90, and the
    // 3-4-5 acute corner at 'b' is atan(30/40) ≈ 36.87°.
    const p = poly(["a", 0, 0], ["b", 40, 0], ["c", 0, 30]);
    const verts = polygonRenderVertices(p);
    const a = verts.find((v) => v.id === "a");
    const b = verts.find((v) => v.id === "b");
    expect(a?.interiorAngleDeg).toBeCloseTo(90, 6);
    expect(b?.interiorAngleDeg).toBeCloseTo(36.8699, 3);
  });
});

describe("identity-keyed treatment lookup (ADR 0007)", () => {
  const edgeTreatments: EdgeTreatmentEntry[] = [
    {
      fromVertexId: "a",
      toVertexId: "b",
      treatment: "finished",
      splashHeightIn: null,
      label: "front",
    },
    {
      fromVertexId: "c",
      toVertexId: "d",
      treatment: "mitered",
      splashHeightIn: null,
      label: null,
    },
  ];

  it("matches an edge regardless of stored direction", () => {
    // Same physical edge, queried b->a; still resolves.
    const found = findEdgeTreatment(edgeTreatments, {
      fromVertexId: "b",
      toVertexId: "a",
    });
    expect(found?.treatment).toBe("finished");
  });

  it("survives vertex reordering — treatment stays on the same edge identity", () => {
    // Simulate an edit that reindexes vertices (insert elsewhere). The a-b edge
    // keeps its ids, so its treatment is still found — the RC-04 failure class
    // (treatment sliding to the wrong edge by index) cannot happen here.
    const reordered: EdgeTreatmentEntry[] = [...edgeTreatments].reverse();
    const found = findEdgeTreatment(reordered, {
      fromVertexId: "a",
      toVertexId: "b",
    });
    expect(found?.treatment).toBe("finished");
  });

  it("returns undefined for an untreated edge", () => {
    expect(
      findEdgeTreatment(edgeTreatments, {
        fromVertexId: "x",
        toVertexId: "y",
      }),
    ).toBeUndefined();
  });

  it("resolves corner treatments by vertex id", () => {
    const corners: CornerTreatmentEntry[] = [
      { vertexId: "b", treatment: "radius", valueIn: 1.5 },
    ];
    expect(findCornerTreatment(corners, "b")?.treatment).toBe("radius");
    expect(findCornerTreatment(corners, "a")).toBeUndefined();
  });
});

describe("edgeIdentityKey", () => {
  it("is direction-independent", () => {
    expect(edgeIdentityKey("a", "b")).toBe(edgeIdentityKey("b", "a"));
  });
});

describe("polygonOutlinePoints", () => {
  it("emits scaled 'x,y' pairs for the SVG outline", () => {
    const p = poly(["a", 0, 0], ["b", 10, 0], ["c", 0, 5]);
    expect(polygonOutlinePoints(p, DEFAULT_RENDER_SCALE)).toBe("0,0 30,0 0,15");
  });

  it("is empty for a non-fillable shape", () => {
    expect(polygonOutlinePoints(poly(["a", 0, 0], ["b", 10, 0]))).toBe("");
  });
});
