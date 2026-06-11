import { describe, expect, it } from "vitest";
import { edgeLengthsIn, outlineAreaSqIn, outlinePerimeterIn } from "./measure-outline";
import type { OutlineV2 } from "./types";

const v = (id: string, x: number, y: number, extra: object = {}) => ({ vertexId: id, xIn: x, yIn: y, ...extra });
const rect20: OutlineV2 = { vertices: [v("a", 0, 0), v("b", 20, 0), v("c", 20, 20), v("d", 0, 20)] };
const withCorner = (corner: object): OutlineV2 => ({
  vertices: [v("a", 0, 0), v("b", 20, 0, { corner }), v("c", 20, 20), v("d", 0, 20)],
});

describe("outline measuring goldens", () => {
  it("rectangle 110 x 25.5 = 2805 sq in (19.48 sq ft)", () => {
    const o: OutlineV2 = { vertices: [v("a", 0, 0), v("b", 110, 0), v("c", 110, 25.5), v("d", 0, 25.5)] };
    expect(outlineAreaSqIn(o)).toBeCloseTo(2805, 2);
  });
  it("2\" outward radius removes r² − πr²/4", () => {
    const area = outlineAreaSqIn(withCorner({ type: "radius", valueIn: 2, direction: "out" }));
    expect(400 - area).toBeCloseTo(4 - Math.PI, 3);
  });
  it("2\" cove (inward radius) removes πr²/4", () => {
    const area = outlineAreaSqIn(withCorner({ type: "radius", valueIn: 2, direction: "in" }));
    expect(400 - area).toBeCloseTo(Math.PI, 3);
  });
  it("2\" chamfer removes a·b/2", () => {
    const area = outlineAreaSqIn(withCorner({ type: "chamfer", valueIn: 2, direction: "out" }));
    expect(400 - area).toBeCloseTo(2, 6);
  });
  it("semicircle bulge on a 20-edge adds π·10²/2", () => {
    const o: OutlineV2 = { vertices: [v("a", 0, 0, { bulge: 1 }), v("b", 20, 0), v("c", 20, 10), v("d", 0, 10)] };
    expect(outlineAreaSqIn(o)).toBeCloseTo(200 + (Math.PI * 100) / 2, 3);
  });
  it("quarter-circle radius corner contributes arc length πr/2", () => {
    const lens = edgeLengthsIn(withCorner({ type: "radius", valueIn: 2, direction: "out" }));
    const arcLen = lens.find((l) => l.kind === "arc")!;
    expect(arcLen.lengthIn).toBeCloseTo(Math.PI, 4);
    expect(outlinePerimeterIn(rect20)).toBeCloseTo(80, 6);
  });
});
