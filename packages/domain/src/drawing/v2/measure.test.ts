import { describe, expect, it } from "vitest";
import { measureLayout } from "./measure";
import type { LayoutV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const layout: LayoutV2 = {
  schemaVersion: 2,
  pieces: [
    {
      pieceId: "p1",
      kind: "countertop",
      label: "Counter 1",
      positionIn: { x: 0, y: 0 },
      rotationDeg: 0,
      outline: { vertices: [v("a", 0, 0), v("b", 110, 0), v("c", 110, 25.5), v("d", 0, 25.5)] },
      edges: [
        { startVertexId: "c", paintColor: "#0000ff" },
        { startVertexId: "a", splash: { heightIn: 4, offsetIn: 0 } },
      ],
      cutouts: [{ id: "cut1", shape: "circle", centerIn: { x: 20, y: 12 }, diameterIn: 3 }],
    },
  ],
  sinks: [],
  annotations: [],
  legend: [
    { color: "#0000ff", label: "Edge", countsAsEdge: true },
    { color: "#ff0000", label: "Wall" },
  ],
};

describe("measureLayout", () => {
  it("computes the totals contract", () => {
    const m = measureLayout(layout);
    expect(m.countertopSqFt).toBeCloseTo((110 * 25.5) / 144, 2);
    expect(m.backsplashSqFt).toBeCloseTo((110 * 4) / 144, 2);
    expect(m.combinedSqFt).toBeCloseTo((110 * 25.5 + 110 * 4) / 144, 2);
    expect(m.edgeLinFt).toBeCloseTo(110 / 12, 2);
    expect(m.perPiece).toHaveLength(1);
    expect(m.perPiece[0]).toMatchObject({ pieceId: "p1", label: "Counter 1" });
    expect(m.perPiece[0]!.sqFt).toBeCloseTo(19.48, 2);
  });
  it("ignores painted colors not flagged countsAsEdge", () => {
    const l2 = structuredClone(layout);
    l2.pieces[0]!.edges[0]!.paintColor = "#ff0000";
    expect(measureLayout(l2).edgeLinFt).toBe(0);
  });
});
