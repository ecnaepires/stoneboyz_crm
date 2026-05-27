import { describe, expect, it } from "vitest";
import {
  chainSegmentAttachmentAxisSide,
  resizeChainSegmentDepth,
} from "./topology.js";
import type { ChainShapeSegment } from "./types.js";

const h: ChainShapeSegment = {
  x: 0,
  y: 0,
  w: 120,
  h: 30,
  lengthIn: 40,
  widthIn: 10,
  orientation: "horizontal",
};

describe("drawing chain topology", () => {
  it("classifies attachment side across top, bottom, left, and right adjacency", () => {
    expect(
      chainSegmentAttachmentAxisSide(h, { ...h, x: -30, w: 30 }, "x"),
    ).toBe("start");
    expect(
      chainSegmentAttachmentAxisSide(h, { ...h, x: 120, w: 30 }, "x"),
    ).toBe("end");
    expect(
      chainSegmentAttachmentAxisSide(h, { ...h, y: -30, h: 30 }, "y"),
    ).toBe("start");
    expect(
      chainSegmentAttachmentAxisSide(h, { ...h, y: 30, h: 30 }, "y"),
    ).toBe("end");
    expect(
      chainSegmentAttachmentAxisSide(h, { ...h, x: 45, y: 45 }, "x"),
    ).toBeNull();
  });

  it("resizes horizontal segment depth and keeps downstream segment attached", () => {
    const segments: ChainShapeSegment[] = [
      {
        x: 0,
        y: 0,
        w: 288,
        h: 76.5,
        lengthIn: 96,
        widthIn: 25.5,
        orientation: "horizontal",
      },
      {
        x: 211.5,
        y: 76.5,
        w: 76.5,
        h: 180,
        lengthIn: 60,
        widthIn: 25.5,
        orientation: "vertical",
      },
    ];

    expect(resizeChainSegmentDepth(segments, 0, 30)).toEqual([
      {
        ...segments[0],
        h: 90,
        widthIn: 30,
      },
      {
        ...segments[1],
        y: 90,
      },
    ]);
  });

  it("resizes vertical segment depth in the perpendicular axis", () => {
    const resized = resizeChainSegmentDepth(
      [
        {
          x: 0,
          y: 0,
          w: 76.5,
          h: 180,
          lengthIn: 60,
          widthIn: 25.5,
          orientation: "vertical",
        },
      ],
      0,
      24,
    );

    expect(resized[0]).toMatchObject({
      w: 72,
      h: 180,
      lengthIn: 60,
      widthIn: 24,
    });
  });

  it("ignores depths below the minimum editable counter depth", () => {
    const segments: ChainShapeSegment[] = [h];

    expect(resizeChainSegmentDepth(segments, 0, 2)).toBe(segments);
  });
});
