import { describe, expect, it } from "vitest";
import { addBumpOut, addNotch } from "./features";
import { outlineAreaSqIn } from "./measure-outline";
import type { OutlineV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const rect = (): OutlineV2 => ({ vertices: [v("a", 0, 0), v("b", 110, 0), v("c", 110, 25.5), v("d", 0, 25.5)] });

describe("bump-out and notch", () => {
  it("bump-out adds exactly width x projection", () => {
    const r = addBumpOut(rect(), "c", 36, 30, 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(110 * 25.5 + 30 * 3, 4);
    expect(r.outline.vertices).toHaveLength(8);
  });
  it("notch removes exactly width x depth", () => {
    const r = addNotch(rect(), "a", 10, 4, 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(110 * 25.5 - 4 * 2, 4);
  });
  it("rejects spans beyond the edge", () => {
    expect(addBumpOut(rect(), "a", 100, 30, 3).ok).toBe(false);
  });
  it("rejects a notch deeper than the piece", () => {
    expect(addNotch(rect(), "a", 10, 4, 30).ok).toBe(false);
  });
});
