import { describe, expect, it } from "vitest";
import { resolveOutline } from "./resolve";
import type { OutlineV2 } from "./types";

const v = (id: string, x: number, y: number, extra: object = {}) => ({ vertexId: id, xIn: x, yIn: y, ...extra });

describe("resolveOutline", () => {
  it("resolves a plain rectangle to 4 line edges", () => {
    const o: OutlineV2 = { vertices: [v("a", 0, 0), v("b", 110, 0), v("c", 110, 25.5), v("d", 0, 25.5)] };
    const edges = resolveOutline(o);
    expect(edges).toHaveLength(4);
    expect(edges.every((e) => e.kind === "line")).toBe(true);
    expect(edges[0]).toMatchObject({ from: { x: 0, y: 0 }, to: { x: 110, y: 0 }, sourceStartVertexId: "a" });
  });

  it("expands a 2-inch outward radius on a 90° corner into tangent points + arc", () => {
    const o: OutlineV2 = {
      vertices: [v("a", 0, 0), v("b", 20, 0, { corner: { type: "radius", valueIn: 2, direction: "out" } }), v("c", 20, 20), v("d", 0, 20)],
    };
    const edges = resolveOutline(o);
    const arc = edges.find((e) => e.kind === "arc");
    expect(arc).toBeDefined();
    if (arc?.kind !== "arc") return;
    expect(arc.from).toEqual({ x: 18, y: 0 });
    expect(arc.to).toEqual({ x: 20, y: 2 });
    expect(arc.center.x).toBeCloseTo(18, 6);
    expect(arc.center.y).toBeCloseTo(2, 6);
    expect(arc.radiusIn).toBeCloseTo(2, 6);
    expect(Math.abs(arc.sweep)).toBeCloseTo(Math.PI / 2, 6);
  });

  it("expands an inward (cove) radius centered on the old corner", () => {
    const o: OutlineV2 = {
      vertices: [v("a", 0, 0), v("b", 20, 0, { corner: { type: "radius", valueIn: 2, direction: "in" } }), v("c", 20, 20), v("d", 0, 20)],
    };
    const arc = resolveOutline(o).find((e) => e.kind === "arc");
    if (arc?.kind !== "arc") throw new Error("no arc");
    expect(arc.center.x).toBeCloseTo(20, 6);
    expect(arc.center.y).toBeCloseTo(0, 6);
    expect(arc.radiusIn).toBeCloseTo(2, 6);
  });

  it("expands a chamfer into a straight cut", () => {
    const o: OutlineV2 = {
      vertices: [v("a", 0, 0), v("b", 20, 0, { corner: { type: "chamfer", valueIn: 2, direction: "out" } }), v("c", 20, 20), v("d", 0, 20)],
    };
    const edges = resolveOutline(o);
    expect(edges).toHaveLength(5);
    const cut = edges[1]!;
    expect(cut.kind).toBe("line");
    expect(cut.from).toEqual({ x: 18, y: 0 });
    expect(cut.to).toEqual({ x: 20, y: 2 });
  });

  it("expands a bulge edge into an arc through the circumcircle", () => {
    const o: OutlineV2 = { vertices: [v("a", 0, 0, { bulge: 1 }), v("b", 20, 0), v("c", 20, 10), v("d", 0, 10)] };
    const arc = resolveOutline(o).find((e) => e.kind === "arc");
    if (arc?.kind !== "arc") throw new Error("no arc");
    expect(arc.radiusIn).toBeCloseTo(10, 6);
    expect(arc.center).toEqual({ x: 10, y: 0 });
    expect(Math.abs(arc.sweep)).toBeCloseTo(Math.PI, 6);
  });
});
