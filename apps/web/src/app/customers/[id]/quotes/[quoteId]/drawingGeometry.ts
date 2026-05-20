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
