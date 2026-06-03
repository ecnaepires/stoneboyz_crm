import type {
  ChainShapeLayout,
  ChainShapeSegment,
  DrawingChainShapeSegment,
  DrawingCornerKey,
  DrawingEdgeKey,
  DrawingCornerTreatment,
  DrawingDeletedLine,
  DrawingReferenceLine,
  DrawingReferenceLineVisualArc,
  DrawingReferenceLineVisualSegment,
  DrawingShapeEdge,
  DrawingShapeRect,
  LShapeLayout,
  PieceShape,
  ZShapeLayout,
} from "./types.js";
import {
  AUTO_CLOSE_THRESHOLD_IN,
  DEFAULT_COUNTER_DEPTH_IN,
  GRID_SNAP_IN,
} from "./constants.js";
import { chainSegmentAttachmentSide } from "./topology.js";

export function roundDrawingInches(value: number) {
  return Math.round(value * 16) / 16;
}

export function drawingValuesNear(a: number, b: number, tolerance = 0.001) {
  return Math.abs(a - b) <= tolerance;
}

function drawingPointDistance(
  left: [number, number],
  right: [number, number],
) {
  return Math.hypot(right[0] - left[0], right[1] - left[1]);
}

function segmentOrientation(
  from: [number, number],
  to: [number, number],
): ChainShapeSegment["orientation"] {
  return Math.abs(to[1] - from[1]) > Math.abs(to[0] - from[0])
    ? "vertical"
    : "horizontal";
}

function dragPathVertices(
  path: [number, number][],
  defaultDepthIn: number,
): [number, number][] {
  const start = path[0];
  const current = path[path.length - 1];
  if (!start || !current) return [];

  const turnThresholdIn = defaultDepthIn + 8 / 3;
  const firstHorizontalIntentIndex = path.findIndex(
    (point) => Math.abs(point[0] - start[0]) >= defaultDepthIn,
  );
  const firstVerticalIntentIndex = path.findIndex(
    (point) => Math.abs(point[1] - start[1]) >= defaultDepthIn,
  );
  const startsVertical =
    firstVerticalIntentIndex >= 0 &&
    (firstHorizontalIntentIndex < 0 ||
      firstVerticalIntentIndex <= firstHorizontalIntentIndex);
  const vertices: [number, number][] = [[...start]];
  let currentAxis: "x" | "y" = startsVertical ? "y" : "x";
  let currentVertex = start;
  let currentEnd: [number, number] = [...start];
  const firstDirectionPoint = path.find(
    (point) => Math.abs(point[0] - start[0]) >= 1,
  );
  let horizontalDirection =
    ((firstDirectionPoint?.[0] ?? current[0]) >= start[0]) ? 1 : -1;
  let verticalDirection = current[1] >= start[1] ? 1 : -1;

  for (const point of path) {
    if (currentAxis === "x") {
      const nextX =
        horizontalDirection > 0
          ? Math.max(point[0], currentVertex[0])
          : Math.min(point[0], currentVertex[0]);
      currentEnd = [nextX, currentVertex[1]];

      if (
        Math.abs(point[1] - currentVertex[1]) > turnThresholdIn &&
        Math.abs(currentEnd[0] - currentVertex[0]) >= defaultDepthIn
      ) {
        vertices.push(currentEnd);
        currentAxis = "y";
        verticalDirection = point[1] >= currentVertex[1] ? 1 : -1;
        currentVertex = currentEnd;
        currentEnd = [currentVertex[0], point[1]];
      }
      continue;
    }

    const nextY =
      verticalDirection > 0
        ? Math.max(point[1], currentVertex[1])
        : Math.min(point[1], currentVertex[1]);
    currentEnd = [currentVertex[0], nextY];

    if (
      Math.abs(point[0] - currentVertex[0]) > turnThresholdIn &&
      Math.abs(currentEnd[1] - currentVertex[1]) >= defaultDepthIn
    ) {
      vertices.push(currentEnd);
      currentAxis = "x";
      horizontalDirection = point[0] >= currentVertex[0] ? 1 : -1;
      currentVertex = currentEnd;
      currentEnd = [point[0], currentVertex[1]];
    }
  }

  const lastVertex = vertices[vertices.length - 1] ?? start;
  if (drawingPointDistance(currentEnd, lastVertex) >= GRID_SNAP_IN) {
    vertices.push(currentEnd);
  }

  return vertices;
}

function chainSegmentFromVertices(params: {
  from: [number, number];
  to: [number, number];
  orientation: ChainShapeSegment["orientation"];
  previous?: { orientation: ChainShapeSegment["orientation"]; direction: number };
  defaultDepthIn: number;
}): ChainShapeSegment {
  const { from, to, orientation, previous, defaultDepthIn } = params;

  if (orientation === "horizontal") {
    const lengthIn = Math.abs(to[0] - from[0]);
    const y =
      previous?.orientation === "vertical" && previous.direction > 0
        ? from[1] - defaultDepthIn
        : from[1];

    return {
      x: Math.min(from[0], to[0]),
      y,
      w: lengthIn,
      h: defaultDepthIn,
      lengthIn,
      widthIn: defaultDepthIn,
      orientation,
    };
  }

  const lengthIn = Math.abs(to[1] - from[1]);
  const x =
    previous?.orientation === "horizontal" && previous.direction > 0
      ? from[0] - defaultDepthIn
      : from[0];

  return {
    x,
    y: Math.min(from[1], to[1]),
    w: defaultDepthIn,
    h: lengthIn,
    lengthIn,
    widthIn: defaultDepthIn,
    orientation,
  };
}

export function buildChainFromClicks(
  clicks: [number, number][],
  defaultDepthIn = DEFAULT_COUNTER_DEPTH_IN,
): ChainShapeLayout | null {
  if (clicks.length < 2) return null;

  const vertices = clicks.map((click) => [...click] as [number, number]);
  const origin = vertices[0];
  const last = vertices[vertices.length - 1];
  if (!origin || !last) return null;

  if (
    vertices.length > 2 &&
    drawingPointDistance(origin, last) <= AUTO_CLOSE_THRESHOLD_IN * 3
  ) {
    vertices[vertices.length - 1] = [...origin];
  }

  const segments: ChainShapeSegment[] = [];
  let previous:
    | { orientation: ChainShapeSegment["orientation"]; direction: number }
    | undefined;

  for (let index = 1; index < vertices.length; index += 1) {
    const from = vertices[index - 1];
    const rawTo = vertices[index];
    if (!from || !rawTo) continue;

    const orientation =
      index === 1
        ? segmentOrientation(from, rawTo)
        : previous?.orientation === "horizontal"
          ? "vertical"
          : "horizontal";
    const to: [number, number] =
      orientation === "horizontal" ? [rawTo[0], from[1]] : [from[0], rawTo[1]];
    const direction =
      orientation === "horizontal" ? Math.sign(to[0] - from[0]) : Math.sign(to[1] - from[1]);

    if (direction === 0) continue;

    segments.push(
      chainSegmentFromVertices({
        from,
        to,
        orientation,
        ...(previous ? { previous } : {}),
        defaultDepthIn,
      }),
    );
    previous = { orientation, direction };
    vertices[index] = to;
  }

  if (segments.length === 0) return null;

  return {
    type: "chain",
    segments,
  };
}

export function buildChainFromDragPath(
  path: [number, number][],
  defaultDepthIn = DEFAULT_COUNTER_DEPTH_IN,
): ChainShapeLayout | null {
  if (path.length < 2) return null;
  return buildChainFromClicks(dragPathVertices(path, defaultDepthIn), defaultDepthIn);
}

export function drawingShapeEdgesEqual(
  left: DrawingShapeEdge,
  right: DrawingShapeEdge,
) {
  return (
    drawingValuesNear(left.from[0], right.from[0]) &&
    drawingValuesNear(left.from[1], right.from[1]) &&
    drawingValuesNear(left.to[0], right.to[0]) &&
    drawingValuesNear(left.to[1], right.to[1])
  );
}

export function drawingShapeEdgeMatchesLine(
  edge: DrawingShapeEdge,
  line: { from: [number, number]; to: [number, number] },
) {
  return (
    drawingShapeEdgesEqual(edge, line) ||
    drawingShapeEdgesEqual(edge, { from: line.to, to: line.from })
  );
}

export function drawingPointKey(x: number, y: number) {
  return `${Number(x.toFixed(4))},${Number(y.toFixed(4))}`;
}

export function rectUnionBoundaryEdges(rects: DrawingShapeRect[]) {
  const xs = Array.from(
    new Set(rects.flatMap((rect) => [rect.x, rect.x + rect.w])),
  ).sort((a, b) => a - b);
  const ys = Array.from(
    new Set(rects.flatMap((rect) => [rect.y, rect.y + rect.h])),
  ).sort((a, b) => a - b);
  const covered = new Set<string>();

  for (let xIndex = 0; xIndex < xs.length - 1; xIndex += 1) {
    for (let yIndex = 0; yIndex < ys.length - 1; yIndex += 1) {
      const x1 = xs[xIndex] ?? 0;
      const x2 = xs[xIndex + 1] ?? x1;
      const y1 = ys[yIndex] ?? 0;
      const y2 = ys[yIndex + 1] ?? y1;
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      const isCovered = rects.some(
        (rect) =>
          centerX >= rect.x &&
          centerX <= rect.x + rect.w &&
          centerY >= rect.y &&
          centerY <= rect.y + rect.h,
      );

      if (isCovered) covered.add(`${xIndex},${yIndex}`);
    }
  }

  const edges: DrawingShapeEdge[] = [];
  covered.forEach((key) => {
    const [xIndex = 0, yIndex = 0] = key.split(",").map(Number);
    const x1 = xs[xIndex] ?? 0;
    const x2 = xs[xIndex + 1] ?? x1;
    const y1 = ys[yIndex] ?? 0;
    const y2 = ys[yIndex + 1] ?? y1;

    if (!covered.has(`${xIndex},${yIndex - 1}`))
      edges.push({ from: [x1, y1], to: [x2, y1] });
    if (!covered.has(`${xIndex + 1},${yIndex}`))
      edges.push({ from: [x2, y1], to: [x2, y2] });
    if (!covered.has(`${xIndex},${yIndex + 1}`))
      edges.push({ from: [x2, y2], to: [x1, y2] });
    if (!covered.has(`${xIndex - 1},${yIndex}`))
      edges.push({ from: [x1, y2], to: [x1, y1] });
  });

  return edges;
}

export function mergeDrawingBoundaryEdges(edges: DrawingShapeEdge[]) {
  const horizontal = new Map<number, Array<[number, number]>>();
  const vertical = new Map<number, Array<[number, number]>>();

  edges.forEach((edge) => {
    if (drawingValuesNear(edge.from[1], edge.to[1])) {
      const y = edge.from[1];
      const x1 = Math.min(edge.from[0], edge.to[0]);
      const x2 = Math.max(edge.from[0], edge.to[0]);
      horizontal.set(y, [...(horizontal.get(y) ?? []), [x1, x2]]);
      return;
    }

    const x = edge.from[0];
    const y1 = Math.min(edge.from[1], edge.to[1]);
    const y2 = Math.max(edge.from[1], edge.to[1]);
    vertical.set(x, [...(vertical.get(x) ?? []), [y1, y2]]);
  });

  const merged: DrawingShapeEdge[] = [];
  horizontal.forEach((spans, y) => {
    const sorted = spans.sort((left, right) => left[0] - right[0]);
    let current = sorted[0];
    if (!current) return;

    for (const span of sorted.slice(1)) {
      if (span[0] <= current[1]) {
        current[1] = Math.max(current[1], span[1]);
      } else {
        merged.push({ from: [current[0], y], to: [current[1], y] });
        current = span;
      }
    }
    merged.push({ from: [current[0], y], to: [current[1], y] });
  });

  vertical.forEach((spans, x) => {
    const sorted = spans.sort((left, right) => left[0] - right[0]);
    let current = sorted[0];
    if (!current) return;

    for (const span of sorted.slice(1)) {
      if (span[0] <= current[1]) {
        current[1] = Math.max(current[1], span[1]);
      } else {
        merged.push({ from: [x, current[0]], to: [x, current[1]] });
        current = span;
      }
    }
    merged.push({ from: [x, current[0]], to: [x, current[1]] });
  });

  return merged;
}

export function rectUnionOutline(rects: DrawingShapeRect[]) {
  const edges = rectUnionBoundaryEdges(rects);
  if (edges.length === 0) return [];

  const neighbors = new Map<string, string[]>();
  const points = new Map<string, [number, number]>();
  const addNeighbor = (from: [number, number], to: [number, number]) => {
    const fromKey = drawingPointKey(from[0], from[1]);
    const toKey = drawingPointKey(to[0], to[1]);
    points.set(fromKey, from);
    points.set(toKey, to);
    neighbors.set(fromKey, [...(neighbors.get(fromKey) ?? []), toKey]);
  };

  edges.forEach(({ from, to }) => {
    addNeighbor(from, to);
    addNeighbor(to, from);
  });

  const start = Array.from(points.entries()).sort((left, right) => {
    const [, [leftX, leftY]] = left;
    const [, [rightX, rightY]] = right;
    return leftY === rightY ? leftX - rightX : leftY - rightY;
  })[0];
  if (!start) return [];

  const ordered: Array<[number, number]> = [];
  let currentKey = start[0];
  let previousKey: string | null = null;

  for (let guard = 0; guard < edges.length + 4; guard += 1) {
    const point = points.get(currentKey);
    if (!point) break;
    ordered.push(point);

    const nextKey = (neighbors.get(currentKey) ?? []).find(
      (candidate) => candidate !== previousKey,
    );
    if (!nextKey) break;
    previousKey = currentKey;
    currentKey = nextKey;
    if (currentKey === start[0]) break;
  }

  return ordered
    .filter((point, index, all) => {
      const previous = all[(index - 1 + all.length) % all.length];
      const next = all[(index + 1) % all.length];
      if (!previous || !next) return true;
      return !(
        (previous[0] === point[0] && point[0] === next[0]) ||
        (previous[1] === point[1] && point[1] === next[1])
      );
    })
    .flatMap(([x, y]) => [x, y]);
}

function isPointInsideRects(rects: DrawingShapeRect[], x: number, y: number) {
  return rects.some(
    (rect) =>
      x >= rect.x &&
      x <= rect.x + rect.w &&
      y >= rect.y &&
      y <= rect.y + rect.h,
  );
}

export function chainSegmentLabelPosition(
  segment: DrawingShapeRect & { orientation: "horizontal" | "vertical" },
  rects: DrawingShapeRect[],
) {
  if (segment.orientation === "horizontal") {
    const centerX = segment.x + segment.w / 2;
    const topClear = !isPointInsideRects(rects, centerX, segment.y - 1);
    return {
      x: centerX - 24,
      y: topClear ? segment.y - 18 : segment.y + segment.h + 8,
    };
  }

  const centerY = segment.y + segment.h / 2;
  const leftClear = !isPointInsideRects(rects, segment.x - 1, centerY);
  return {
    x: leftClear ? segment.x - 48 : segment.x + segment.w + 6,
    y: centerY - 6,
  };
}

export function isChainShape(
  shape: PieceShape | null | undefined,
): shape is ChainShapeLayout {
  return shape?.type === "chain";
}

export function chainShapeGeometry(shape: ChainShapeLayout) {
  const rects = shape.segments.map((segment) => ({
    x: segment.x,
    y: segment.y,
    w: segment.w,
    h: segment.h,
  }));

  return {
    rects,
    outline: rectUnionOutline(rects),
    edges: mergeDrawingBoundaryEdges(rectUnionBoundaryEdges(rects)),
  };
}

function polygonAreaPx(points: ReadonlyArray<[number, number]>): number {
  if (points.length < 3) return 0;
  let twiceArea = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i] as [number, number];
    const [x2, y2] = points[(i + 1) % points.length] as [number, number];
    twiceArea += x1 * y2 - x2 * y1;
  }
  return Math.abs(twiceArea) / 2;
}

export function chainShapeAreaSqIn(shape: ChainShapeLayout): number {
  const first = shape.segments[0];
  if (!first || first.lengthIn === 0) return 0;
  const scale = first.w / first.lengthIn; // px per inch
  if (scale === 0) return 0;

  const { rects, outline } = chainShapeGeometry(shape);

  // outline is a flat number[] of x,y pairs; convert to [number, number][] for Shoelace
  const outlinePoints: Array<[number, number]> = [];
  for (let i = 0; i + 1 < outline.length; i += 2) {
    outlinePoints.push([outline[i] as number, outline[i + 1] as number]);
  }

  const areaPx =
    outlinePoints.length >= 3
      ? polygonAreaPx(outlinePoints)
      : rects.reduce((total, rect) => total + rect.w * rect.h, 0);

  return roundDrawingInches(areaPx / (scale * scale));
}

function edgeMidpoint(edge: DrawingShapeEdge) {
  return {
    x: (edge.from[0] + edge.to[0]) / 2,
    y: (edge.from[1] + edge.to[1]) / 2,
  };
}

function shapeBounds(rects: DrawingShapeRect[]) {
  return rects.reduce(
    (bounds, rect) => ({
      minX: Math.min(bounds.minX, rect.x),
      minY: Math.min(bounds.minY, rect.y),
      maxX: Math.max(bounds.maxX, rect.x + rect.w),
      maxY: Math.max(bounds.maxY, rect.y + rect.h),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function boundaryOutsideSide(
  edge: DrawingShapeEdge,
  rects: DrawingShapeRect[],
): "above" | "below" | "left" | "right" {
  const midpoint = edgeMidpoint(edge);
  const bounds = shapeBounds(rects);
  const horizontal = drawingValuesNear(edge.from[1], edge.to[1]);

  if (horizontal) {
    const aboveInside = isPointInsideRects(rects, midpoint.x, midpoint.y - 1);
    const belowInside = isPointInsideRects(rects, midpoint.x, midpoint.y + 1);
    if (!aboveInside && belowInside) return "above";
    if (aboveInside && !belowInside) return "below";
    return midpoint.y <= (bounds.minY + bounds.maxY) / 2 ? "above" : "below";
  }

  const leftInside = isPointInsideRects(rects, midpoint.x - 1, midpoint.y);
  const rightInside = isPointInsideRects(rects, midpoint.x + 1, midpoint.y);
  if (!leftInside && rightInside) return "left";
  if (leftInside && !rightInside) return "right";
  return midpoint.x <= (bounds.minX + bounds.maxX) / 2 ? "left" : "right";
}

function boundaryEdgeLength(edge: DrawingShapeEdge) {
  return Math.hypot(edge.to[0] - edge.from[0], edge.to[1] - edge.from[1]);
}

export function chainSegmentIndexForEdge(
  shape: ChainShapeLayout,
  edge: DrawingShapeEdge,
) {
  const midpoint = edgeMidpoint(edge);
  const horizontal = drawingValuesNear(edge.from[1], edge.to[1]);

  return shape.segments.findIndex((segment) => {
    const onX =
      midpoint.x >= segment.x - 0.001 &&
      midpoint.x <= segment.x + segment.w + 0.001;
    const onY =
      midpoint.y >= segment.y - 0.001 &&
      midpoint.y <= segment.y + segment.h + 0.001;

    if (horizontal) {
      return (
        onX &&
        (Math.abs(midpoint.y - segment.y) < 0.001 ||
          Math.abs(midpoint.y - (segment.y + segment.h)) < 0.001)
      );
    }

    return (
      onY &&
      (Math.abs(midpoint.x - segment.x) < 0.001 ||
        Math.abs(midpoint.x - (segment.x + segment.w)) < 0.001)
    );
  });
}

export function rectsToChainSegments(
  rects: DrawingShapeRect[],
  scale = 3,
): ChainShapeSegment[] {
  return rects.map((rect) => ({
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    lengthIn: roundDrawingInches(rect.w / scale),
    widthIn: roundDrawingInches(rect.h / scale),
    orientation: rect.w >= rect.h ? "horizontal" : "vertical",
  }));
}

export const drawingRectsToChainSegments = rectsToChainSegments;

export function drawingRectToChainSegment(
  rect: DrawingShapeRect,
  scale: number,
) {
  return rectsToChainSegments([rect], scale)[0] as DrawingChainShapeSegment;
}

export function chainInnerDepthGuides(shape: ChainShapeLayout, scale = 3) {
  const rects = shape.segments.map((segment) => ({
    x: segment.x,
    y: segment.y,
    w: segment.w,
    h: segment.h,
  }));
  if (isRectangularUnion(rects)) return [];

  const edges = mergeDrawingBoundaryEdges(rectUnionBoundaryEdges(rects));
  const verticalEdges = edges.filter(
    (edge) => Math.abs(edge.from[0] - edge.to[0]) < 0.001,
  );
  const innerEdge = verticalEdges
    .filter((edge) => boundaryOutsideSide(edge, rects) === "left")
    .filter((edge) => boundaryEdgeLength(edge) >= 1)
    .sort(
      (left, right) => boundaryEdgeLength(right) - boundaryEdgeLength(left),
    )[0];
  if (!innerEdge) return [];

  const innerY1 = Math.min(innerEdge.from[1], innerEdge.to[1]);
  const innerY2 = Math.max(innerEdge.from[1], innerEdge.to[1]);
  const outerEdge = verticalEdges
    .filter((edge) => boundaryOutsideSide(edge, rects) === "right")
    .filter((edge) => {
      const y1 = Math.min(edge.from[1], edge.to[1]);
      const y2 = Math.max(edge.from[1], edge.to[1]);
      return Math.min(innerY2, y2) - Math.max(innerY1, y1) > 0.001;
    })
    .sort(
      (left, right) =>
        Math.abs(right.from[0] - innerEdge.from[0]) -
        Math.abs(left.from[0] - innerEdge.from[0]),
    )[0];
  if (!outerEdge) return [];

  const outerY1 = Math.min(outerEdge.from[1], outerEdge.to[1]);
  const outerY2 = Math.max(outerEdge.from[1], outerEdge.to[1]);
  const y = (Math.max(innerY1, outerY1) + Math.min(innerY2, outerY2)) / 2;
  const x1 = Math.min(innerEdge.from[0], outerEdge.from[0]);
  const x2 = Math.max(innerEdge.from[0], outerEdge.from[0]);
  const segmentIndex = chainSegmentIndexForEdge(shape, innerEdge);

  return [
    {
      segmentIndex: segmentIndex >= 0 ? segmentIndex : 0,
      edge: {
        from: [x1, y] as [number, number],
        to: [x2, y] as [number, number],
      },
      value: (x2 - x1) / scale,
      label: {
        x: (x1 + x2) / 2,
        y,
      },
    },
  ];
}

export function chainFreeEnd(shape: ChainShapeLayout) {
  const segment = shape.segments[shape.segments.length - 1];
  const previous = shape.segments[shape.segments.length - 2];
  if (!segment) return null;

  const previousSide = previous
    ? chainSegmentAttachmentSide(segment, previous)
    : null;
  const side = previousSide === "end" ? "start" : "end";
  const horizontal = segment.orientation === "horizontal";
  const direction =
    horizontal && side === "end"
      ? "right"
      : horizontal
        ? "left"
        : side === "end"
          ? "down"
          : "up";

  return {
    segment,
    side,
    direction,
    x:
      horizontal && side === "end"
        ? segment.x + segment.w
        : horizontal
          ? segment.x
          : segment.x + segment.w / 2,
    y:
      !horizontal && side === "end"
        ? segment.y + segment.h
        : !horizontal
          ? segment.y
          : segment.y + segment.h / 2,
  };
}

export function normalizeDrawingRectUnion(
  rects: DrawingShapeRect[],
): DrawingShapeRect[] {
  const xs = Array.from(
    new Set(rects.flatMap((rect) => [rect.x, rect.x + rect.w])),
  ).sort((a, b) => a - b);
  const ys = Array.from(
    new Set(rects.flatMap((rect) => [rect.y, rect.y + rect.h])),
  ).sort((a, b) => a - b);
  const rowRects: DrawingShapeRect[] = [];

  for (let yIndex = 0; yIndex < ys.length - 1; yIndex += 1) {
    const y1 = ys[yIndex] ?? 0;
    const y2 = ys[yIndex + 1] ?? y1;
    let activeStart: number | null = null;

    for (let xIndex = 0; xIndex < xs.length - 1; xIndex += 1) {
      const x1 = xs[xIndex] ?? 0;
      const x2 = xs[xIndex + 1] ?? x1;
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      const isCovered = rects.some(
        (rect) =>
          centerX >= rect.x &&
          centerX <= rect.x + rect.w &&
          centerY >= rect.y &&
          centerY <= rect.y + rect.h,
      );

      if (isCovered) {
        activeStart ??= x1;
        continue;
      }

      if (activeStart !== null) {
        rowRects.push({
          x: activeStart,
          y: y1,
          w: x1 - activeStart,
          h: y2 - y1,
        });
        activeStart = null;
      }
    }

    if (activeStart !== null) {
      const lastX = xs[xs.length - 1] ?? activeStart;
      rowRects.push({
        x: activeStart,
        y: y1,
        w: lastX - activeStart,
        h: y2 - y1,
      });
    }
  }

  const merged: DrawingShapeRect[] = [];
  rowRects
    .sort((left, right) =>
      left.x === right.x
        ? left.w === right.w
          ? left.y - right.y
          : left.w - right.w
        : left.x - right.x,
    )
    .forEach((rect) => {
      const previous = merged[merged.length - 1];
      if (
        previous &&
        drawingValuesNear(previous.x, rect.x) &&
        drawingValuesNear(previous.w, rect.w) &&
        drawingValuesNear(previous.y + previous.h, rect.y)
      ) {
        previous.h += rect.h;
        return;
      }
      merged.push({ ...rect });
    });

  return merged;
}

function drawingRectArea(rect: DrawingShapeRect) {
  return rect.w * rect.h;
}

function drawingRectUnionArea(rects: DrawingShapeRect[]) {
  return normalizeDrawingRectUnion(rects).reduce(
    (sum, rect) => sum + drawingRectArea(rect),
    0,
  );
}

export function visibleBoundaryEdges(params: {
  rects: DrawingShapeRect[];
  deletedLines?: Array<{ from: [number, number]; to: [number, number] }>;
}) {
  const deletedLines = params.deletedLines ?? [];
  return mergeDrawingBoundaryEdges(rectUnionBoundaryEdges(params.rects)).filter(
    (edge) =>
      !deletedLines.some((line) => drawingShapeEdgeMatchesLine(edge, line)),
  );
}

export interface DrawingBacksplashReferenceLine {
  id?: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  kind: string;
  color: string;
  dash?: boolean;
}

export interface DrawingBacksplashCornerSnap {
  pieceId: string;
  edge: DrawingEdgeKey;
  corner: DrawingCornerKey;
  x: number;
  y: number;
  edgeFrom: [number, number];
  edgeTo: [number, number];
}

function drawingRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return Math.max(startA, startB) <= Math.min(endA, endB) + 0.001;
}

function boundaryEdgeKeyForBacksplash(
  edge: DrawingShapeEdge,
  rects: DrawingShapeRect[],
): DrawingEdgeKey {
  const horizontal = drawingValuesNear(edge.from[1], edge.to[1]);
  const outside = boundaryOutsideSide(edge, rects);

  if (horizontal) {
    return outside === "above" ? "top" : "bottom";
  }

  return outside === "left" ? "left" : "right";
}

function referenceLineEdgeKeyForBacksplash(
  line: DrawingBacksplashReferenceLine,
  rects: DrawingShapeRect[],
): DrawingEdgeKey {
  const bounds = shapeBounds(rects);
  const horizontal = drawingValuesNear(line.from[1], line.to[1]);

  if (horizontal) {
    const midY = (line.from[1] + line.to[1]) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    return midY <= centerY ? "top" : "bottom";
  }

  const midX = (line.from[0] + line.to[0]) / 2;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  return midX <= centerX ? "left" : "right";
}

function backsplashCornerForEndpoint(
  edge: DrawingEdgeKey,
  point: "from" | "to",
): DrawingCornerKey {
  if (edge === "top") return point === "from" ? "topLeft" : "topRight";
  if (edge === "right") return point === "from" ? "topRight" : "bottomRight";
  if (edge === "bottom") return point === "from" ? "bottomRight" : "bottomLeft";
  return point === "from" ? "bottomLeft" : "topLeft";
}

export function backsplashCornerCandidatesForEdges(params: {
  pieceId: string;
  rects: DrawingShapeRect[];
  boundaryEdges: DrawingShapeEdge[];
  referenceLines: DrawingBacksplashReferenceLine[];
  wallColor?: string;
}): DrawingBacksplashCornerSnap[] {
  const wallColor = params.wallColor ?? "#78aa72";
  const boundaryCandidates = params.boundaryEdges.flatMap((edge) => {
    const edgeKey = boundaryEdgeKeyForBacksplash(edge, params.rects);
    return [
      {
        pieceId: params.pieceId,
        edge: edgeKey,
        corner: backsplashCornerForEndpoint(edgeKey, "from"),
        x: edge.from[0],
        y: edge.from[1],
        edgeFrom: edge.from,
        edgeTo: edge.to,
      },
      {
        pieceId: params.pieceId,
        edge: edgeKey,
        corner: backsplashCornerForEndpoint(edgeKey, "to"),
        x: edge.to[0],
        y: edge.to[1],
        edgeFrom: edge.from,
        edgeTo: edge.to,
      },
    ];
  });

  const wallCandidates = params.referenceLines
    .filter(
      (line) =>
        line.pieceId === params.pieceId &&
        line.kind === "wall" &&
        line.color === wallColor &&
        line.dash !== true,
    )
    .flatMap((line) => {
      const lineHorizontal = drawingValuesNear(line.from[1], line.to[1]);
      const anchorEdge =
        params.boundaryEdges
          .filter(
            (edge) =>
              drawingValuesNear(edge.from[1], edge.to[1]) === lineHorizontal,
          )
          .filter((edge) => {
            if (lineHorizontal) {
              return drawingRangesOverlap(
                Math.min(line.from[0], line.to[0]),
                Math.max(line.from[0], line.to[0]),
                Math.min(edge.from[0], edge.to[0]),
                Math.max(edge.from[0], edge.to[0]),
              );
            }

            return drawingRangesOverlap(
              Math.min(line.from[1], line.to[1]),
              Math.max(line.from[1], line.to[1]),
              Math.min(edge.from[1], edge.to[1]),
              Math.max(edge.from[1], edge.to[1]),
            );
          })
          .sort((left, right) => {
            const leftMid = edgeMidpoint(left);
            const rightMid = edgeMidpoint(right);
            const lineMid = {
              x: (line.from[0] + line.to[0]) / 2,
              y: (line.from[1] + line.to[1]) / 2,
            };

            return lineHorizontal
              ? Math.abs(leftMid.y - lineMid.y) -
                  Math.abs(rightMid.y - lineMid.y)
              : Math.abs(leftMid.x - lineMid.x) -
                  Math.abs(rightMid.x - lineMid.x);
          })[0] ?? null;

      const edgeKey = anchorEdge
        ? boundaryEdgeKeyForBacksplash(anchorEdge, params.rects)
        : referenceLineEdgeKeyForBacksplash(line, params.rects);

      return [
        {
          pieceId: params.pieceId,
          edge: edgeKey,
          corner: backsplashCornerForEndpoint(edgeKey, "from"),
          x: line.from[0],
          y: line.from[1],
          edgeFrom: line.from,
          edgeTo: line.to,
        },
        {
          pieceId: params.pieceId,
          edge: edgeKey,
          corner: backsplashCornerForEndpoint(edgeKey, "to"),
          x: line.to[0],
          y: line.to[1],
          edgeFrom: line.from,
          edgeTo: line.to,
        },
      ];
    });

  const wallEdgeSides = new Set(wallCandidates.map((c) => c.edge));
  const filteredBoundaryCandidates = boundaryCandidates.filter(
    (c) => !wallEdgeSides.has(c.edge),
  );
  return [...wallCandidates, ...filteredBoundaryCandidates];
}

export function extendReferenceLineToEdges(params: {
  line: DrawingBacksplashReferenceLine;
  rects: DrawingShapeRect[];
  boundaryEdges: DrawingShapeEdge[];
  referenceLines: DrawingBacksplashReferenceLine[];
  wallColor?: string;
}): DrawingShapeEdge | null {
  const wallColor = params.wallColor ?? "#78aa72";
  const vertical = drawingValuesNear(params.line.from[0], params.line.to[0]);
  const horizontal = drawingValuesNear(params.line.from[1], params.line.to[1]);
  if (!vertical && !horizontal) return null;

  const bounds = shapeBounds(params.rects);
  const values: number[] = [];

  if (vertical) {
    const x = params.line.from[0];
    params.boundaryEdges
      .filter((edge) => drawingValuesNear(edge.from[1], edge.to[1]))
      .filter(
        (edge) =>
          x >= Math.min(edge.from[0], edge.to[0]) - 0.001 &&
          x <= Math.max(edge.from[0], edge.to[0]) + 0.001,
      )
      .forEach((edge) => values.push(edge.from[1]));

    params.referenceLines
      .filter(
        (line) =>
          line.pieceId === params.line.pieceId &&
          line.kind === "wall" &&
          line.color === wallColor &&
          line.dash !== true &&
          drawingValuesNear(line.from[1], line.to[1]) &&
          x >= Math.min(line.from[0], line.to[0]) - 0.001 &&
          x <= Math.max(line.from[0], line.to[0]) + 0.001,
      )
      .forEach((line) => values.push(line.from[1]));

    if (values.length < 2) {
      values.push(bounds.minY, bounds.maxY);
    }

    return {
      from: [x, Math.min(...values)],
      to: [x, Math.max(...values)],
    };
  }

  const y = params.line.from[1];
  params.boundaryEdges
    .filter((edge) => drawingValuesNear(edge.from[0], edge.to[0]))
    .filter(
      (edge) =>
        y >= Math.min(edge.from[1], edge.to[1]) - 0.001 &&
        y <= Math.max(edge.from[1], edge.to[1]) + 0.001,
    )
    .forEach((edge) => values.push(edge.from[0]));

  params.referenceLines
    .filter(
      (line) =>
        line.pieceId === params.line.pieceId &&
        line.kind === "wall" &&
        line.color === wallColor &&
        line.dash !== true &&
        drawingValuesNear(line.from[0], line.to[0]) &&
        y >= Math.min(line.from[1], line.to[1]) - 0.001 &&
        y <= Math.max(line.from[1], line.to[1]) + 0.001,
    )
    .forEach((line) => values.push(line.from[0]));

  if (values.length < 2) {
    values.push(bounds.minX, bounds.maxX);
  }

  return {
    from: [Math.min(...values), y],
    to: [Math.max(...values), y],
  };
}

export function rectUnionOutlinePointCount(rects: DrawingShapeRect[]) {
  const edges = rectUnionBoundaryEdges(rects);
  if (edges.length === 0) return 0;

  const neighbors = new Map<string, string[]>();
  const points = new Map<string, [number, number]>();
  const addNeighbor = (from: [number, number], to: [number, number]) => {
    const fromKey = drawingPointKey(from[0], from[1]);
    const toKey = drawingPointKey(to[0], to[1]);
    points.set(fromKey, from);
    points.set(toKey, to);
    neighbors.set(fromKey, [...(neighbors.get(fromKey) ?? []), toKey]);
  };

  edges.forEach(({ from, to }) => {
    addNeighbor(from, to);
    addNeighbor(to, from);
  });

  const start = Array.from(points.entries()).sort((left, right) => {
    const [, [leftX, leftY]] = left;
    const [, [rightX, rightY]] = right;
    return leftY === rightY ? leftX - rightX : leftY - rightY;
  })[0];
  if (!start) return 0;

  const ordered: Array<[number, number]> = [];
  let currentKey = start[0];
  let previousKey: string | null = null;

  for (let guard = 0; guard < edges.length + 4; guard += 1) {
    const point = points.get(currentKey);
    if (!point) break;
    ordered.push(point);

    const nextKey = (neighbors.get(currentKey) ?? []).find(
      (candidate) => candidate !== previousKey,
    );
    if (!nextKey) break;
    previousKey = currentKey;
    currentKey = nextKey;
    if (currentKey === start[0]) break;
  }

  return ordered.filter((point, index, all) => {
    const previous = all[(index - 1 + all.length) % all.length];
    const next = all[(index + 1) % all.length];
    if (!previous || !next) return true;
    return !(
      (previous[0] === point[0] && point[0] === next[0]) ||
      (previous[1] === point[1] && point[1] === next[1])
    );
  }).length;
}

export function isRectangularUnion(rects: DrawingShapeRect[]) {
  return rectUnionOutlinePointCount(rects) <= 4;
}

export function buildOffsetSegment(params: {
  edge: DrawingShapeEdge;
  deltaPx: number;
  scale: number;
}): DrawingChainShapeSegment {
  const { edge, deltaPx, scale } = params;
  const horizontalEdge = drawingValuesNear(edge.from[1], edge.to[1]);
  const edgeMinX = Math.min(edge.from[0], edge.to[0]);
  const edgeMaxX = Math.max(edge.from[0], edge.to[0]);
  const edgeMinY = Math.min(edge.from[1], edge.to[1]);
  const edgeMaxY = Math.max(edge.from[1], edge.to[1]);
  const offsetSize = Math.max(Math.abs(deltaPx), scale);

  if (horizontalEdge) {
    return drawingRectToChainSegment(
      {
        x: edgeMinX,
        y: Math.min(edge.from[1], edge.from[1] + deltaPx),
        w: Math.max(edgeMaxX - edgeMinX, scale),
        h: offsetSize,
      },
      scale,
    );
  }

  return drawingRectToChainSegment(
    {
      x: Math.min(edge.from[0], edge.from[0] + deltaPx),
      y: edgeMinY,
      w: offsetSize,
      h: Math.max(edgeMaxY - edgeMinY, scale),
    },
    scale,
  );
}

export function buildOffsetEdge(params: {
  edge: DrawingShapeEdge;
  deltaPx: number;
}): DrawingShapeEdge {
  const horizontalEdge = drawingValuesNear(
    params.edge.from[1],
    params.edge.to[1],
  );

  if (horizontalEdge) {
    return {
      from: [params.edge.from[0], params.edge.from[1] + params.deltaPx],
      to: [params.edge.to[0], params.edge.to[1] + params.deltaPx],
    };
  }

  return {
    from: [params.edge.from[0] + params.deltaPx, params.edge.from[1]],
    to: [params.edge.to[0] + params.deltaPx, params.edge.to[1]],
  };
}

export function buildReferenceLine(params: {
  id: string;
  pieceId: string;
  edge: DrawingShapeEdge;
  kind?: "cabinet" | "wall";
  color?: string;
  dash?: boolean;
}): DrawingReferenceLine {
  return {
    id: params.id,
    pieceId: params.pieceId,
    from: params.edge.from,
    to: params.edge.to,
    kind: params.kind ?? "cabinet",
    color: params.color ?? "#6b7280",
    dash: params.dash ?? false,
  };
}

export function buildDeletedLine(params: {
  id: string;
  pieceId: string;
  edge: DrawingShapeEdge;
}): DrawingDeletedLine {
  return {
    id: params.id,
    pieceId: params.pieceId,
    from: params.edge.from,
    to: params.edge.to,
  };
}

export function removeReferenceLine<T extends { id: string }>(
  lines: T[],
  lineId: string,
) {
  return lines.filter((line) => line.id !== lineId);
}

function drawingRectBounds(rects: DrawingShapeRect[]) {
  return rects.reduce(
    (acc, rect) => ({
      minX: Math.min(acc.minX, rect.x),
      minY: Math.min(acc.minY, rect.y),
      maxX: Math.max(acc.maxX, rect.x + rect.w),
      maxY: Math.max(acc.maxY, rect.y + rect.h),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function drawingLineLength(line: { from: [number, number]; to: [number, number] }) {
  return Math.hypot(line.to[0] - line.from[0], line.to[1] - line.from[1]);
}

function drawingReferenceLineIsHorizontal(line: DrawingReferenceLine) {
  return drawingValuesNear(line.from[1], line.to[1]);
}

function drawingReferenceLineIsVertical(line: DrawingReferenceLine) {
  return drawingValuesNear(line.from[0], line.to[0]);
}

function drawingCornerPoint(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  corner: DrawingCornerKey,
): [number, number] {
  if (corner === "topLeft") return [bounds.minX, bounds.minY];
  if (corner === "topRight") return [bounds.maxX, bounds.minY];
  if (corner === "bottomRight") return [bounds.maxX, bounds.maxY];
  return [bounds.minX, bounds.maxY];
}

function drawingCornerAngles(corner: DrawingCornerKey) {
  if (corner === "topLeft") return { startAngle: 0, endAngle: Math.PI / 2 };
  if (corner === "topRight")
    return { startAngle: Math.PI / 2, endAngle: Math.PI };
  if (corner === "bottomRight")
    return { startAngle: Math.PI, endAngle: (3 * Math.PI) / 2 };
  return { startAngle: (3 * Math.PI) / 2, endAngle: 2 * Math.PI };
}

export function buildReferenceLineCornerVisuals(params: {
  referenceLines: DrawingReferenceLine[];
  rects: DrawingShapeRect[];
  corners: Array<{
    corner: DrawingCornerKey;
    treatment: DrawingCornerTreatment;
    valueIn: number | null;
  }>;
  scale: number;
}) {
  const segments = params.referenceLines.map<DrawingReferenceLineVisualSegment>(
    (line) => ({
      id: line.id,
      sourceLineId: line.id,
      pieceId: line.pieceId,
      from: [...line.from] as [number, number],
      to: [...line.to] as [number, number],
      kind: line.kind,
      color: line.color,
      dash: line.dash ?? line.color !== "#78aa72",
    }),
  );
  const arcs: DrawingReferenceLineVisualArc[] = [];

  if (params.rects.length === 0) {
    return { segments, arcs };
  }

  const bounds = drawingRectBounds(params.rects);
  const wallLines = params.referenceLines.filter((line) => line.kind === "wall");
  const segmentById = new Map(segments.map((segment) => [segment.id, segment]));

  params.corners
    .filter((corner) => corner.treatment === "radius")
    .forEach((corner) => {
      const [cornerX, cornerY] = drawingCornerPoint(bounds, corner.corner);
      const horizontal = wallLines
        .filter((line) => drawingReferenceLineIsHorizontal(line))
        .filter((line) => {
          const nearX =
            corner.corner === "topLeft" || corner.corner === "bottomLeft"
              ? Math.min(line.from[0], line.to[0])
              : Math.max(line.from[0], line.to[0]);
          return drawingValuesNear(nearX, cornerX);
        })
        .sort(
          (left, right) =>
            Math.abs(left.from[1] - cornerY) - Math.abs(right.from[1] - cornerY),
        )[0];
      const vertical = wallLines
        .filter((line) => drawingReferenceLineIsVertical(line))
        .filter((line) => {
          const nearY =
            corner.corner === "topLeft" || corner.corner === "topRight"
              ? Math.min(line.from[1], line.to[1])
              : Math.max(line.from[1], line.to[1]);
          return drawingValuesNear(nearY, cornerY);
        })
        .sort(
          (left, right) =>
            Math.abs(left.from[0] - cornerX) - Math.abs(right.from[0] - cornerX),
        )[0];

      if (!horizontal || !vertical) return;

      const horizontalY = horizontal.from[1];
      const verticalX = vertical.from[0];
      const offsetX = verticalX - cornerX;
      const offsetY = horizontalY - cornerY;
      if (
        drawingValuesNear(offsetX, 0) ||
        drawingValuesNear(offsetY, 0) ||
        !drawingValuesNear(Math.abs(offsetX), Math.abs(offsetY), 0.25)
      ) {
        return;
      }

      const trimPx = Math.max((corner.valueIn ?? 0) * params.scale, 0);
      const horizontalLength = drawingLineLength(horizontal);
      const verticalLength = drawingLineLength(vertical);
      const effectiveTrimPx = Math.min(
        trimPx,
        Math.max(horizontalLength - 0.001, 0),
        Math.max(verticalLength - 0.001, 0),
      );
      const offsetPx = Math.min(Math.abs(offsetX), Math.abs(offsetY));
      const radiusPx = effectiveTrimPx + offsetPx;
      if (radiusPx <= 0.001) return;

      const horizontalSegment = segmentById.get(horizontal.id);
      const verticalSegment = segmentById.get(vertical.id);
      if (!horizontalSegment || !verticalSegment) return;

      const horizontalNearIsFrom = drawingValuesNear(
        horizontalSegment.from[0],
        cornerX,
      );
      const verticalNearIsFrom = drawingValuesNear(
        verticalSegment.from[1],
        cornerY,
      );

      if (effectiveTrimPx > 0) {
        if (corner.corner === "topLeft" || corner.corner === "bottomLeft") {
          if (horizontalNearIsFrom) horizontalSegment.from[0] += effectiveTrimPx;
          else horizontalSegment.to[0] += effectiveTrimPx;
        } else if (horizontalNearIsFrom) {
          horizontalSegment.from[0] -= effectiveTrimPx;
        } else {
          horizontalSegment.to[0] -= effectiveTrimPx;
        }

        if (corner.corner === "topLeft" || corner.corner === "topRight") {
          if (verticalNearIsFrom) verticalSegment.from[1] += effectiveTrimPx;
          else verticalSegment.to[1] += effectiveTrimPx;
        } else if (verticalNearIsFrom) {
          verticalSegment.from[1] -= effectiveTrimPx;
        } else {
          verticalSegment.to[1] -= effectiveTrimPx;
        }
      }

      const { startAngle, endAngle } = drawingCornerAngles(corner.corner);
      arcs.push({
        id: `${horizontal.id}:${vertical.id}:radius`,
        pieceId: horizontal.pieceId,
        color: horizontal.color,
        center: [cornerX + offsetX, cornerY + offsetY],
        radius: radiusPx,
        startAngle,
        endAngle,
        sourceLineIds: [horizontal.id, vertical.id],
      });
    });

  return { segments, arcs };
}

export function applyOffsetToSegments(params: {
  segments: DrawingChainShapeSegment[];
  edge: DrawingShapeEdge;
  deltaPx: number;
  scale: number;
  referenceLineId: string;
  pieceId: string;
}) {
  const sourceLine = buildReferenceLine({
    id: params.referenceLineId,
    pieceId: params.pieceId,
    edge: params.edge,
    dash: true,
  });
  const offsetLine = buildReferenceLine({
    id: `${params.referenceLineId}:offset`,
    pieceId: params.pieceId,
    edge: buildOffsetEdge({ edge: params.edge, deltaPx: params.deltaPx }),
    kind: "wall",
    color: "#78aa72",
    dash: false,
  });

  return {
    segments: params.segments,
    referenceLines: [sourceLine, offsetLine],
  };
}

export function connectEdgesToRectangle(params: {
  firstEdge: DrawingShapeEdge;
  secondEdge: DrawingShapeEdge;
  scale: number;
  existingRects?: DrawingShapeRect[];
}) {
  if (drawingShapeEdgeMatchesLine(params.firstEdge, params.secondEdge)) {
    return null;
  }

  const firstHorizontal = drawingValuesNear(
    params.firstEdge.from[1],
    params.firstEdge.to[1],
  );
  const secondHorizontal = drawingValuesNear(
    params.secondEdge.from[1],
    params.secondEdge.to[1],
  );

  let minX: number;
  let minY: number;
  let maxX: number;
  let maxY: number;

  if (firstHorizontal !== secondHorizontal) {
    const horizontal = firstHorizontal ? params.firstEdge : params.secondEdge;
    const vertical = firstHorizontal ? params.secondEdge : params.firstEdge;
    const horizontalY = horizontal.from[1];
    const verticalX = vertical.from[0];
    const horizontalEnds = [horizontal.from[0], horizontal.to[0]];
    const verticalEnds = [vertical.from[1], vertical.to[1]];

    const candidates = horizontalEnds.flatMap((horizontalX) =>
      verticalEnds.map((verticalY) => {
        const candidateRect = {
          x: Math.min(horizontalX, verticalX),
          y: Math.min(horizontalY, verticalY),
          w: Math.abs(horizontalX - verticalX),
          h: Math.abs(horizontalY - verticalY),
        };
        const addedArea = params.existingRects
          ? drawingRectUnionArea([...params.existingRects, candidateRect]) -
            drawingRectUnionArea(params.existingRects)
          : 0;

        return {
          rect: candidateRect,
          distance:
            Math.abs(horizontalX - verticalX) +
            Math.abs(verticalY - horizontalY),
          addedArea,
        };
      }),
    );

    const chosenCandidate = candidates
      .filter(
        (candidate) =>
          candidate.rect.w >= params.scale && candidate.rect.h >= params.scale,
      )
      .sort(
        (left, right) =>
          left.distance - right.distance || left.addedArea - right.addedArea,
      )[0];

    if (!chosenCandidate) return null;

    minX = chosenCandidate.rect.x;
    maxX = chosenCandidate.rect.x + chosenCandidate.rect.w;
    minY = chosenCandidate.rect.y;
    maxY = chosenCandidate.rect.y + chosenCandidate.rect.h;
  } else {
    const xs = [
      params.firstEdge.from[0],
      params.firstEdge.to[0],
      params.secondEdge.from[0],
      params.secondEdge.to[0],
    ];
    const ys = [
      params.firstEdge.from[1],
      params.firstEdge.to[1],
      params.secondEdge.from[1],
      params.secondEdge.to[1],
    ];
    minX = Math.min(...xs);
    minY = Math.min(...ys);
    maxX = Math.max(...xs);
    maxY = Math.max(...ys);
  }

  if (maxX - minX < params.scale || maxY - minY < params.scale) return null;

  const rect = {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };

  return {
    rect,
    segment: drawingRectToChainSegment(rect, params.scale),
    lengthIn: roundDrawingInches(rect.w / params.scale),
    widthIn: roundDrawingInches(rect.h / params.scale),
  };
}

export function segmentDimensionLabel(
  segment: { lengthIn: number; widthIn: number },
  axis: "length" | "width",
): number {
  return axis === "length" ? segment.lengthIn : segment.widthIn;
}

export function applyExtendToSegment(params: {
  segment: DrawingChainShapeSegment;
  side: "left" | "right" | "top" | "bottom";
  deltaIn: number;
  scale: number;
  referenceLines?: DrawingReferenceLine[];
}): DrawingChainShapeSegment & { referenceLines: DrawingReferenceLine[] } {
  const { segment, side, deltaIn, scale } = params;
  const deltaPx = roundDrawingInches(deltaIn) * scale;

  let { x, y, w, h } = segment;

  if (side === "right") {
    w += deltaPx;
  } else if (side === "left") {
    x -= deltaPx;
    w += deltaPx;
  } else if (side === "bottom") {
    h += deltaPx;
  } else {
    y -= deltaPx;
    h += deltaPx;
  }

  return {
    ...segment,
    x,
    y,
    w,
    h,
    lengthIn: roundDrawingInches(w / scale),
    widthIn: roundDrawingInches(h / scale),
    referenceLines: params.referenceLines ?? [],
  };
}

export function legacyShapeToChain(
  shape: LShapeLayout | ZShapeLayout,
  piece: { lengthIn: number; widthIn: number },
  scale = 3,
): ChainShapeLayout {
  const mainW = piece.lengthIn * scale;
  const mainH = piece.widthIn * scale;

  if (shape.type === "z") {
    const legW = shape.legWidthIn * scale;
    const legH = shape.legLengthIn * scale;
    const tailW = shape.tailLengthIn * scale;
    const tailH = shape.tailWidthIn * scale;
    const rects = normalizeDrawingRectUnion([
      { x: 0, y: 0, w: mainW, h: mainH },
      { x: shape.legX, y: shape.legY, w: legW, h: legH },
      { x: shape.tailX, y: shape.tailY, w: tailW, h: tailH },
    ]);
    return { type: "chain", segments: rectsToChainSegments(rects, scale) };
  }

  // L shape: main bounding box with one corner notch removed → 2 rects
  const legW = shape.legWidthIn * scale;
  const legH = shape.legLengthIn * scale;
  const legOnLeft = shape.legX <= 0;
  const legAbove = shape.legY < 0;

  let rects: DrawingShapeRect[];

  if (!legAbove && !legOnLeft) {
    rects = [
      { x: 0, y: 0, w: mainW, h: shape.legY + legH },
      { x: 0, y: shape.legY + legH, w: shape.legX, h: mainH - (shape.legY + legH) },
    ];
  } else if (!legAbove && legOnLeft) {
    rects = [
      { x: 0, y: 0, w: mainW, h: shape.legY + legH },
      { x: shape.legX + legW, y: shape.legY + legH, w: mainW - (shape.legX + legW), h: mainH - (shape.legY + legH) },
    ];
  } else if (legAbove && !legOnLeft) {
    rects = [
      { x: 0, y: 0, w: shape.legX, h: mainH },
      { x: shape.legX, y: shape.legY + legH, w: mainW - shape.legX, h: mainH - (shape.legY + legH) },
    ];
  } else {
    rects = [
      { x: shape.legX + legW, y: 0, w: mainW - (shape.legX + legW), h: mainH },
      { x: 0, y: shape.legY + legH, w: shape.legX + legW, h: mainH - (shape.legY + legH) },
    ];
  }

  return { type: "chain", segments: rectsToChainSegments(rects, scale) };
}
