import { describe, expect, it } from "vitest";
import {
  applyOffsetToSegments,
  buildReferenceLineCornerVisuals,
  buildDeletedLine,
  buildOffsetSegment,
  buildReferenceLine,
  connectEdgesToRectangle,
  drawingShapeEdgeMatchesLine,
  drawingShapeEdgesEqual,
  normalizeDrawingRectUnion,
  drawingRectsToChainSegments,
  isRectangularUnion,
  removeReferenceLine,
  visibleBoundaryEdges,
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
      dash: false,
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

  it("marks only the source offset line as dashed", () => {
    const result = applyOffsetToSegments({
      segments: [],
      edge: {
        from: [0, 0] as [number, number],
        to: [300, 0] as [number, number],
      },
      deltaPx: 30,
      scale: SCALE,
      referenceLineId: "line-1",
      pieceId: "piece-1",
    });

    expect(result.referenceLines).toEqual([
      {
        id: "line-1",
        pieceId: "piece-1",
        from: [0, 0],
        to: [300, 0],
        kind: "cabinet",
        color: "#6b7280",
        dash: true,
      },
      {
        id: "line-1:offset",
        pieceId: "piece-1",
        from: [0, 30],
        to: [300, 30],
        kind: "wall",
        color: "#78aa72",
        dash: false,
      },
    ]);
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

    expect(result).not.toBeNull();
    if (!result) return;
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

  it("connects perpendicular open edges by closing the nearest square corner", () => {
    const horizontalOpenEdge = {
      from: [0, 0] as [number, number],
      to: [90, 0] as [number, number],
    };
    const verticalOpenEdge = {
      from: [120, 30] as [number, number],
      to: [120, 120] as [number, number],
    };

    const result = connectEdgesToRectangle({
      firstEdge: horizontalOpenEdge,
      secondEdge: verticalOpenEdge,
      scale: SCALE,
    });

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.rect).toEqual({ x: 90, y: 0, w: 30, h: 30 });
    expect(result.segment).toMatchObject({
      x: 90,
      y: 0,
      w: 30,
      h: 30,
      lengthIn: 10,
      widthIn: 10,
      orientation: "horizontal",
    });
  });

  it("connects only the nearest corner patch when perpendicular fillet candidates exist", () => {
    const horizontalOpenEdge = {
      from: [118.5, 135] as [number, number],
      to: [282.5, 135] as [number, number],
    };
    const verticalOpenEdge = {
      from: [292.5, 76.5] as [number, number],
      to: [292.5, 145] as [number, number],
    };

    const result = connectEdgesToRectangle({
      firstEdge: horizontalOpenEdge,
      secondEdge: verticalOpenEdge,
      scale: SCALE,
      existingRects: [
        { x: 0, y: 0, w: 180, h: 76.5 },
        { x: 118.5, y: 76.5, w: 174, h: 58.5 },
      ],
    });

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.rect).toEqual({ x: 282.5, y: 135, w: 10, h: 10 });
  });

  it("fills only the selected side strip between parallel offset edges", () => {
    const cabinetBottom = {
      from: [0, 76.5] as [number, number],
      to: [300, 76.5] as [number, number],
    };
    const wallBottom = {
      from: [0, 106.5] as [number, number],
      to: [300, 106.5] as [number, number],
    };

    const result = connectEdgesToRectangle({
      firstEdge: cabinetBottom,
      secondEdge: wallBottom,
      scale: SCALE,
      existingRects: [{ x: 0, y: 0, w: 300, h: 76.5 }],
    });

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.rect).toEqual({ x: 0, y: 76.5, w: 300, h: 30 });
  });

  it("supports uneven offsets by connecting only the clicked corner patch", () => {
    const bottomTwentyInchOffset = {
      from: [0, 136.5] as [number, number],
      to: [300, 136.5] as [number, number],
    };
    const rightTenInchOffset = {
      from: [330, 0] as [number, number],
      to: [330, 76.5] as [number, number],
    };

    const result = connectEdgesToRectangle({
      firstEdge: bottomTwentyInchOffset,
      secondEdge: rightTenInchOffset,
      scale: SCALE,
      existingRects: [{ x: 0, y: 0, w: 300, h: 76.5 }],
    });

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.rect).toEqual({ x: 300, y: 76.5, w: 30, h: 60 });
  });

  it("refuses same-edge or zero-area connects", () => {
    const edge = {
      from: [0, 0] as [number, number],
      to: [0, 76.5] as [number, number],
    };
    const sameEdge = connectEdgesToRectangle({
      firstEdge: edge,
      secondEdge: { from: [0, 76.5], to: [0, 0] },
      scale: SCALE,
    });
    const sameLineDifferentSpan = connectEdgesToRectangle({
      firstEdge: edge,
      secondEdge: { from: [0, 100], to: [0, 180] },
      scale: SCALE,
    });

    expect(sameEdge).toBeNull();
    expect(sameLineDifferentSpan).toBeNull();
  });

  it("compares exact same edge coordinates", () => {
    expect(
      drawingShapeEdgesEqual(
        { from: [0, 0], to: [0, 100] },
        { from: [0, 0], to: [0, 100] },
      ),
    ).toBe(true);
  });

  it("filters deleted boundary edges from visible edges", () => {
    const rects = [{ x: 0, y: 0, w: 300, h: 76.5 }];
    const rightEdge = {
      from: [300, 0] as [number, number],
      to: [300, 76.5] as [number, number],
    };

    const visible = visibleBoundaryEdges({
      rects,
      deletedLines: [rightEdge],
    });

    expect(visible).toHaveLength(3);
    expect(
      visible.some((edge) => drawingShapeEdgeMatchesLine(edge, rightEdge)),
    ).toBe(false);
  });

  it("identifies rectangle unions so middle dimensions can be skipped", () => {
    expect(isRectangularUnion([{ x: 0, y: 0, w: 300, h: 76.5 }])).toBe(true);
    expect(
      isRectangularUnion([
        { x: 0, y: 0, w: 300, h: 76.5 },
        { x: 223.5, y: 76.5, w: 76.5, h: 180 },
      ]),
    ).toBe(false);
  });

  it("normalizes overlapping fillet patches into a clean rect union", () => {
    const normalized = normalizeDrawingRectUnion([
      { x: 0, y: 0, w: 180, h: 76.5 },
      { x: 118.5, y: 76.5, w: 174, h: 58.5 },
      { x: 118.5, y: 135, w: 174, h: 10 },
    ]);

    expect(normalized).toEqual([
      { x: 0, y: 0, w: 180, h: 76.5 },
      { x: 118.5, y: 76.5, w: 174, h: 68.5 },
    ]);
  });

  it("applies offset as guide lines without growing the counter", () => {
    const segments = drawingRectsToChainSegments(
      [{ x: 0, y: 0, w: 300, h: 76.5 }],
      SCALE,
    );
    const edge = { from: [0, 0] as [number, number], to: [300, 0] as [number, number] };

    const result = applyOffsetToSegments({
      segments,
      edge,
      deltaPx: -4.5,
      scale: SCALE,
      referenceLineId: "reference-1",
      pieceId: "piece-1",
    });

    expect(result.segments).toEqual(segments);
    expect(result.referenceLines[0]).toMatchObject({
      id: "reference-1",
      pieceId: "piece-1",
      from: [0, 0],
      to: [300, 0],
      kind: "cabinet",
    });
    expect(result.referenceLines[1]).toMatchObject({
      id: "reference-1:offset",
      pieceId: "piece-1",
      from: [0, -4.5],
      to: [300, -4.5],
      kind: "wall",
      color: "#78aa72",
    });
  });

  it("builds deleted lines and removes reference lines by id", () => {
    const edge = { from: [0, 0] as [number, number], to: [0, 76.5] as [number, number] };
    const deleted = buildDeletedLine({
      id: "deleted-1",
      pieceId: "piece-1",
      edge,
    });

    expect(deleted).toEqual({
      id: "deleted-1",
      pieceId: "piece-1",
      from: [0, 0],
      to: [0, 76.5],
    });
    expect(
      removeReferenceLine(
        [
          { id: "keep", pieceId: "piece-1" },
          { id: "delete", pieceId: "piece-1" },
        ],
        "delete",
      ),
    ).toEqual([{ id: "keep", pieceId: "piece-1" }]);
  });

  it("removes only the clicked reference line", () => {
    expect(
      removeReferenceLine(
        [
          { id: "source", pieceId: "piece-1" },
          { id: "source:offset", pieceId: "piece-1" },
          { id: "keep", pieceId: "piece-1" },
        ],
        "source:offset",
      ),
    ).toEqual([
      { id: "source", pieceId: "piece-1" },
      { id: "keep", pieceId: "piece-1" },
    ]);
  });

  it("renders radius visuals across matching wall offset lines", () => {
    const referenceLines = [
      {
        id: "bottom-offset",
        pieceId: "piece-1",
        from: [0, 81] as [number, number],
        to: [300, 81] as [number, number],
        kind: "wall" as const,
        color: "#78aa72",
      },
      {
        id: "right-offset",
        pieceId: "piece-1",
        from: [304.5, 0] as [number, number],
        to: [304.5, 76.5] as [number, number],
        kind: "wall" as const,
        color: "#78aa72",
      },
    ];

    const result = buildReferenceLineCornerVisuals({
      referenceLines,
      rects: [{ x: 0, y: 0, w: 300, h: 76.5 }],
      corners: [
        {
          corner: "bottomRight",
          treatment: "radius",
          valueIn: 3,
        },
      ],
      scale: SCALE,
    });

    expect(result.segments).toEqual([
      {
        id: "bottom-offset",
        sourceLineId: "bottom-offset",
        pieceId: "piece-1",
        from: [0, 81],
        to: [291, 81],
        kind: "wall",
        color: "#78aa72",
        dash: false,
      },
      {
        id: "right-offset",
        sourceLineId: "right-offset",
        pieceId: "piece-1",
        from: [304.5, 0],
        to: [304.5, 67.5],
        kind: "wall",
        color: "#78aa72",
        dash: false,
      },
    ]);
    expect(result.arcs).toEqual([
      {
        id: "bottom-offset:right-offset:radius",
        pieceId: "piece-1",
        color: "#78aa72",
        center: [304.5, 81],
        radius: 13.5,
        startAngle: Math.PI,
        endAngle: (3 * Math.PI) / 2,
        sourceLineIds: ["bottom-offset", "right-offset"],
      },
    ]);
  });

  it("leaves wall lines untouched when offsets do not form a square corner", () => {
    const referenceLines = [
      {
        id: "bottom-offset",
        pieceId: "piece-1",
        from: [0, 81] as [number, number],
        to: [300, 81] as [number, number],
        kind: "wall" as const,
        color: "#78aa72",
      },
      {
        id: "right-offset",
        pieceId: "piece-1",
        from: [306, 0] as [number, number],
        to: [306, 76.5] as [number, number],
        kind: "wall" as const,
        color: "#78aa72",
      },
    ];

    const result = buildReferenceLineCornerVisuals({
      referenceLines,
      rects: [{ x: 0, y: 0, w: 300, h: 76.5 }],
      corners: [
        {
          corner: "bottomRight",
          treatment: "radius",
          valueIn: 3,
        },
      ],
      scale: SCALE,
    });

    expect(result.segments.map((segment) => ({
      id: segment.id,
      from: segment.from,
      to: segment.to,
    }))).toEqual([
      {
        id: "bottom-offset",
        from: [0, 81],
        to: [300, 81],
      },
      {
        id: "right-offset",
        from: [306, 0],
        to: [306, 76.5],
      },
    ]);
    expect(result.arcs).toEqual([]);
  });
});
