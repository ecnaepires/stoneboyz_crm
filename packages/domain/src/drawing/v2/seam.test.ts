import { describe, expect, it } from "vitest";
import { outlineAreaSqIn } from "./measure-outline";
import { splitPieceAtSeam } from "./seam";
import type { PieceV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const piece = (): PieceV2 => ({
  pieceId: "p1",
  kind: "countertop",
  label: "Counter 1",
  positionIn: { x: 0, y: 0 },
  rotationDeg: 0,
  outline: { vertices: [v("a", 0, 0), v("b", 110, 0), v("c", 110, 25.5), v("d", 0, 25.5)] },
  edges: [{ startVertexId: "a", paintColor: "#0000ff" }],
  cutouts: [{ id: "cut1", shape: "circle", centerIn: { x: 20, y: 12 }, diameterIn: 3 }],
});

describe("splitPieceAtSeam", () => {
  it("splits a counter into two pieces conserving area", () => {
    const r = splitPieceAtSeam(piece(), { fromIn: { x: 60, y: -2 }, toIn: { x: 60, y: 30 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [left, right] = r.pieces;
    expect(outlineAreaSqIn(left.outline) + outlineAreaSqIn(right.outline)).toBeCloseTo(110 * 25.5, 4);
    expect(outlineAreaSqIn(left.outline)).toBeCloseTo(60 * 25.5, 4);
    expect(left.pieceId).toBe("p1");
    expect(right.pieceId).not.toBe("p1");
    expect(right.label).toBe("Counter 1 (2)");
  });
  it("keeps cutouts with the side that contains them", () => {
    const r = splitPieceAtSeam(piece(), { fromIn: { x: 60, y: -2 }, toIn: { x: 60, y: 30 } });
    if (!r.ok) throw new Error(r.error);
    expect(r.pieces[0].cutouts).toHaveLength(1);
    expect(r.pieces[1].cutouts).toHaveLength(0);
  });
  it("rejects a seam that misses the piece", () => {
    const r = splitPieceAtSeam(piece(), { fromIn: { x: 200, y: -2 }, toIn: { x: 200, y: 30 } });
    expect(r.ok).toBe(false);
  });
  it("rejects a seam through a radius corner span", () => {
    const p = piece();
    p.outline.vertices[1] = { ...p.outline.vertices[1]!, corner: { type: "radius", valueIn: 3, direction: "out" } };
    const r = splitPieceAtSeam(p, { fromIn: { x: 108.5, y: -2 }, toIn: { x: 108.5, y: 30 } });
    expect(r.ok).toBe(false);
  });
});
