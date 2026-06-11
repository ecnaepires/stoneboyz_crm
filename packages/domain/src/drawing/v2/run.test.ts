// packages/domain/src/drawing/v2/run.test.ts
import { describe, expect, it } from "vitest";
import { outlineAreaSqIn } from "./measure-outline";
import { outlineFromRect, outlineFromRun } from "./run";

describe("outlineFromRect", () => {
  it("builds a clockwise rectangle with fresh vertex ids", () => {
    const o = outlineFromRect(10, 20, 110, 25.5);
    expect(o.vertices).toHaveLength(4);
    expect(o.vertices.map((v) => ({ x: v.xIn, y: v.yIn }))).toEqual([
      { x: 10, y: 20 },
      { x: 120, y: 20 },
      { x: 120, y: 45.5 },
      { x: 10, y: 45.5 },
    ]);
    expect(new Set(o.vertices.map((v) => v.vertexId)).size).toBe(4);
    expect(outlineAreaSqIn(o)).toBeCloseTo(2805, 4);
  });
});

describe("outlineFromRun", () => {
  it("a single segment run is a rectangle", () => {
    const r = outlineFromRun([{ x: 0, y: 0 }, { x: 110, y: 0 }], 25.5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(2805, 4);
  });
  it("builds an L from two runs (golden: union area, miter inner corner)", () => {
    // back wall left→right 60, then down the right wall 36, depth 25.5
    const r = outlineFromRun([{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 36 }], 25.5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(60 * 25.5 + 25.5 * 36 - 25.5 * 25.5, 4);
    expect(r.outline.vertices.map((v) => ({ x: v.xIn, y: v.yIn }))).toEqual([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 36 },
      { x: 34.5, y: 36 },
      { x: 34.5, y: 25.5 },
      { x: 0, y: 25.5 },
    ]);
  });
  it("rejects non-axis-aligned run points", () => {
    const r = outlineFromRun([{ x: 0, y: 0 }, { x: 10, y: 10 }], 25.5);
    expect(r.ok).toBe(false);
  });
  it("rejects a run whose return leg is shorter than the depth (self-intersects)", () => {
    const r = outlineFromRun([{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 10 }], 25.5);
    expect(r.ok).toBe(false);
  });
  it("rejects fewer than 2 points and zero-length segments", () => {
    expect(outlineFromRun([{ x: 0, y: 0 }], 25.5).ok).toBe(false);
    expect(outlineFromRun([{ x: 0, y: 0 }, { x: 0, y: 0 }], 25.5).ok).toBe(false);
  });
});
