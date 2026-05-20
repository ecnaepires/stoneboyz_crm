import { describe, expect, it } from "vitest";
import {
  buildOffsetSegment,
  buildReferenceLine,
  connectEdgesToRectangle,
  drawingShapeEdgeMatchesLine,
  drawingShapeEdgesEqual,
  drawingRectsToChainSegments,
} from "./drawingGeometry";

const SCALE = 3;

describe("drawing geometry workflow rules", () => {
  it("offsets a horizontal cabinet edge and leaves source line available as reference", () => {
    const edge = { from: [0, 0] as [number, number], to: [300, 0] as [number, number] };

    const offset = buildOffsetSegment({
      edge,
      deltaPx: -4.5,
      scale: SCALE,
    });
    const reference = buildReferenceLine({
      id: "line-1",
      pieceId: "piece-1",
      edge,
    });

    expect(offset).toMatchObject({
      x: 0,
      y: -4.5,
      w: 300,
      h: 4.5,
      lengthIn: 100,
      widthIn: 1.5,
      orientation: "horizontal",
    });
    expect(reference).toEqual({
      id: "line-1",
      pieceId: "piece-1",
      from: [0, 0],
      to: [300, 0],
      kind: "cabinet",
      color: "#6b7280",
    });
  });

  it("offsets a vertical edge in the clicked direction even when that side is inside the piece", () => {
    const rightEdge = {
      from: [300, 0] as [number, number],
      to: [300, 76.5] as [number, number],
    };

    const offset = buildOffsetSegment({
      edge: rightEdge,
      deltaPx: -4.5,
      scale: SCALE,
    });

    expect(offset.x).toBe(295.5);
    expect(offset.w).toBe(4.5);
    expect(offset.lengthIn).toBe(1.5);
    expect(offset.widthIn).toBe(25.5);
    expect(offset.orientation).toBe("vertical");
  });

  it("matches deleted lines regardless of edge direction", () => {
    const edge = { from: [0, 0] as [number, number], to: [100, 0] as [number, number] };

    expect(
      drawingShapeEdgeMatchesLine(edge, { from: [100, 0], to: [0, 0] }),
    ).toBe(true);
    expect(
      drawingShapeEdgeMatchesLine(edge, { from: [0, 10], to: [100, 10] }),
    ).toBe(false);
  });

  it("connects the two clicked edges into one rectangle using their bounds", () => {
    const leftOpenEdge = {
      from: [0, 0] as [number, number],
      to: [0, 76.5] as [number, number],
    };
    const rightOpenEdge = {
      from: [300, 0] as [number, number],
      to: [300, 180] as [number, number],
    };

    const result = connectEdgesToRectangle({
      firstEdge: leftOpenEdge,
      secondEdge: rightOpenEdge,
      scale: SCALE,
    });

    expect(result.rect).toEqual({ x: 0, y: 0, w: 300, h: 180 });
    expect(result.segment).toMatchObject({
      x: 0,
      y: 0,
      w: 300,
      h: 180,
      lengthIn: 100,
      widthIn: 60,
      orientation: "horizontal",
    });
  });

  it("compares exact same edge coordinates", () => {
    expect(
      drawingShapeEdgesEqual(
        { from: [0, 0], to: [0, 100] },
        { from: [0, 0], to: [0, 100] },
      ),
    ).toBe(true);
  });
});
