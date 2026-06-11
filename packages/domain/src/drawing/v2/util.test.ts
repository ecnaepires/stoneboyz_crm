// packages/domain/src/drawing/v2/util.test.ts
import { describe, expect, it } from "vitest";
import { outwardNormal, ptAdd, ptScale, ptSub, roundIn, vecLen, vecNorm, newVertexId } from "./util";

describe("v2 util", () => {
  it("rounds to 1/16 inch", () => {
    expect(roundIn(25.49)).toBe(25.5);
    expect(roundIn(10.0312)).toBe(10);
    expect(roundIn(0.01)).toBe(0);
  });
  it("computes outward normal for clockwise screen-coord travel", () => {
    // top edge of a clockwise square travels +x; outside is up (−y)
    expect(outwardNormal({ x: 1, y: 0 })).toEqual({ x: 0, y: -1 });
    // right edge travels +y; outside is right (+x)
    expect(outwardNormal({ x: 0, y: 1 })).toEqual({ x: 1, y: 0 });
  });
  it("vector helpers behave", () => {
    expect(ptAdd({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    expect(ptSub({ x: 3, y: 4 }, { x: 1, y: 1 })).toEqual({ x: 2, y: 3 });
    expect(ptScale({ x: 1, y: -2 }, 2)).toEqual({ x: 2, y: -4 });
    expect(vecLen({ x: 3, y: 4 })).toBe(5);
    expect(vecNorm({ x: 0, y: 5 })).toEqual({ x: 0, y: 1 });
  });
  it("generates 8-char vertex ids", () => {
    const a = newVertexId();
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(newVertexId()).not.toBe(a);
  });
});
