import { describe, expect, it } from "vitest";
import {
  buildChainFromClicks,
  buildChainFromDragPath,
  chainShapeGeometry,
  mergeDrawingBoundaryEdges,
  rectUnionBoundaryEdges,
  rectsToChainSegments,
} from "./geometry.js";
import type { ChainShapeLayout, DrawingShapeRect } from "./types.js";

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
