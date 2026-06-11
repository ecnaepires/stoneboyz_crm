import { describe, expect, it } from "vitest";
import { drawingV2 } from "@stoneboyz/domain";
import {
  SCALE,
  arcRenderParams,
  formatInches,
  inToPx,
  parseInches,
  pieceToWorld,
  pxToIn,
  worldToPiece,
} from "./view";

describe("scale", () => {
  it("3 px per inch, both directions", () => {
    expect(SCALE).toBe(3);
    expect(inToPx(25.5)).toBe(76.5);
    expect(pxToIn(76.5)).toBe(25.5);
  });
});

describe("formatInches / parseInches", () => {
  it("formats whole and sixteenth values", () => {
    expect(formatInches(105)).toBe('105"');
    expect(formatInches(25.5)).toBe('25 1/2"');
    expect(formatInches(10.0625)).toBe('10 1/16"');
    expect(formatInches(0.75)).toBe('3/4"');
  });
  it("parses decimals, fractions, and mixed numbers to 1/16", () => {
    expect(parseInches("105")).toBe(105);
    expect(parseInches("105.5")).toBe(105.5);
    expect(parseInches("105 1/2")).toBe(105.5);
    expect(parseInches("3/4")).toBe(0.75);
    expect(parseInches("105.53")).toBe(105.5); // rounds to 1/16
    expect(parseInches("abc")).toBeNull();
    expect(parseInches("-5")).toBeNull();
    expect(parseInches("0")).toBeNull();
  });
});

describe("piece transform", () => {
  const piece = {
    pieceId: "p",
    kind: "countertop" as const,
    label: "C",
    positionIn: { x: 10, y: 20 },
    rotationDeg: 90 as const,
    outline: {
      vertices: [
        { vertexId: "a", xIn: 0, yIn: 0 },
        { vertexId: "b", xIn: 40, yIn: 0 },
        { vertexId: "c", xIn: 40, yIn: 20 },
        { vertexId: "d", xIn: 0, yIn: 20 },
      ],
    },
    edges: [],
    cutouts: [],
  };
  it("rotates about the outline bbox center then translates", () => {
    const w = pieceToWorld(piece, { x: 0, y: 0 });
    expect(w.x).toBeCloseTo(10 + 30, 6);
    expect(w.y).toBeCloseTo(20 - 10, 6);
    const back = worldToPiece(piece, w);
    expect(back.x).toBeCloseTo(0, 6);
    expect(back.y).toBeCloseTo(0, 6);
  });
  it("identity at rotation 0", () => {
    const p0 = { ...piece, rotationDeg: 0 as const };
    expect(pieceToWorld(p0, { x: 5, y: 5 })).toEqual({ x: 15, y: 25 });
  });
});

describe("arcRenderParams", () => {
  it("matches the kernel's quarter-circle OUT corner (canvas y-down angles)", () => {
    const o = {
      vertices: [
        { vertexId: "a", xIn: 0, yIn: 0 },
        { vertexId: "b", xIn: 20, yIn: 0, corner: { type: "radius" as const, valueIn: 2, direction: "out" as const } },
        { vertexId: "c", xIn: 20, yIn: 20 },
        { vertexId: "d", xIn: 0, yIn: 20 },
      ],
    };
    const arc = drawingV2.resolveOutline(o).find((e) => e.kind === "arc");
    if (arc?.kind !== "arc") throw new Error("no arc");
    const p = arcRenderParams(arc);
    expect(p.startAngle).toBeCloseTo(-Math.PI / 2, 6);
    expect(p.endAngle).toBeCloseTo(0, 6);
    expect(p.anticlockwise).toBe(false);
  });
});
