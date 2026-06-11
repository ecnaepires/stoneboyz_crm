import { describe, expect, it } from "vitest";
import { outlineAreaSqIn } from "./measure-outline";
import { offsetEdge } from "./offset";
import type { OutlineV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const rect = (): OutlineV2 => ({ vertices: [v("a", 0, 0), v("b", 110, 0), v("c", 110, 25.5), v("d", 0, 25.5)] });

describe("offsetEdge", () => {
  it("grows the piece: front edge (c->d, the y=25.5 edge) out by 1.5 makes depth 27", () => {
    const r = offsetEdge(rect(), "c", 1.5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(110 * 27, 4);
    const c = r.outline.vertices.find((p) => p.vertexId === "c")!;
    const d = r.outline.vertices.find((p) => p.vertexId === "d")!;
    expect(c.yIn).toBeCloseTo(27, 6);
    expect(d.yIn).toBeCloseTo(27, 6);
  });
  it("shrinks with negative distance and round-trips area", () => {
    const out = offsetEdge(rect(), "a", 10);
    if (!out.ok) throw new Error(out.error);
    const back = offsetEdge(out.outline, "a", -10);
    if (!back.ok) throw new Error(back.error);
    expect(outlineAreaSqIn(back.outline)).toBeCloseTo(110 * 25.5, 4);
  });
  it("rejects an offset that would collapse the piece", () => {
    const r = offsetEdge(rect(), "a", -25.5);
    expect(r.ok).toBe(false);
  });
  it("merges a neighbor that collapses to under 1/16\"", () => {
    const lShape: OutlineV2 = {
      vertices: [v("a", 0, 0), v("b", 60, 0), v("c", 60, 12), v("e", 30, 12), v("f", 30, 25.5), v("g", 0, 25.5)],
    };
    const r = offsetEdge(lShape, "c", 13.5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.outline.vertices.length).toBe(4);
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(60 * 25.5, 4);
  });
});
