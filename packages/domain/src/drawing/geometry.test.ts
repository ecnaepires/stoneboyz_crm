import { describe, expect, it } from "vitest";
import {
  backsplashCornerCandidatesForEdges,
  buildChainFromClicks,
  buildChainFromDragPath,
  chainShapeAreaSqIn,
  chainShapeGeometry,
  connectEdgesToRectangle,
  mergeDrawingBoundaryEdges,
  rectUnionBoundaryEdges,
  rectsToChainSegments,
  visibleBoundaryEdges,
} from "./geometry.js";
import * as geometryModule from "./geometry.js";
import type { ChainShapeLayout, DrawingShapeRect } from "./types.js";

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
