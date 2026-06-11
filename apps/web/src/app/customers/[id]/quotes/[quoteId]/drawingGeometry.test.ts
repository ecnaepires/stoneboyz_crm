import { describe, expect, it } from "vitest";
import {
  applyOffsetToSegments,
  backsplashCornerCandidatesForEdges,
  buildReferenceLineCornerVisuals,
  buildDeletedLine,
  buildOffsetSegment,
  buildReferenceLine,
  connectEdgesToRectangle,
  drawingShapeEdgeMatchesLine,
  drawingShapeEdgesEqual,
  extendReferenceLineToEdges,
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

  it("uses green wall offset endpoints as backsplash snap corners", () => {
    const rects = [{ x: 0, y: 0, w: 300, h: 76.5 }];
    const boundaryEdges = visibleBoundaryEdges({ rects });
    const referenceLines = [
      {
        id: "source",
        pieceId: "piece-1",
        from: [0, 0] as [number, number],
        to: [300, 0] as [number, number],
        kind: "cabinet",
        color: "#6b7280",
        dash: true,
      },
      {
        id: "source:offset",
        pieceId: "piece-1",
        from: [0, -4.5] as [number, number],
        to: [300, -4.5] as [number, number],
        kind: "wall",
        color: "#78aa72",
        dash: false,
      },
    ];

    const candidates = backsplashCornerCandidatesForEdges({
      pieceId: "piece-1",
      rects,
      boundaryEdges,
      referenceLines,
    });

    expect(candidates.slice(0, 2)).toEqual([
      {
        pieceId: "piece-1",
        edge: "top",
        corner: "topLeft",
        x: 0,
        y: -4.5,
        edgeFrom: [0, -4.5],
        edgeTo: [300, -4.5],
      },
      {
        pieceId: "piece-1",
        edge: "top",
        corner: "topRight",
        x: 300,
        y: -4.5,
        edgeFrom: [0, -4.5],
        edgeTo: [300, -4.5],
      },
    ]);
    expect(candidates.some((candidate) => candidate.y === 0)).toBe(true);
  });

  it.each([
    {
      name: "top",
      line: {
        from: [0, -4.5] as [number, number],
        to: [300, -4.5] as [number, number],
      },
      snaps: [
        { edge: "top", corner: "topLeft", x: 0, y: -4.5 },
        { edge: "top", corner: "topRight", x: 300, y: -4.5 },
      ],
    },
    {
      name: "right",
      line: {
        from: [304.5, 0] as [number, number],
        to: [304.5, 76.5] as [number, number],
      },
      snaps: [
        { edge: "right", corner: "topRight", x: 304.5, y: 0 },
        { edge: "right", corner: "bottomRight", x: 304.5, y: 76.5 },
      ],
    },
    {
      name: "bottom",
      line: {
        from: [300, 81] as [number, number],
        to: [0, 81] as [number, number],
      },
      snaps: [
        { edge: "bottom", corner: "bottomRight", x: 300, y: 81 },
        { edge: "bottom", corner: "bottomLeft", x: 0, y: 81 },
      ],
    },
    {
      name: "left",
      line: {
        from: [-4.5, 76.5] as [number, number],
        to: [-4.5, 0] as [number, number],
      },
      snaps: [
        { edge: "left", corner: "bottomLeft", x: -4.5, y: 76.5 },
        { edge: "left", corner: "topLeft", x: -4.5, y: 0 },
      ],
    },
  ])("uses $name wall offset endpoints for backsplash snaps", ({ line, snaps }) => {
    const rects = [{ x: 0, y: 0, w: 300, h: 76.5 }];
    const candidates = backsplashCornerCandidatesForEdges({
      pieceId: "piece-1",
      rects,
      boundaryEdges: visibleBoundaryEdges({ rects }),
      referenceLines: [
        {
          id: "offset",
          pieceId: "piece-1",
          from: line.from,
          to: line.to,
          kind: "wall",
          color: "#78aa72",
          dash: false,
        },
      ],
    });

    expect(
      candidates.slice(0, 2).map((candidate) => ({
        edge: candidate.edge,
        corner: candidate.corner,
        x: candidate.x,
        y: candidate.y,
      })),
    ).toEqual(snaps);
  });

  it("keeps offset wall endpoints selectable even without an anchor-edge overlap", () => {
    const rects = [{ x: 0, y: 0, w: 300, h: 76.5 }];
    const candidates = backsplashCornerCandidatesForEdges({
      pieceId: "piece-1",
      rects,
      boundaryEdges: visibleBoundaryEdges({ rects }),
      referenceLines: [
        {
          id: "trimmed-offset",
          pieceId: "piece-1",
          from: [320, -4.5] as [number, number],
          to: [420, -4.5] as [number, number],
          kind: "wall",
          color: "#78aa72",
          dash: false,
        },
      ],
    });

    expect(candidates.slice(0, 2).map((candidate) => ({
      edge: candidate.edge,
      x: candidate.x,
      y: candidate.y,
    }))).toEqual([
      { edge: "top", x: 320, y: -4.5 },
      { edge: "top", x: 420, y: -4.5 },
    ]);
  });

  it("offers both edge identities at shared rectangle corners", () => {
    const rects = [{ x: 0, y: 0, w: 300, h: 76.5 }];
    const candidates = backsplashCornerCandidatesForEdges({
      pieceId: "piece-1",
      rects,
      boundaryEdges: visibleBoundaryEdges({ rects }),
      referenceLines: [],
    });

    expect(
      candidates
        .filter((candidate) => candidate.x === 300 && candidate.y === 0)
        .map((candidate) => candidate.edge)
        .sort(),
    ).toEqual(["right", "top"]);
    expect(
      candidates
        .filter((candidate) => candidate.x === 300 && candidate.y === 76.5)
        .map((candidate) => candidate.edge)
        .sort(),
    ).toEqual(["bottom", "right"]);
  });

  it("extends vertical centerlines through wall offsets", () => {
    const rects = [{ x: 0, y: 0, w: 300, h: 76.5 }];
    const extended = extendReferenceLineToEdges({
      line: {
        id: "center",
        pieceId: "piece-1",
        from: [150, 0],
        to: [150, 76.5],
        kind: "centerline",
        color: "#000000",
        dash: true,
      },
      rects,
      boundaryEdges: visibleBoundaryEdges({ rects }),
      referenceLines: [
        {
          id: "top-offset",
          pieceId: "piece-1",
          from: [0, -30],
          to: [300, -30],
          kind: "wall",
          color: "#78aa72",
          dash: false,
        },
      ],
    });

    expect(extended).toEqual({
      from: [150, -30],
      to: [150, 76.5],
    });
  });

  it("extends horizontal segments through wall offsets", () => {
    const rects = [{ x: 0, y: 0, w: 300, h: 76.5 }];
    const extended = extendReferenceLineToEdges({
      line: {
        id: "segment",
        pieceId: "piece-1",
        from: [0, 40],
        to: [300, 40],
        kind: "cabinet",
        color: "#78aa72",
      },
      rects,
      boundaryEdges: visibleBoundaryEdges({ rects }),
      referenceLines: [
        {
          id: "right-offset",
          pieceId: "piece-1",
          from: [330, 0],
          to: [330, 76.5],
          kind: "wall",
          color: "#78aa72",
          dash: false,
        },
      ],
    });

    expect(extended).toEqual({
      from: [0, 40],
      to: [330, 40],
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

  it("renders radius visuals across matching wall offset lines while cabinet references stay straight", () => {
    const referenceLines = [
      {
        id: "bottom-cabinet",
        pieceId: "piece-1",
        from: [0, 76.5] as [number, number],
        to: [300, 76.5] as [number, number],
        kind: "cabinet" as const,
        color: "#6b7280",
        dash: true,
      },
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
        id: "bottom-cabinet",
        sourceLineId: "bottom-cabinet",
        pieceId: "piece-1",
        from: [0, 76.5],
        to: [300, 76.5],
        kind: "cabinet",
        color: "#6b7280",
        dash: true,
      },
      {
        id: "bottom-offset",
        sourceLineId: "bottom-offset",
        pieceId: "piece-1",
        from: [0, 81],
        to: [295.5, 81],
        kind: "wall",
        color: "#78aa72",
        dash: false,
      },
      {
        id: "right-offset",
        sourceLineId: "right-offset",
        pieceId: "piece-1",
        from: [304.5, 0],
        to: [304.5, 72],
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
        center: [295.5, 72],
        radius: 9,
        startAngle: 0,
        endAngle: Math.PI / 2,
        sourceLineIds: ["bottom-offset", "right-offset"],
      },
    ]);
  });

  it("renders a two-inch chamfer as one inch on each adjacent edge", () => {
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
          treatment: "clip",
          valueIn: 2,
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
        to: [301.5, 81],
        kind: "wall",
        color: "#78aa72",
        dash: false,
      },
      {
        id: "right-offset",
        sourceLineId: "right-offset",
        pieceId: "piece-1",
        from: [304.5, 0],
        to: [304.5, 78],
        kind: "wall",
        color: "#78aa72",
        dash: false,
      },
    ]);
    expect(result.connectors).toEqual([
      {
        id: "bottom-offset:right-offset:clip",
        pieceId: "piece-1",
        color: "#78aa72",
        from: [301.5, 81],
        to: [304.5, 78],
        sourceLineIds: ["bottom-offset", "right-offset"],
      },
    ]);
    expect(result.arcs).toEqual([]);
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
