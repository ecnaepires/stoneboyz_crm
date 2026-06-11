import { describe, expect, it } from "vitest";
import { quoteAreaTotalsFromLayoutV2 } from "./quote-totals";
import type { LayoutV2, PieceV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const counter: PieceV2 = {
  pieceId: "11111111-1111-4111-8111-111111111111",
  kind: "countertop",
  label: "Counter 1",
  positionIn: { x: 0, y: 0 },
  rotationDeg: 0,
  outline: { vertices: [v("a", 0, 0), v("b", 110, 0), v("c", 110, 25.5), v("d", 0, 25.5)] },
  edges: [
    { startVertexId: "c", paintColor: "#0000ff" }, // front edge 110", painted blue
    { startVertexId: "a", splash: { heightIn: 4, offsetIn: 0 } }, // back edge splash 110" x 4"
  ],
  cutouts: [],
};
const layout: LayoutV2 = {
  schemaVersion: 2,
  pieces: [counter],
  sinks: [
    {
      sinkId: "22222222-2222-4222-8222-222222222222",
      pieceId: counter.pieceId,
      type: "sink",
      centerIn: { x: 55, y: 12 },
      rotationDeg: 0,
      showCenterline: "left",
      faucetHoles: [
        { id: "f1", dxIn: -2, diameterIn: 1.375 },
        { id: "f2", dxIn: 2, diameterIn: 1.375 },
      ],
    },
  ],
  annotations: [],
  legend: [{ color: "#0000ff", label: "Edge", countsAsEdge: true }],
};

describe("quoteAreaTotalsFromLayoutV2", () => {
  it("maps a full layout onto the QuoteMeasurementAreaTotals contract", () => {
    const t = quoteAreaTotalsFromLayoutV2(layout);
    expect(t.pieceCount).toBe(1);
    expect(t.countertopSqFt).toBeCloseTo(2805 / 144, 2);
    expect(t.backsplashSqFt).toBe(0); // no backsplash PIECES
    expect(t.splashSqFt).toBeCloseTo((110 * 4) / 144, 2); // splash edge record, separate
    expect(t.combinedSqFt).toBeCloseTo(2805 / 144, 2);
    expect(t.finishedEdgeLinFt).toBeCloseTo(110 / 12, 2); // only the painted countsAsEdge edge
    expect(t.sinkCutoutCount).toBe(1);
    expect(t.faucetHoleCount).toBe(2);
  });
  it("empty layout is all zeros", () => {
    const t = quoteAreaTotalsFromLayoutV2({ schemaVersion: 2, pieces: [], sinks: [], annotations: [], legend: [] });
    expect(t).toEqual({
      pieceCount: 0,
      countertopSqFt: 0,
      backsplashSqFt: 0,
      combinedSqFt: 0,
      finishedEdgeLinFt: 0,
      splashSqFt: 0,
      sinkCutoutCount: 0,
      faucetHoleCount: 0,
    });
  });
});
