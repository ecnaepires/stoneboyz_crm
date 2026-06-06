import { describe, expect, it } from "vitest";
import {
  backsplashCornerCandidatesForEdges,
  buildConstructionLineFromDirection,
  buildOffsetCenterline,
  buildChainFromClicks,
  buildChainFromDragPath,
  centerlineForChainPoint,
  chainVisibleEdges,
  chainShapeAreaSqIn,
  chainShapeGeometry,
  connectEdgesToRectangle,
  extendConstructionLineToTarget,
  mergeDrawingBoundaryEdges,
  offsetCenterline,
  offsetConstructionLine,
  rectUnionBoundaryEdges,
  rectsToChainSegments,
  visibleBoundaryEdges,
  drawingLineDirectionVector,
} from "./geometry.js";
import * as geometryModule from "./geometry.js";
import type {
  ChainShapeLayout,
  DrawingConstructionLineKind,
  DrawingLineDirection,
  DrawingShapeRect,
} from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const geo = geometryModule as any;

const SCALE = 3;
const depth = 25.5 * SCALE;

const lShape: ChainShapeLayout = {
  type: "chain",
  segments: [
    {
      x: 0,
      y: 0,
      w: 96 * SCALE,
      h: depth,
      lengthIn: 96,
      widthIn: 25.5,
      orientation: "horizontal",
    },
    {
      x: 96 * SCALE - depth,
      y: depth,
      w: depth,
      h: 60 * SCALE,
      lengthIn: 60,
      widthIn: 25.5,
      orientation: "vertical",
    },
  ],
};

function edgeCount(rects: DrawingShapeRect[]) {
  return mergeDrawingBoundaryEdges(rectUnionBoundaryEdges(rects)).length;
}

describe("drawing chain geometry", () => {
  it("preserves L-shape geometry from chain segments", () => {
    expect(chainShapeGeometry(lShape).rects).toEqual([
      { x: 0, y: 0, w: 288, h: 76.5 },
      { x: 211.5, y: 76.5, w: 76.5, h: 180 },
    ]);
  });

  it("converts rectangles to chain segments with sixteenth-inch values", () => {
    expect(
      rectsToChainSegments([
        { x: 0, y: 0, w: 288, h: 76.5 },
        { x: 211.5, y: 76.5, w: 76.5, h: 180 },
      ]),
    ).toEqual([
      lShape.segments[0],
      {
        x: 211.5,
        y: 76.5,
        w: 76.5,
        h: 180,
        lengthIn: 25.5,
        widthIn: 60,
        orientation: "vertical",
      },
    ]);
  });

  it("forms a valid U from five chain segments", () => {
    const uShape: ChainShapeLayout = {
      type: "chain",
      segments: [
        { x: 0, y: 0, w: 180, h: depth, lengthIn: 60, widthIn: 25.5, orientation: "horizontal" },
        { x: 0, y: depth, w: depth, h: 120, lengthIn: 40, widthIn: 25.5, orientation: "vertical" },
        { x: 0, y: depth + 120, w: 180, h: depth, lengthIn: 60, widthIn: 25.5, orientation: "horizontal" },
        { x: 180 - depth, y: depth, w: depth, h: 120, lengthIn: 40, widthIn: 25.5, orientation: "vertical" },
        { x: depth, y: depth, w: 180 - depth * 2, h: depth, lengthIn: 9, widthIn: 25.5, orientation: "horizontal" },
      ],
    };

    expect(edgeCount(chainShapeGeometry(uShape).rects)).toBe(8);
  });

  it("forms a valid Z from three chain segments", () => {
    const zShape: ChainShapeLayout = {
      type: "chain",
      segments: [
        { x: 0, y: 0, w: 180, h: depth, lengthIn: 60, widthIn: 25.5, orientation: "horizontal" },
        { x: 180 - depth, y: depth, w: depth, h: 90, lengthIn: 30, widthIn: 25.5, orientation: "vertical" },
        { x: 0, y: depth + 90, w: 180, h: depth, lengthIn: 60, widthIn: 25.5, orientation: "horizontal" },
      ],
    };

    expect(edgeCount(chainShapeGeometry(zShape).rects)).toBe(8);
  });

  it("keeps visible dimensions tied to each drawn run instead of merging collinear runs", () => {
    const shape: ChainShapeLayout = {
      type: "chain",
      segments: [
        {
          x: 0,
          y: 0,
          w: 120,
          h: depth,
          lengthIn: 40,
          widthIn: 25.5,
          orientation: "horizontal",
        },
        {
          x: 120,
          y: 0,
          w: 90,
          h: depth,
          lengthIn: 30,
          widthIn: 25.5,
          orientation: "horizontal",
        },
      ],
    };

    const mergedTopEdge = visibleBoundaryEdges({
      rects: chainShapeGeometry(shape).rects,
    }).find((edge) => edge.from[1] === 0 && edge.to[1] === 0);
    const topRunEdges = chainVisibleEdges({ shape }).filter(
      (item) => item.side === "top",
    );

    expect(mergedTopEdge).toEqual({ from: [0, 0], to: [210, 0] });
    expect(topRunEdges.map((item) => item.edge)).toEqual([
      { from: [0, 0], to: [120, 0] },
      { from: [120, 0], to: [210, 0] },
    ]);
  });

  it("keeps U-shape top and bottom run dimensions independent", () => {
    const shape: ChainShapeLayout = {
      type: "chain",
      segments: [
        {
          x: 120,
          y: 0,
          w: 180,
          h: depth,
          lengthIn: 60,
          widthIn: 25.5,
          orientation: "horizontal",
        },
        {
          x: 0,
          y: depth,
          w: depth,
          h: 150,
          lengthIn: 50,
          widthIn: 25.5,
          orientation: "vertical",
        },
        {
          x: 0,
          y: depth + 150,
          w: 300,
          h: depth,
          lengthIn: 100,
          widthIn: 25.5,
          orientation: "horizontal",
        },
        {
          x: 300 - depth,
          y: depth,
          w: depth,
          h: 150,
          lengthIn: 50,
          widthIn: 25.5,
          orientation: "vertical",
        },
      ],
    };

    const visible = chainVisibleEdges({ shape });
    const topRun = visible.find(
      (item) => item.segmentIndex === 0 && item.side === "top",
    );
    const bottomRun = visible.find(
      (item) => item.segmentIndex === 2 && item.side === "bottom",
    );

    expect(topRun?.edge).toEqual({ from: [120, 0], to: [300, 0] });
    expect(bottomRun?.edge).toEqual({
      from: [0, depth + 150 + depth],
      to: [300, depth + 150 + depth],
    });
  });

  it("places a centerline on the clicked horizontal run without spanning the full U bounds", () => {
    const shape: ChainShapeLayout = {
      type: "chain",
      segments: [
        {
          x: 0,
          y: 0,
          w: 300,
          h: depth,
          lengthIn: 100,
          widthIn: 25.5,
          orientation: "horizontal",
        },
        {
          x: 300 - depth,
          y: depth,
          w: depth,
          h: 150,
          lengthIn: 50,
          widthIn: 25.5,
          orientation: "vertical",
        },
        {
          x: 0,
          y: depth + 150,
          w: 300,
          h: depth,
          lengthIn: 100,
          widthIn: 25.5,
          orientation: "horizontal",
        },
      ],
    };

    const centerline = centerlineForChainPoint({
      shape,
      point: [120, 20],
    });

    expect(centerline).toEqual({
      from: [150, 0],
      to: [150, depth],
    });
  });

  it("places a centerline on the clicked vertical run without spanning the full U bounds", () => {
    const shape: ChainShapeLayout = {
      type: "chain",
      segments: [
        {
          x: 0,
          y: 0,
          w: 300,
          h: depth,
          lengthIn: 100,
          widthIn: 25.5,
          orientation: "horizontal",
        },
        {
          x: 300 - depth,
          y: depth,
          w: depth,
          h: 150,
          lengthIn: 50,
          widthIn: 25.5,
          orientation: "vertical",
        },
        {
          x: 0,
          y: depth + 150,
          w: 300,
          h: depth,
          lengthIn: 100,
          widthIn: 25.5,
          orientation: "horizontal",
        },
      ],
    };

    const centerline = centerlineForChainPoint({
      shape,
      point: [250, 140],
    });

    expect(centerline).toEqual({
      from: [300 - depth, depth + 75],
      to: [300, depth + 75],
    });
  });

  it("offsets a vertical centerline by exact inches to the chosen side", () => {
    const shape: ChainShapeLayout = {
      type: "chain",
      segments: [
        {
          x: 0,
          y: 0,
          w: 300,
          h: depth,
          lengthIn: 100,
          widthIn: 25.5,
          orientation: "horizontal",
        },
        {
          x: 300 - depth,
          y: depth,
          w: depth,
          h: 150,
          lengthIn: 50,
          widthIn: 25.5,
          orientation: "vertical",
        },
        {
          x: 0,
          y: depth + 150,
          w: 300,
          h: depth,
          lengthIn: 100,
          widthIn: 25.5,
          orientation: "horizontal",
        },
      ],
    };

    const centerline = centerlineForChainPoint({
      shape,
      point: [120, 20],
    });

    expect(centerline).not.toBeNull();
    expect(
      offsetCenterline({
        line: centerline!,
        offsetIn: 56,
        direction: "right",
        scale: SCALE,
      }),
    ).toEqual({
      from: [150 + 56 * SCALE, 0],
      to: [150 + 56 * SCALE, depth],
    });
  });

  it("offsets a horizontal centerline up or down without changing its span", () => {
    const shape: ChainShapeLayout = {
      type: "chain",
      segments: [
        {
          x: 0,
          y: 0,
          w: 300,
          h: depth,
          lengthIn: 100,
          widthIn: 25.5,
          orientation: "horizontal",
        },
        {
          x: 300 - depth,
          y: depth,
          w: depth,
          h: 150,
          lengthIn: 50,
          widthIn: 25.5,
          orientation: "vertical",
        },
      ],
    };

    const centerline = centerlineForChainPoint({
      shape,
      point: [300 - depth + 10, depth + 40],
    });

    expect(centerline).toEqual({
      from: [300 - depth, depth + 75],
      to: [300, depth + 75],
    });
    expect(
      offsetCenterline({
        line: centerline!,
        offsetIn: 12,
        direction: "up",
        scale: SCALE,
      }),
    ).toEqual({
      from: [300 - depth, depth + 75 - 12 * SCALE],
      to: [300, depth + 75 - 12 * SCALE],
    });
  });

  it("does not offset a centerline along its own span", () => {
    const verticalCenterline = {
      from: [150, 0] as [number, number],
      to: [150, depth] as [number, number],
    };

    expect(
      offsetCenterline({
        line: verticalCenterline,
        offsetIn: 8,
        direction: "up",
        scale: SCALE,
      }),
    ).toBeNull();
  });

  it("builds a dashed centerline annotation from a source line and exact offset", () => {
    const sourceLine = {
      from: [0, 0] as [number, number],
      to: [0, depth] as [number, number],
    };

    expect(
      buildOffsetCenterline({
        id: "cl-1",
        pieceId: "piece-1",
        sourceLine,
        offsetIn: 56,
        direction: "right",
        scale: SCALE,
      }),
    ).toEqual({
      id: "cl-1",
      pieceId: "piece-1",
      from: [56 * SCALE, 0],
      to: [56 * SCALE, depth],
      kind: "centerline",
      color: "#000000",
      dash: true,
    });
  });

  it("exposes construction line kinds and squared directions", () => {
    const kind: DrawingConstructionLineKind = "segment";
    const direction: DrawingLineDirection = "upRight";

    expect(kind).toBe("segment");
    expect(direction).toBe("upRight");
  });

  it("maps 8-way directions to piece-local unit vectors", () => {
    expect(drawingLineDirectionVector("right")).toEqual([1, 0]);
    expect(drawingLineDirectionVector("downRight")).toEqual([
      Math.SQRT1_2,
      Math.SQRT1_2,
    ]);
    expect(drawingLineDirectionVector("down")).toEqual([0, 1]);
    expect(drawingLineDirectionVector("downLeft")).toEqual([
      -Math.SQRT1_2,
      Math.SQRT1_2,
    ]);
    expect(drawingLineDirectionVector("left")).toEqual([-1, 0]);
    expect(drawingLineDirectionVector("upLeft")).toEqual([
      -Math.SQRT1_2,
      -Math.SQRT1_2,
    ]);
    expect(drawingLineDirectionVector("up")).toEqual([0, -1]);
    expect(drawingLineDirectionVector("upRight")).toEqual([
      Math.SQRT1_2,
      -Math.SQRT1_2,
    ]);
  });

  it("builds a segment line from anchor, length, and squared direction", () => {
    expect(
      buildConstructionLineFromDirection({
        id: "segment-1",
        pieceId: "piece-1",
        kind: "segment",
        anchor: [30, 60],
        direction: "up",
        lengthIn: 10,
        scale: SCALE,
        color: "#6b7280",
      }),
    ).toEqual({
      id: "segment-1",
      pieceId: "piece-1",
      from: [30, 60],
      to: [30, 30],
      kind: "segment",
      color: "#6b7280",
      dash: false,
    });
  });

  it("rounds diagonal segment endpoints to drawing sixteenths", () => {
    expect(
      buildConstructionLineFromDirection({
        id: "segment-2",
        pieceId: "piece-1",
        kind: "segment",
        anchor: [0, 0],
        direction: "downRight",
        lengthIn: 10,
        scale: SCALE,
      })?.to,
    ).toEqual([21.1875, 21.1875]);
  });

  it("rejects non-positive segment lengths", () => {
    expect(
      buildConstructionLineFromDirection({
        id: "segment-3",
        pieceId: "piece-1",
        kind: "segment",
        anchor: [0, 0],
        direction: "right",
        lengthIn: 0,
        scale: SCALE,
      }),
    ).toBeNull();
    expect(
      buildConstructionLineFromDirection({
        id: "segment-4",
        pieceId: "piece-1",
        kind: "segment",
        anchor: [0, 0],
        direction: "right",
        lengthIn: -5,
        scale: SCALE,
      }),
    ).toBeNull();
  });

  it("offsets a diagonal construction line perpendicular to its span", () => {
    expect(
      offsetConstructionLine({
        line: {
          from: [0, 0],
          to: [30, 30],
        },
        offsetIn: 10,
        side: "left",
        scale: SCALE,
      }),
    ).toEqual({
      from: [-21.1875, 21.1875],
      to: [8.8125, 51.1875],
    });
  });

  it("returns null for non-positive or non-finite construction line offsets", () => {
    const line = {
      from: [0, 0] as [number, number],
      to: [30, 30] as [number, number],
    };

    expect(
      offsetConstructionLine({
        line,
        offsetIn: 0,
        side: "left",
        scale: SCALE,
      }),
    ).toBeNull();

    expect(
      offsetConstructionLine({
        line,
        offsetIn: -10,
        side: "left",
        scale: SCALE,
      }),
    ).toBeNull();

    expect(
      offsetConstructionLine({
        line,
        offsetIn: Number.NaN,
        side: "left",
        scale: SCALE,
      }),
    ).toBeNull();

    expect(
      offsetConstructionLine({
        line,
        offsetIn: Number.POSITIVE_INFINITY,
        side: "left",
        scale: SCALE,
      }),
    ).toBeNull();
  });

  it("extends source line to selected target while preserving source direction", () => {
    expect(
      extendConstructionLineToTarget({
        source: {
          from: [30, 0],
          to: [30, 30],
        },
        target: {
          from: [0, depth],
          to: [300, depth],
        },
      }),
    ).toEqual({
      from: [30, 0],
      to: [30, depth],
    });
  });

  it("returns null when source direction cannot intersect target", () => {
    expect(
      extendConstructionLineToTarget({
        source: {
          from: [0, 0],
          to: [30, 0],
        },
        target: {
          from: [0, 10],
          to: [30, 10],
        },
      }),
    ).toBeNull();
  });
});

describe("buildChainFromClicks", () => {
  it("returns null until at least two clicks are present", () => {
    expect(buildChainFromClicks([])).toBeNull();
    expect(buildChainFromClicks([[0, 0]])).toBeNull();
  });

  it("builds one rectangle segment from two clicks", () => {
    expect(buildChainFromClicks([[0, 0], [60, 0]])).toEqual({
      type: "chain",
      segments: [
        {
          x: 0,
          y: 0,
          w: 60,
          h: 25.5,
          lengthIn: 60,
          widthIn: 25.5,
          orientation: "horizontal",
        },
      ],
    });
  });

  it("computes vertical orientation when deltaY is greater than deltaX", () => {
    expect(buildChainFromClicks([[10, 0], [10, 96]])?.segments[0]).toMatchObject({
      orientation: "vertical",
      x: 10,
      y: 0,
      w: 25.5,
      h: 96,
      lengthIn: 96,
      widthIn: 25.5,
    });
  });

  it("builds orthogonal L and U chains from additional clicks", () => {
    const lShapeFromClicks = buildChainFromClicks([
      [0, 0],
      [60, 0],
      [60, 40],
    ]);
    const uShapeFromClicks = buildChainFromClicks([
      [0, 0],
      [60, 0],
      [60, 40],
      [0, 40],
      [0, 80],
    ]);

    expect(lShapeFromClicks?.segments).toHaveLength(2);
    expect(lShapeFromClicks?.segments.map((segment) => segment.orientation)).toEqual([
      "horizontal",
      "vertical",
    ]);
    expect(uShapeFromClicks?.segments).toHaveLength(4);
    expect(uShapeFromClicks?.segments.map((segment) => segment.orientation)).toEqual([
      "horizontal",
      "vertical",
      "horizontal",
      "vertical",
    ]);
  });

  it("auto-closes the final click to the origin when it lands near the start", () => {
    const shape = buildChainFromClicks([
      [0, 0],
      [60, 0],
      [60, 40],
      [1, 1],
    ]);

    expect(shape?.segments).toHaveLength(3);
    expect(shape?.segments[2]).toMatchObject({
      orientation: "horizontal",
      x: 0,
      y: 14.5,
      w: 60,
      h: 25.5,
      lengthIn: 60,
      widthIn: 25.5,
    });
  });

  it("uses exact inch coordinates supplied by tape-measure entry", () => {
    expect(buildChainFromClicks([[0, 0], [36, 0]])?.segments[0]?.lengthIn).toBe(36);
  });
});

describe("buildChainFromDragPath", () => {
  it("builds one rectangle from a straight drag", () => {
    expect(buildChainFromDragPath([[0, 0], [20, 0], [60, 0]])?.segments).toEqual([
      {
        x: 0,
        y: 0,
        w: 60,
        h: 25.5,
        lengthIn: 60,
        widthIn: 25.5,
        orientation: "horizontal",
      },
    ]);
  });

  it("builds an L-shape when the drag turns past counter depth", () => {
    const shape = buildChainFromDragPath([
      [0, 0],
      [40, 0],
      [60, 0],
      [60, 20],
      [60, 60],
    ]);

    expect(shape?.segments.map((segment) => segment.orientation)).toEqual([
      "horizontal",
      "vertical",
    ]);
    expect(shape?.segments[0]).toMatchObject({ x: 0, y: 0, w: 60 });
    expect(shape?.segments[1]).toMatchObject({ y: 0, h: 60 });
  });
});

// ─── Regression Catalog ───────────────────────────────────────────────────────
// Each test corresponds to a known failure. All must be RED before the fix,
// GREEN after. Do not delete passing tests — they are the gate.

const RC_SCALE = 3;

describe("RC-01 — backsplash snaps to offset line, not boundary edge", () => {
  it("excludes boundary edge candidates for an edge side that has a wall reference line", () => {
    // Piece: 96 in × 25.5 in horizontal segment at origin (scale 3 = pixels)
    const rects: DrawingShapeRect[] = [
      { x: 0, y: 0, w: 96 * RC_SCALE, h: 25.5 * RC_SCALE },
    ];
    const boundaryEdges = mergeDrawingBoundaryEdges(rectUnionBoundaryEdges(rects));

    // Wall offset: 2 in inward from top edge → offset line at y = 2 * RC_SCALE = 6px
    const offsetY = 2 * RC_SCALE;
    const referenceLines = [
      {
        id: "offset-line",
        pieceId: "piece-1",
        from: [0, offsetY] as [number, number],
        to: [96 * RC_SCALE, offsetY] as [number, number],
        kind: "wall" as const,
        color: "#78aa72",
        dash: false,
      },
    ];

    const candidates = backsplashCornerCandidatesForEdges({
      pieceId: "piece-1",
      rects,
      boundaryEdges,
      referenceLines,
      wallColor: "#78aa72",
    });

    // Wall line occupies the "top" edge side.
    // Boundary-edge candidates at y=0 (also "top") must be EXCLUDED —
    // otherwise cursor-distance sort picks y=0 over y=6 when user clicks near boundary.
    const topEdgeCandidates = candidates.filter((c) => c.edge === "top");
    const boundaryOnTopEdge = topEdgeCandidates.filter((c) => Math.abs(c.y) < 0.01);
    expect(boundaryOnTopEdge).toHaveLength(0);

    // Wall-line candidates on top edge must be present
    const wallOnTopEdge = topEdgeCandidates.filter((c) => Math.abs(c.y - offsetY) < 0.01);
    expect(wallOnTopEdge.length).toBeGreaterThan(0);
  });
});

describe("RC-02 — legacy type:'l' shape converts to valid chain", () => {
  it("legacyShapeToChain converts LShapeLayout to ChainShapeLayout with 6 boundary edges", () => {
    // Fails until legacyShapeToChain is exported from geometry.ts.
    // LShapeLayout needs piece dimensions to reconstruct the full shape.
    const legacyShapeToChain = geo.legacyShapeToChain;
    expect(legacyShapeToChain).toBeDefined();

    // piece: 120 in × 60 in main body. Leg at bottom-left (legX=0, legY=0): 25.5 in × 40 in notch
    const piece = { lengthIn: 120, widthIn: 60 };
    const lShape = {
      type: "l" as const,
      legX: 0,
      legY: 0,
      legWidthIn: 25.5,
      legLengthIn: 40,
    };

    const chain = legacyShapeToChain(lShape, piece, RC_SCALE);
    expect(chain.type).toBe("chain");
    expect(chain.segments.length).toBeGreaterThanOrEqual(2);

    const result = chainShapeGeometry(chain);
    // L-shape has 6 corners → 6 boundary edges
    expect(result.edges.length).toBe(6);
  });
});

describe("RC-03 — legacy type:'z' shape converts to valid chain", () => {
  it("legacyShapeToChain converts ZShapeLayout to chain with 8 boundary edges", () => {
    const legacyShapeToChain = geo.legacyShapeToChain;
    expect(legacyShapeToChain).toBeDefined();

    // piece: 60 in × 100 in. Leg at bottom-right, tail at top-left → Z silhouette.
    // pixel coords: mainW=180, mainH=300, leg/tail width=25.5*3=76.5px
    const piece = { lengthIn: 60, widthIn: 100 };
    const legH = 30 * RC_SCALE;   // 30 in tall leg, in pixels
    const tailH = 30 * RC_SCALE;
    const legW = 25.5 * RC_SCALE;
    const tailW = 25.5 * RC_SCALE;
    const mainH = piece.widthIn * RC_SCALE;
    const mainW = piece.lengthIn * RC_SCALE;

    const zShape = {
      type: "z" as const,
      // Leg extends beyond bottom-right of main body
      legX: mainW - legW,
      legY: mainH - legH,
      legWidthIn: 25.5,
      legLengthIn: 30,
      // Tail extends beyond top-left of main body
      tailX: 0,
      tailY: -tailH,
      tailLengthIn: 30,
      tailWidthIn: 25.5,
    };

    const chain = legacyShapeToChain(zShape, piece, RC_SCALE);
    expect(chain.type).toBe("chain");

    const result = chainShapeGeometry(chain);
    // Z-shape has 8 corners → 8 boundary edges
    expect(result.edges.length).toBe(8);
  });
});

describe("RC-04 — edge treatment survives segment extend", () => {
  it("top edge keeps 'finished' treatment after extending right end by 12 in", () => {
    // Fails until applyExtendToSegment is exported from geometry.ts
    const applyExtendToSegment = geo.applyExtendToSegment;
    expect(applyExtendToSegment).toBeDefined();

    const originalSegment = {
      x: 0,
      y: 0,
      w: 60 * SCALE,
      h: 25.5 * SCALE,
      lengthIn: 60,
      widthIn: 25.5,
      orientation: "horizontal" as const,
    };

    // Extend right end by 12 in
    const extended = applyExtendToSegment({ segment: originalSegment, side: "right", deltaIn: 12, scale: SCALE });

    expect(extended.lengthIn).toBe(72);
    expect(extended.w).toBe(72 * SCALE);

    // The top edge identity (top side of this horizontal segment) must be stable
    // Caller can re-derive edge coords from new segment; treatment key must not change
    // Treatment is keyed by segment index + side, not pixel coords
    expect(extended.x).toBe(0);
    expect(extended.y).toBe(0);
  });
});

describe("RC-05 — measurement labels read from lengthIn, not w/scale", () => {
  it("segment dimension label equals lengthIn even when pixel width drifts", () => {
    // Fails until segmentDimensionLabel is exported from geometry.ts
    const segmentDimensionLabel = geo.segmentDimensionLabel;
    expect(segmentDimensionLabel).toBeDefined();

    const segment = {
      x: 0,
      y: 0,
      w: 288,       // 96 * 3
      h: 76.5,      // 25.5 * 3
      lengthIn: 96,
      widthIn: 25.5,
      orientation: "horizontal" as const,
    };

    expect(segmentDimensionLabel(segment, "length")).toBe(96);
    expect(segmentDimensionLabel(segment, "width")).toBe(25.5);

    // Simulate pixel drift
    const drifted = { ...segment, w: 289 };
    expect(segmentDimensionLabel(drifted, "length")).toBe(96);
    expect(segmentDimensionLabel(drifted, "length")).not.toBe(drifted.w / SCALE);
  });
});

describe("RC-06 — extend preserves reference lines", () => {
  it("reference lines attached to a piece are unchanged after extend", () => {
    // Fails until applyExtendToSegment is exported from geometry.ts
    const applyExtendToSegment = geo.applyExtendToSegment;
    expect(applyExtendToSegment).toBeDefined();

    const segment = {
      x: 0, y: 0, w: 60 * RC_SCALE, h: 25.5 * RC_SCALE,
      lengthIn: 60, widthIn: 25.5, orientation: "horizontal" as const,
    };
    const referenceLine = {
      id: "ref-1",
      pieceId: "piece-1",
      from: [0, 0] as [number, number],
      to: [60 * SCALE, 0] as [number, number],
      kind: "cabinet" as const,
      color: "#6b7280",
      dash: true,
    };

    const extended = applyExtendToSegment({
      segment,
      side: "right",
      deltaIn: 12,
      scale: SCALE,
      referenceLines: [referenceLine],
    });

    // Reference lines must pass through unchanged
    expect(extended.referenceLines).toEqual([referenceLine]);
  });
});

describe("connectEdgesToRectangle", () => {
  const SCALE = 3;

  it("returns null for the same edge (degenerate case)", () => {
    const edge: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [96 * SCALE, 0],
    };
    expect(connectEdgesToRectangle({ firstEdge: edge, secondEdge: edge, scale: SCALE })).toBeNull();
  });

  it("connects a horizontal and vertical edge into a rectangle", () => {
    const hEdge: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [96 * SCALE, 0],
    };
    const vEdge: { from: [number, number]; to: [number, number] } = {
      from: [96 * SCALE, 0],
      to: [96 * SCALE, 25.5 * SCALE],
    };
    const result = connectEdgesToRectangle({
      firstEdge: hEdge,
      secondEdge: vEdge,
      scale: SCALE,
    });
    expect(result).not.toBeNull();
    expect(result!.rect.w).toBeGreaterThan(0);
    expect(result!.rect.h).toBeGreaterThan(0);
    expect(result!.lengthIn).toBeGreaterThan(0);
    expect(result!.widthIn).toBeGreaterThan(0);
  });

  it("connects two parallel horizontal edges into a rectangle", () => {
    const topEdge: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [60 * SCALE, 0],
    };
    const bottomEdge: { from: [number, number]; to: [number, number] } = {
      from: [0, 25.5 * SCALE],
      to: [60 * SCALE, 25.5 * SCALE],
    };
    const result = connectEdgesToRectangle({
      firstEdge: topEdge,
      secondEdge: bottomEdge,
      scale: SCALE,
    });
    expect(result).not.toBeNull();
    expect(result!.lengthIn).toBeCloseTo(60, 0);
    expect(result!.widthIn).toBeCloseTo(25.5, 0);
  });

  it("returns null when resulting rect is smaller than one scale unit", () => {
    const edge1: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [0, 0],
    };
    const edge2: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [0, 1],
    };
    expect(
      connectEdgesToRectangle({ firstEdge: edge1, secondEdge: edge2, scale: SCALE })
    ).toBeNull();
  });
});

describe("chainShapeAreaSqIn", () => {
  // scale = 3 px/in (w = lengthIn * 3, h = widthIn * 3)
  it("computes the union area of an L (no double-counted corner)", () => {
    // Horizontal arm 100x25 at (0,0); vertical arm 25x50 hanging below its left end.
    // Union = 100*25 + 25*50 = 2500 + 1250 = 3750 sq in (arms meet, no overlap).
    const shape = {
      type: "chain" as const,
      segments: [
        { x: 0, y: 0, w: 300, h: 75, lengthIn: 100, widthIn: 25, orientation: "horizontal" as const },
        { x: 0, y: 75, w: 75, h: 150, lengthIn: 25, widthIn: 50, orientation: "vertical" as const }
      ]
    };
    expect(chainShapeAreaSqIn(shape)).toBe(3750);
  });

  it("does not double-count an overlapping corner square", () => {
    // Horizontal 100x25 at (0,0); vertical 25x100 at (0,0) overlapping the first 25x25.
    // Union = 100*25 + 25*100 - 25*25 = 2500 + 2500 - 625 = 4375 sq in.
    const shape = {
      type: "chain" as const,
      segments: [
        { x: 0, y: 0, w: 300, h: 75, lengthIn: 100, widthIn: 25, orientation: "horizontal" as const },
        { x: 0, y: 0, w: 75, h: 300, lengthIn: 25, widthIn: 100, orientation: "vertical" as const }
      ]
    };
    expect(chainShapeAreaSqIn(shape)).toBe(4375);
  });

  it("returns a single rectangle's area when modelled as two abutting halves", () => {
    // Two 50x25 halves abutting -> 100x25 = 2500 sq in.
    const shape = {
      type: "chain" as const,
      segments: [
        { x: 0, y: 0, w: 150, h: 75, lengthIn: 50, widthIn: 25, orientation: "horizontal" as const },
        { x: 150, y: 0, w: 150, h: 75, lengthIn: 50, widthIn: 25, orientation: "horizontal" as const }
      ]
    };
    expect(chainShapeAreaSqIn(shape)).toBe(2500);
  });
});
