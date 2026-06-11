import { describe, expect, it } from "vitest";
import { shoelaceArea, validateOutline } from "./validate";
import type { OutlineV2 } from "./types";

const v = (id: string, x: number, y: number) => ({ vertexId: id, xIn: x, yIn: y });
const rect = (w: number, h: number): OutlineV2 => ({
  vertices: [v("a", 0, 0), v("b", w, 0), v("c", w, h), v("d", 0, h)],
});

describe("validateOutline", () => {
  it("accepts a clockwise rectangle unchanged", () => {
    const r = validateOutline(rect(110, 25.5));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.outline.vertices.map((p) => p.vertexId)).toEqual(["a", "b", "c", "d"]);
    expect(shoelaceArea(r.outline)).toBeCloseTo(110 * 25.5, 6);
  });
  it("normalizes counter-clockwise input by reversing", () => {
    const ccw: OutlineV2 = { vertices: [...rect(10, 10).vertices].reverse() };
    const r = validateOutline(ccw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(shoelaceArea(r.outline)).toBeGreaterThan(0);
  });
  it("rejects < 3 vertices", () => {
    const r = validateOutline({ vertices: rect(10, 10).vertices.slice(0, 2) });
    expect(r).toEqual({ ok: false, error: "outline needs at least 3 vertices" });
  });
  it("rejects edges shorter than 1/16 inch", () => {
    const o: OutlineV2 = { vertices: [v("a", 0, 0), v("b", 0.01, 0), v("c", 10, 0), v("d", 10, 10), v("e", 0, 10)] };
    const r = validateOutline(o);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("shorter than");
  });
  it("rejects self-intersecting outlines (bowtie)", () => {
    const bowtie: OutlineV2 = { vertices: [v("a", 0, 0), v("b", 10, 10), v("c", 10, 0), v("d", 0, 10)] };
    const r = validateOutline(bowtie);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("self-intersect");
  });
  it("rejects duplicate vertex ids", () => {
    const o: OutlineV2 = { vertices: [v("a", 0, 0), v("a", 10, 0), v("c", 10, 10), v("d", 0, 10)] };
    const r = validateOutline(o);
    expect(r.ok).toBe(false);
  });
});
