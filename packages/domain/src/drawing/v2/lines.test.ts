import { describe, expect, it } from "vitest";
import { extendLineToBoundary, hitTest } from "./lines";
import type { OutlineV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const rect: OutlineV2 = { vertices: [v("a", 0, 0), v("b", 110, 0), v("c", 110, 25.5), v("d", 0, 25.5)] };

describe("extendLineToBoundary", () => {
  it("extends a 10\" seam tick to the back edge (the user's seam workflow)", () => {
    const r = extendLineToBoundary(rect, { fromIn: { x: 60, y: 25.5 }, toIn: { x: 60, y: 15.5 } });
    expect(r).toEqual({ fromIn: { x: 60, y: 25.5 }, toIn: { x: 60, y: 0 } });
  });
  it("returns null when the line direction never meets the outline", () => {
    const r = extendLineToBoundary(rect, { fromIn: { x: 200, y: 50 }, toIn: { x: 200, y: 40 } });
    expect(r).toBeNull();
  });
});

describe("hitTest", () => {
  it("classifies edge, vertex, inside, outside", () => {
    expect(hitTest(rect, { x: 55, y: 0 }, 0.5).kind).toBe("edge");
    expect(hitTest(rect, { x: 0.2, y: 0.2 }, 0.5).kind).toBe("vertex");
    expect(hitTest(rect, { x: 55, y: 12 }, 0.5).kind).toBe("inside");
    expect(hitTest(rect, { x: 55, y: 40 }, 0.5).kind).toBe("outside");
  });
  it("reports which edge by startVertexId", () => {
    const h = hitTest(rect, { x: 110, y: 12 }, 0.5);
    expect(h).toMatchObject({ kind: "edge", startVertexId: "b" });
  });
});
