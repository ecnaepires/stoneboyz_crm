import { describe, expect, it } from "vitest";
import { cornerToAngle } from "./corners";
import { setEdgeLength } from "./edit";
import { edgeLengthsIn, outlineAreaSqIn } from "./measure-outline";
import type { OutlineV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const rect = (): OutlineV2 => ({ vertices: [v("a", 0, 0), v("b", 100, 0), v("c", 100, 25.5), v("d", 0, 25.5)] });
const lShape = (): OutlineV2 => ({
  vertices: [v("a", 0, 0), v("b", 60, 0), v("c", 60, 12), v("e", 30, 12), v("f", 30, 25.5), v("g", 0, 25.5)],
});

describe("setEdgeLength", () => {
  it("stretches a 100 top edge to 105 (the user's example)", () => {
    const r = setEdgeLength(rect(), "a", 105, "start");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(105 * 25.5, 4);
    const b = r.outline.vertices.find((p) => p.vertexId === "b")!;
    const c = r.outline.vertices.find((p) => p.vertexId === "c")!;
    expect(b.xIn).toBeCloseTo(105, 6);
    expect(c.xIn).toBeCloseTo(105, 6);
  });
  it("anchor 'end' moves the start side instead", () => {
    const r = setEdgeLength(rect(), "a", 105, "end");
    if (!r.ok) throw new Error(r.error);
    const a = r.outline.vertices.find((p) => p.vertexId === "a")!;
    expect(a.xIn).toBeCloseTo(-5, 6);
  });
  it("stretching the L bottom edge moves only the right wing", () => {
    const r = setEdgeLength(lShape(), "a", 70, "start");
    if (!r.ok) throw new Error(r.error);
    const e = r.outline.vertices.find((p) => p.vertexId === "e")!;
    expect(e.xIn).toBeCloseTo(30, 6);
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(60 * 12 + 30 * 13.5 + 10 * 12, 4);
  });
  it("retypes a 45 diagonal length symmetrically", () => {
    const withDiag = cornerToAngle(rect(), "b", 45, 6 * Math.SQRT2);
    if (!withDiag.ok) throw new Error(withDiag.error);
    const diagStart = withDiag.outline.vertices[1]!.vertexId;
    const r = setEdgeLength(withDiag.outline, diagStart, 8 * Math.SQRT2, "start");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lens = edgeLengthsIn(r.outline);
    const diag = lens.find((l) => Math.abs(l.lengthIn - 8 * Math.SQRT2) < 1e-4);
    expect(diag).toBeDefined();
    expect(100 * 25.5 - outlineAreaSqIn(r.outline)).toBeCloseTo(32, 3);
  });
  it("rejects lengths under 1/16", () => {
    expect(setEdgeLength(rect(), "a", 0.01, "start").ok).toBe(false);
  });
});
