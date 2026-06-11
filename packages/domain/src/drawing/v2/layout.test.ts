import { describe, expect, it } from "vitest";
import { layoutV2Schema } from "./layout";

const validLayout = {
  schemaVersion: 2,
  pieces: [
    {
      pieceId: "11111111-1111-4111-8111-111111111111",
      kind: "countertop",
      label: "Counter 1",
      positionIn: { x: 10, y: 10 },
      rotationDeg: 0,
      outline: {
        vertices: [
          { vertexId: "aaaaaaaa", xIn: 0, yIn: 0 },
          { vertexId: "bbbbbbbb", xIn: 110, yIn: 0 },
          { vertexId: "cccccccc", xIn: 110, yIn: 25.5 },
          { vertexId: "dddddddd", xIn: 0, yIn: 25.5 },
        ],
      },
      edges: [{ startVertexId: "cccccccc", paintColor: "#0000ff" }],
      cutouts: [],
    },
  ],
  sinks: [
    {
      sinkId: "22222222-2222-4222-8222-222222222222",
      pieceId: "11111111-1111-4111-8111-111111111111",
      type: "sink",
      centerIn: { x: 50, y: 12 },
      rotationDeg: 0,
      showCenterline: "left",
      faucetHoles: [{ id: "fh1", dxIn: 0, diameterIn: 1.375 }],
    },
  ],
  annotations: [],
  legend: [{ color: "#0000ff", label: "Edge", countsAsEdge: true }],
};

describe("layoutV2Schema", () => {
  it("accepts a valid layout", () => {
    expect(layoutV2Schema.safeParse(validLayout).success).toBe(true);
  });
  it("rejects schemaVersion 1 payloads", () => {
    expect(layoutV2Schema.safeParse({ ...validLayout, schemaVersion: 1 }).success).toBe(false);
  });
  it("rejects a self-intersecting outline", () => {
    const bad = structuredClone(validLayout);
    bad.pieces[0]!.outline.vertices = [
      { vertexId: "aaaaaaaa", xIn: 0, yIn: 0 },
      { vertexId: "bbbbbbbb", xIn: 10, yIn: 10 },
      { vertexId: "cccccccc", xIn: 10, yIn: 0 },
      { vertexId: "dddddddd", xIn: 0, yIn: 10 },
    ];
    const r = layoutV2Schema.safeParse(bad);
    expect(r.success).toBe(false);
  });
  it("rejects a sink whose center is outside its piece", () => {
    const bad = structuredClone(validLayout);
    bad.sinks[0]!.centerIn = { x: 500, y: 500 };
    expect(layoutV2Schema.safeParse(bad).success).toBe(false);
  });
  it("rejects an inward chamfer", () => {
    const bad = structuredClone(validLayout);
    bad.pieces[0]!.outline.vertices[1] = {
      vertexId: "bbbbbbbb",
      xIn: 110,
      yIn: 0,
      corner: { type: "chamfer", valueIn: 2, direction: "in" },
    } as never;
    expect(layoutV2Schema.safeParse(bad).success).toBe(false);
  });
});
