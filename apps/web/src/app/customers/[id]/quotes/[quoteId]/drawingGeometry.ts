export interface DrawingShapeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DrawingShapeEdge {
  from: [number, number];
  to: [number, number];
}

export interface DrawingChainShapeSegment extends DrawingShapeRect {
  lengthIn: number;
  widthIn: number;
  orientation: "horizontal" | "vertical";
}

export interface DrawingReferenceLine {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  kind: "cabinet" | "wall";
  color: string;
}

export function roundDrawingInches(value: number) {
  return Math.round(value * 16) / 16;
}

export function drawingValuesNear(a: number, b: number, tolerance = 0.001) {
  return Math.abs(a - b) <= tolerance;
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

export function drawingRectsToChainSegments(
  rects: DrawingShapeRect[],
  scale: number,
): DrawingChainShapeSegment[] {
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

export function drawingRectToChainSegment(
  rect: DrawingShapeRect,
  scale: number,
) {
  return drawingRectsToChainSegments([rect], scale)[0] as DrawingChainShapeSegment;
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

export function buildReferenceLine(params: {
  id: string;
  pieceId: string;
  edge: DrawingShapeEdge;
  kind?: "cabinet" | "wall";
  color?: string;
}): DrawingReferenceLine {
  return {
    id: params.id,
    pieceId: params.pieceId,
    from: params.edge.from,
    to: params.edge.to,
    kind: params.kind ?? "cabinet",
    color: params.color ?? "#6b7280",
  };
}

export function connectEdgesToRectangle(params: {
  firstEdge: DrawingShapeEdge;
  secondEdge: DrawingShapeEdge;
  scale: number;
}) {
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
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const rect = {
    x: minX,
    y: minY,
    w: Math.max(maxX - minX, params.scale),
    h: Math.max(maxY - minY, params.scale),
  };

  return {
    rect,
    segment: drawingRectToChainSegment(rect, params.scale),
    lengthIn: roundDrawingInches(rect.w / params.scale),
    widthIn: roundDrawingInches(rect.h / params.scale),
  };
}
