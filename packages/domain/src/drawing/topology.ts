import type {
  ChainShapeSegment,
  DrawingShapeEdge,
} from "./types.js";

const CHAIN_JOIN_TOLERANCE_PX = 2;

function roundDrawingInches(value: number) {
  return Math.round(value * 16) / 16;
}

function valuesNear(a: number, b: number) {
  return Math.abs(a - b) <= CHAIN_JOIN_TOLERANCE_PX;
}

export function chainSegmentAttachmentSide(
  segment: ChainShapeSegment,
  neighbor: ChainShapeSegment,
): "start" | "end" | null {
  if (segment.orientation === "horizontal") {
    const depthPx = segment.h;
    if (
      valuesNear(neighbor.x, segment.x) ||
      valuesNear(neighbor.x + neighbor.w, segment.x + depthPx)
    ) {
      return "start";
    }
    if (
      valuesNear(neighbor.x, segment.x + segment.w - depthPx) ||
      valuesNear(neighbor.x + neighbor.w, segment.x + segment.w)
    ) {
      return "end";
    }
    return null;
  }

  const depthPx = segment.w;
  if (
    valuesNear(neighbor.y, segment.y) ||
    valuesNear(neighbor.y + neighbor.h, segment.y + depthPx)
  ) {
    return "start";
  }
  if (
    valuesNear(neighbor.y, segment.y + segment.h - depthPx) ||
    valuesNear(neighbor.y + neighbor.h, segment.y + segment.h)
  ) {
    return "end";
  }
  return null;
}

export function chainSegmentAttachmentAxisSide(
  segment: ChainShapeSegment,
  neighbor: ChainShapeSegment,
  axis: "x" | "y",
): "start" | "end" | null {
  if (axis === "x") {
    if (
      valuesNear(neighbor.x, segment.x) ||
      valuesNear(neighbor.x + neighbor.w, segment.x)
    ) {
      return "start";
    }
    if (
      valuesNear(neighbor.x, segment.x + segment.w) ||
      valuesNear(neighbor.x + neighbor.w, segment.x + segment.w)
    ) {
      return "end";
    }
    return null;
  }

  if (
    valuesNear(neighbor.y, segment.y) ||
    valuesNear(neighbor.y + neighbor.h, segment.y)
  ) {
    return "start";
  }
  if (
    valuesNear(neighbor.y, segment.y + segment.h) ||
    valuesNear(neighbor.y + neighbor.h, segment.y + segment.h)
  ) {
    return "end";
  }
  return null;
}

export function resizeChainSegments(
  segments: ChainShapeSegment[],
  segmentIndex: number,
  numericValue: number,
  edge: DrawingShapeEdge,
  scale = 3,
) {
  const editedSegment = segments[segmentIndex];
  if (!editedSegment) return segments;

  const horizontalEdge = Math.abs(edge.from[1] - edge.to[1]) < 0.001;
  const resizeAxis: "x" | "y" = horizontalEdge ? "x" : "y";
  const oldSizePx = resizeAxis === "x" ? editedSegment.w : editedSegment.h;
  const oldEdgeSizePx =
    resizeAxis === "x"
      ? Math.abs(edge.from[0] - edge.to[0])
      : Math.abs(edge.from[1] - edge.to[1]);
  const newSizePx = Math.max(
    oldSizePx + numericValue * scale - oldEdgeSizePx,
    scale,
  );
  const deltaPx = newSizePx - oldSizePx;
  if (Math.abs(deltaPx) < 0.001) return segments;

  const nextSegment = segments[segmentIndex + 1];
  const previousSegment = segments[segmentIndex - 1];
  const downstreamSide = nextSegment
    ? chainSegmentAttachmentAxisSide(editedSegment, nextSegment, resizeAxis)
    : null;
  const previousSide = previousSegment
    ? chainSegmentAttachmentAxisSide(editedSegment, previousSegment, resizeAxis)
    : null;
  const resizeFromEnd =
    downstreamSide === "end" ||
    (downstreamSide === null && previousSide !== "end");

  return segments.map((segment, index) => {
    if (index < segmentIndex) return segment;

    if (index === segmentIndex) {
      if (resizeAxis === "x") {
        return {
          ...segment,
          x: resizeFromEnd ? segment.x : segment.x - deltaPx,
          w: newSizePx,
          lengthIn: roundDrawingInches(newSizePx / scale),
        };
      }

      return {
        ...segment,
        y: resizeFromEnd ? segment.y : segment.y - deltaPx,
        h: newSizePx,
        widthIn: roundDrawingInches(newSizePx / scale),
      };
    }

    if (resizeAxis === "x") {
      return {
        ...segment,
        x: segment.x + (resizeFromEnd ? deltaPx : -deltaPx),
      };
    }

    return {
      ...segment,
      y: segment.y + (resizeFromEnd ? deltaPx : -deltaPx),
    };
  });
}

export function resizeChainSegmentDepth(
  segments: ChainShapeSegment[],
  segmentIndex: number,
  depthIn: number,
  scale = 3,
) {
  const editedSegment = segments[segmentIndex];
  if (!editedSegment || !Number.isFinite(depthIn) || depthIn < 4) {
    return segments;
  }

  const oldDepthPx =
    editedSegment.orientation === "horizontal"
      ? editedSegment.h
      : editedSegment.w;
  const newDepthPx = roundDrawingInches(depthIn) * scale;
  const deltaPx = newDepthPx - oldDepthPx;
  if (Math.abs(deltaPx) < 0.001) return segments;

  const depthAxis = editedSegment.orientation === "horizontal" ? "y" : "x";
  const farEdge =
    depthAxis === "y"
      ? editedSegment.y + editedSegment.h
      : editedSegment.x + editedSegment.w;

  return segments.map((segment, index) => {
    if (index === segmentIndex) {
      if (editedSegment.orientation === "horizontal") {
        return {
          ...segment,
          h: newDepthPx,
          widthIn: roundDrawingInches(depthIn),
        };
      }

      return {
        ...segment,
        w: newDepthPx,
        widthIn: roundDrawingInches(depthIn),
      };
    }

    if (index < segmentIndex) return segment;

    if (depthAxis === "y") {
      const attachesToFarEdge =
        valuesNear(segment.y, farEdge) ||
        valuesNear(segment.y + segment.h, farEdge);
      return attachesToFarEdge ? { ...segment, y: segment.y + deltaPx } : segment;
    }

    const attachesToFarEdge =
      valuesNear(segment.x, farEdge) ||
      valuesNear(segment.x + segment.w, farEdge);
    return attachesToFarEdge ? { ...segment, x: segment.x + deltaPx } : segment;
  });
}
