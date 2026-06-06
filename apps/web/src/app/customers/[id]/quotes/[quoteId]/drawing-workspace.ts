import type { DrawingLineDirection } from "@stoneboyz/domain";

export const DRAWING_WORKSPACE_TOOL_LABELS = [
  "Counter",
  "Back Splash",
  "Sink",
  "Faucet",
  "Edge",
  "Color",
] as const;

export const DRAWING_CENTERLINE_OFFSET_DIRECTIONS = [
  "left",
  "right",
  "up",
  "down",
] as const;

export type DrawingCenterlineOffsetDirection =
  (typeof DRAWING_CENTERLINE_OFFSET_DIRECTIONS)[number];

export const DRAWING_OFFSET_MODE_LABELS = [
  "Offset Edge",
  "Offset Centerline",
] as const;

export type DrawingOffsetModeLabel = (typeof DRAWING_OFFSET_MODE_LABELS)[number];

export type DrawingCenterlinePlacementMode = "midpoint" | "offset";

export const DRAWING_SEGMENT_DEFAULT_LENGTH_IN = 10 as const;

export const DRAWING_SEGMENT_DIRECTION_OPTIONS = [
  { value: "upLeft", label: "↖", title: "Up left" },
  { value: "up", label: "↑", title: "Up" },
  { value: "upRight", label: "↗", title: "Up right" },
  { value: "left", label: "←", title: "Left" },
  { value: "right", label: "→", title: "Right" },
  { value: "downLeft", label: "↙", title: "Down left" },
  { value: "down", label: "↓", title: "Down" },
  { value: "downRight", label: "↘", title: "Down right" },
] as const satisfies ReadonlyArray<{
  value: DrawingLineDirection;
  label: string;
  title: string;
}>;

export function drawingCenterlinePlacementModeForOffsetMode(
  mode: DrawingOffsetModeLabel,
): DrawingCenterlinePlacementMode {
  return mode === "Offset Centerline" ? "midpoint" : "offset";
}

export const DRAWING_FILLET_MODE_LABELS = [
  "Radius",
  "Chamfer",
  "Sharp",
] as const;

export type DrawingFilletModeLabel = (typeof DRAWING_FILLET_MODE_LABELS)[number];

export const DRAWING_FILLET_SIZE_PRESETS = [
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  4,
] as const;

export type DrawingFilletCornerTreatment = "radius" | "clip" | "none";

export function drawingCornerTreatmentForFilletMode(
  mode: DrawingFilletModeLabel,
): DrawingFilletCornerTreatment {
  if (mode === "Radius") return "radius";
  if (mode === "Chamfer") return "clip";
  return "none";
}

export function drawingFilletModeRequiresValue(mode: DrawingFilletModeLabel) {
  return mode !== "Sharp";
}

type DrawingWorkspaceEdge = {
  from: [number, number];
  to: [number, number];
};

type DrawingWorkspaceRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type DrawingWorkspaceCornerKey =
  | "topLeft"
  | "topRight"
  | "bottomRight"
  | "bottomLeft";

function drawingPointsNear(
  left: [number, number],
  right: [number, number],
  tolerance = 0.001,
) {
  return (
    Math.abs(left[0] - right[0]) <= tolerance &&
    Math.abs(left[1] - right[1]) <= tolerance
  );
}

export function drawingCornerForAdjacentEdges(
  firstEdge: DrawingWorkspaceEdge,
  secondEdge: DrawingWorkspaceEdge,
  rects: DrawingWorkspaceRect[],
): DrawingWorkspaceCornerKey | null {
  const firstHorizontal = Math.abs(firstEdge.from[1] - firstEdge.to[1]) <= 0.001;
  const secondHorizontal =
    Math.abs(secondEdge.from[1] - secondEdge.to[1]) <= 0.001;
  if (firstHorizontal === secondHorizontal || rects.length === 0) return null;

  const sharedPoint = [firstEdge.from, firstEdge.to].find((firstPoint) =>
    [secondEdge.from, secondEdge.to].some((secondPoint) =>
      drawingPointsNear(firstPoint, secondPoint),
    ),
  );
  if (!sharedPoint) return null;

  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.w));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.h));
  const left = Math.abs(sharedPoint[0] - minX) <= 0.001;
  const right = Math.abs(sharedPoint[0] - maxX) <= 0.001;
  const top = Math.abs(sharedPoint[1] - minY) <= 0.001;
  const bottom = Math.abs(sharedPoint[1] - maxY) <= 0.001;

  if (top && left) return "topLeft";
  if (top && right) return "topRight";
  if (bottom && right) return "bottomRight";
  if (bottom && left) return "bottomLeft";
  return null;
}

export function drawingCenterlineOffsetDirectionForPoint(
  edge: DrawingWorkspaceEdge,
  point: [number, number],
): DrawingCenterlineOffsetDirection {
  const horizontal = Math.abs(edge.from[1] - edge.to[1]) <= 0.001;
  if (horizontal) {
    return point[1] < edge.from[1] ? "up" : "down";
  }

  return point[0] < edge.from[0] ? "left" : "right";
}

export function drawingDirectCenterlineForRectangle(
  width: number,
  height: number,
): DrawingWorkspaceEdge {
  if (height > width) {
    const centerY = height / 2;
    return {
      from: [0, centerY],
      to: [width, centerY],
    };
  }

  const centerX = width / 2;
  return {
    from: [centerX, 0],
    to: [centerX, height],
  };
}

export function drawingCenterlineOffsetDirectionsForLine(
  line: DrawingWorkspaceEdge,
): DrawingCenterlineOffsetDirection[] {
  const vertical = Math.abs(line.from[0] - line.to[0]) <= 0.001;
  return vertical ? ["left", "right"] : ["up", "down"];
}

export const DRAWING_WORKSPACE_RESET_ACTION_LABEL = "Reset Layout" as const;

export const DRAWING_WORKSPACE_TOP_ACTION_LABELS = [
  "Help",
  "Undo",
  "Redo",
  "Revisions",
  DRAWING_WORKSPACE_RESET_ACTION_LABEL,
  "Save",
  "Exit",
] as const;

export const DRAWING_WORKSPACE_BOTTOM_STRIP_ROLE = "sheets" as const;

export const DRAWING_SHEET_TAB_DELETE_LABEL = "Delete Area" as const;

export function drawingSheetTabCanDelete(areaCount: number) {
  return areaCount > 1;
}

export function drawingSheetTabMenuPosition(params: {
  clickX: number;
  clickY: number;
  viewportWidth: number;
  viewportHeight: number;
  menuWidth?: number;
  menuHeight?: number;
  margin?: number;
}) {
  const margin = params.margin ?? 8;
  const menuWidth = params.menuWidth ?? 136;
  const menuHeight = params.menuHeight ?? 40;
  return {
    x: Math.max(
      margin,
      Math.min(params.clickX, params.viewportWidth - menuWidth - margin),
    ),
    y: Math.max(
      margin,
      Math.min(params.clickY, params.viewportHeight - menuHeight - margin),
    ),
  };
}

export const DRAWING_WORKSPACE_ACTIVE_SHEET_CLASS =
  "flex min-h-0 flex-1 flex-col bg-white" as const;

export const DRAWING_WORKSPACE_TOOL_PANEL_CLASS =
  "w-40 shrink-0 overflow-y-auto border-l bg-[#eeecea] py-1 text-sm shadow-inner min-h-0" as const;

type DrawingPaintedEdge = {
  from: [number, number];
  to: [number, number];
};

const coordinateKey = (point: [number, number]) =>
  `${Number(point[0].toFixed(4))},${Number(point[1].toFixed(4))}`;

export function drawingPaintedEdgeId(
  pieceId: string,
  edge: DrawingPaintedEdge,
) {
  const from = coordinateKey(edge.from);
  const to = coordinateKey(edge.to);
  const [first, second] = [from, to].sort();
  return `${pieceId}:${first}:${second}`;
}

export function drawingPreviewShowsBoundingDimensions(segmentCount: number) {
  return segmentCount <= 1;
}

export const DRAWING_WORKSPACE_REMOVED_STEP_LABELS = [
  "Counter Dimensions",
  "Curves & Bumpouts",
  "Splash & Edge",
  "Sink & Cooktop",
  "Color & Edge",
  "Price Details",
] as const;

export const DRAWING_LAYOUT_HISTORY_LIMIT = 100;

export const DRAWING_ZOOM_MIN = 0.45;
export const DRAWING_ZOOM_MAX = 2.25;
export const DRAWING_ZOOM_STEP = 0.15;

function clampDrawingZoom(value: number) {
  return Math.min(DRAWING_ZOOM_MAX, Math.max(DRAWING_ZOOM_MIN, value));
}

export function drawingZoomIn(currentZoom: number) {
  return clampDrawingZoom(Number((currentZoom + DRAWING_ZOOM_STEP).toFixed(2)));
}

export function drawingZoomOut(currentZoom: number) {
  return clampDrawingZoom(Number((currentZoom - DRAWING_ZOOM_STEP).toFixed(2)));
}

export type DrawingWorkspacePoint = { x: number; y: number };

export function drawingCanvasPointFromScreenPoint(params: {
  point: DrawingWorkspacePoint;
  pan: DrawingWorkspacePoint;
  zoom: number;
}): DrawingWorkspacePoint {
  const safeZoom = params.zoom || 1;
  return {
    x: (params.point.x - params.pan.x) / safeZoom,
    y: (params.point.y - params.pan.y) / safeZoom,
  };
}

export function drawingDraggedPositionFromCanvasPoints(params: {
  origin: DrawingWorkspacePoint;
  start: DrawingWorkspacePoint;
  current: DrawingWorkspacePoint;
}): DrawingWorkspacePoint {
  return {
    x: params.origin.x + params.current.x - params.start.x,
    y: params.origin.y + params.current.y - params.start.y,
  };
}

export type DrawingLayoutHistory<TLayout> = {
  past: TLayout[];
  future: TLayout[];
};

export function drawingCommitLayoutHistory<TLayout>(params: {
  history: DrawingLayoutHistory<TLayout>;
  previousLayout: TLayout;
  nextLayout: TLayout;
  limit?: number;
}): DrawingLayoutHistory<TLayout> {
  if (Object.is(params.previousLayout, params.nextLayout)) {
    return params.history;
  }

  const limit = params.limit ?? DRAWING_LAYOUT_HISTORY_LIMIT;
  return {
    past: [...params.history.past, params.previousLayout].slice(-limit),
    future: [],
  };
}

export function drawingUndoLayoutHistory<TLayout>(params: {
  history: DrawingLayoutHistory<TLayout>;
  currentLayout: TLayout;
  limit?: number;
}) {
  const previous = params.history.past[params.history.past.length - 1];
  if (!previous) return null;

  const limit = params.limit ?? DRAWING_LAYOUT_HISTORY_LIMIT;
  return {
    layout: previous,
    history: {
      past: params.history.past.slice(0, -1),
      future: [params.currentLayout, ...params.history.future].slice(0, limit),
    },
  };
}

export function drawingRedoLayoutHistory<TLayout>(params: {
  history: DrawingLayoutHistory<TLayout>;
  currentLayout: TLayout;
  limit?: number;
}) {
  const next = params.history.future[0];
  if (!next) return null;

  const limit = params.limit ?? DRAWING_LAYOUT_HISTORY_LIMIT;
  return {
    layout: next,
    history: {
      past: [...params.history.past, params.currentLayout].slice(-limit),
      future: params.history.future.slice(1),
    },
  };
}
