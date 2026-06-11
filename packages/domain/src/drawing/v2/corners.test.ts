import { describe, expect, it } from "vitest";
import { cornerTo90, cornerToAngle, filletCorner, fullRadiusEdge } from "./corners";
import { outlineAreaSqIn } from "./measure-outline";
import { resolveOutline } from "./resolve";
import type { OutlineV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const rect = (): OutlineV2 => ({ vertices: [v("a", 0, 0), v("b", 20, 0), v("c", 20, 20), v("d", 0, 20)] });

describe("corner operations", () => {
  it("filletCorner sets an outward radius and the arc bows OUTWARD (regression: fillet-inside-cabinet-line)", () => {
    const r = filletCorner(rect(), "b", "radius", 2, "out");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const arc = resolveOutline(r.outline).find((e) => e.kind === "arc");
    if (arc?.kind !== "arc") throw new Error("no arc");
    expect(arc.center).toEqual({ x: 18, y: 2 });
    expect(400 - outlineAreaSqIn(r.outline)).toBeCloseTo(4 - Math.PI, 3);
  });
  it("filletCorner direction 'in' produces the cove removal", () => {
    const r = filletCorner(rect(), "b", "radius", 2, "in");
    if (!r.ok) throw new Error(r.error);
    expect(400 - outlineAreaSqIn(r.outline)).toBeCloseTo(Math.PI, 3);
  });
  it("filletCorner 'sharp' clears a corner", () => {
    const r1 = filletCorner(rect(), "b", "radius", 2, "out");
    if (!r1.ok) throw new Error(r1.error);
    const r2 = filletCorner(r1.outline, "b", "sharp", 0, "out");
    if (!r2.ok) throw new Error(r2.error);
    expect(outlineAreaSqIn(r2.outline)).toBeCloseTo(400, 6);
  });
  it("rejects a radius that does not fit the adjacent edges", () => {
    const r = filletCorner(rect(), "b", "radius", 25, "out");
    expect(r.ok).toBe(false);
  });
  it("fullRadiusEdge bows an edge into a half-round", () => {
    const r = fullRadiusEdge(rect(), "a");
    if (!r.ok) throw new Error(r.error);
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(400 + (Math.PI * 100) / 2, 3);
  });
  it("cornerToAngle 45 replaces the corner with a real diagonal edge of the typed length", () => {
    const L = 6 * Math.SQRT2;
    const r = cornerToAngle(rect(), "b", 45, L);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.outline.vertices).toHaveLength(5);
    const edges = resolveOutline(r.outline);
    const diag = edges.find(
      (e) => e.kind === "line" && Math.abs(Math.abs(e.to.x - e.from.x) - Math.abs(e.to.y - e.from.y)) < 1e-6,
    );
    expect(diag).toBeDefined();
    expect(400 - outlineAreaSqIn(r.outline)).toBeCloseTo(18, 4);
  });
  it("cornerTo90 collapses the diagonal back", () => {
    const r1 = cornerToAngle(rect(), "b", 45, 6 * Math.SQRT2);
    if (!r1.ok) throw new Error(r1.error);
    const diagStart = r1.outline.vertices[1]!.vertexId;
    const r2 = cornerTo90(r1.outline, diagStart);
    if (!r2.ok) throw new Error(r2.error);
    expect(r2.outline.vertices).toHaveLength(4);
    expect(outlineAreaSqIn(r2.outline)).toBeCloseTo(400, 4);
  });
});
