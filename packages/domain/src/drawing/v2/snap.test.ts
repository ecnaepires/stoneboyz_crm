import { describe, expect, it } from "vitest";
import { snapPoint } from "./snap";
import type { AnnotationV2, OutlineV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const rect: OutlineV2 = { vertices: [v("a", 0, 0), v("b", 100, 0), v("c", 100, 25.5), v("d", 0, 25.5)] };
const cl: AnnotationV2 = { id: "cl1", type: "centerline", pieceId: "p1", fromIn: { x: 50, y: 0 }, toIn: { x: 50, y: 25.5 } };
const rail: AnnotationV2 = { id: "seg1", type: "segment", pieceId: "p1", fromIn: { x: 0, y: 21.5 }, toIn: { x: 100, y: 21.5 } };

describe("snapPoint", () => {
  it("snaps to the midpoint of an edge (centerline placement)", () => {
    const s = snapPoint({ outlines: [rect], annotations: [] }, { x: 49.7, y: 0.2 }, 1);
    expect(s.kind).toBe("midpoint");
    expect(s.ptIn).toEqual({ x: 50, y: 0 });
  });
  it("snaps to a vertex endpoint over a midpoint when closer", () => {
    const s = snapPoint({ outlines: [rect], annotations: [] }, { x: 0.3, y: 0.1 }, 1);
    expect(s.kind).toBe("endpoint");
    expect(s.ptIn).toEqual({ x: 0, y: 0 });
  });
  it("ranks intersection above everything: sink rail x centerline (the user's sink workflow)", () => {
    const s = snapPoint({ outlines: [rect], annotations: [cl, rail] }, { x: 50.4, y: 21.2 }, 1);
    expect(s.kind).toBe("intersection");
    expect(s.ptIn).toEqual({ x: 50, y: 21.5 });
  });
  it("falls back to the 1/16 grid", () => {
    const s = snapPoint({ outlines: [rect], annotations: [] }, { x: 40.04, y: 12.02 }, 0.4);
    expect(s.kind).toBe("grid");
    expect(s.ptIn).toEqual({ x: 40.0625, y: 12 });
  });
});
