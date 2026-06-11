import { describe, expect, it } from "vitest";
import { arcThroughPoints, circleThrough } from "./arcs";
import { outlineAreaSqIn } from "./measure-outline";
import type { OutlineV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const counter = (): OutlineV2 => ({ vertices: [v("a", 0, 0), v("b", 110, 0), v("c", 110, 25.5), v("d", 0, 25.5)] });

describe("three-point arc", () => {
  it("circleThrough finds the circumcircle", () => {
    const c = circleThrough({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 });
    expect(c).not.toBeNull();
    expect(c!.center.x).toBeCloseTo(10, 6);
    expect(c!.center.y).toBeCloseTo(0, 6);
    expect(c!.radius).toBeCloseTo(10, 6);
  });
  it("returns null for collinear points", () => {
    expect(circleThrough({ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 })).toBeNull();
  });
  it("builds the user's bow front: offsets at 35.5/45.5, clicks left/apex/right", () => {
    const p1 = { x: 45, y: 35.5 };
    const apex = { x: 55, y: 45.5 };
    const p3 = { x: 65, y: 35.5 };
    const r = arcThroughPoints(counter(), "c", p1, apex, p3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const expected = 110 * 25.5 + 20 * 10 + (Math.PI * 100) / 2;
    expect(outlineAreaSqIn(r.outline)).toBeCloseTo(expected, 2);
  });
  it("works inward (bow-in): apex between the edge and the clicks", () => {
    const p1 = { x: 45, y: 25.5 };
    const apex = { x: 55, y: 20.5 };
    const p3 = { x: 65, y: 25.5 };
    const r = arcThroughPoints(counter(), "c", p1, apex, p3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(outlineAreaSqIn(r.outline)).toBeLessThan(110 * 25.5);
  });
  it("rejects points whose span does not land on the edge", () => {
    const r = arcThroughPoints(counter(), "a", { x: 200, y: -5 }, { x: 210, y: -10 }, { x: 220, y: -5 });
    expect(r.ok).toBe(false);
  });
});
