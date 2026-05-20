"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type Konva from "konva";
import { Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createSinkCutoutAction,
  createCounterPieceForCanvasAction,
  generatePricingAction,
  updateAreaAction,
  deleteCounterPieceAction,
  deleteSinkCutoutAction,
  revertDrawingRevisionAction,
  saveDrawingAction,
  updateCounterPieceAction,
} from "../_actions";
import {
  applyOffsetToSegments,
  buildDeletedLine,
  connectEdgesToRectangle,
  isRectangularUnion,
  removeReferenceLine,
  visibleBoundaryEdges,
} from "./drawingGeometry";

const SCALE = 3;
const PIECE_GAP = 40;
const CANVAS_W = 760;
const CANVAS_H = 560;
const AUTO_PAN_MARGIN = 36;
const AUTO_PAN_STEP = 24;
const WORKSPACE_PADDING = 4000;
const STANDARD_DEPTH_IN = 25.5;
const SINK_COLOR = "#60a5fa";
const PIECE_FILL = "#eef7ec";
const PIECE_STROKE = "#78aa72";
const SELECT_STROKE = "#5f9659";
const GUIDE_COLOR = "#f5a884";
const DIMENSION_GUIDE = "#d9dee3";
const DIMENSION_TEXT = "#000000";
const DIMENSION_HOVER_TEXT = "#ea580c";
const DIMENSION_HOVER_FILL = "#fff1e7";
const DIMENSION_LABEL_FILL = "#ffffff";
const CHAIN_JOIN_TOLERANCE_PX = 2;
const CONTINUE_RUN_IN = 36;

type Tool =
  | "draw"
  | "text"
  | "pageBreak"
  | "otherCounter"
  | "pan"
  | "select"
  | "offset"
  | "connect"
  | "deleteLine";
type EditorStep = 1 | 2 | 3 | 4 | 5 | 6;
type EdgeKey = "top" | "right" | "bottom" | "left";
type CornerKey = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";
type CornerTreatment = "none" | "radius" | "clip" | "bumpOut" | "notch";
type EdgeTreatment =
  | "finished"
  | "appliance"
  | "mitered"
  | "waterfall"
  | "splash"
  | "unfinished"
  | "additionalFinished";
type SinkType = "undermount" | "drop_in" | "farm";
type SinkShape =
  | "rectangle"
  | "oval"
  | "double"
  | "60_40"
  | "40_60"
  | "70_30"
  | "30_70";
type SinkCenterline = "none" | "left" | "right" | "center";
type ContinueDirection = "right" | "left" | "up" | "down";

export interface DrawingPiece {
  id: string;
  name: string | null;
  lengthIn: number;
  widthIn: number;
}

export interface DrawingSink {
  id: string;
  model: string | null;
  cutoutLengthIn: number;
  cutoutWidthIn: number;
}

export interface LShapeLayout {
  type: "l";
  legX: number;
  legY: number;
  legWidthIn: number;
  legLengthIn: number;
}

export interface ZShapeLayout {
  type: "z";
  legX: number;
  legY: number;
  legWidthIn: number;
  legLengthIn: number;
  tailX: number;
  tailY: number;
  tailLengthIn: number;
  tailWidthIn: number;
}

export interface ChainShapeSegment {
  x: number;
  y: number;
  w: number;
  h: number;
  lengthIn: number;
  widthIn: number;
  orientation: "horizontal" | "vertical";
}

export interface ChainShapeLayout {
  type: "chain";
  segments: ChainShapeSegment[];
}

export type PieceShape = LShapeLayout | ZShapeLayout | ChainShapeLayout;

export interface PieceLayout {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
  groupId?: string | null;
  shape?: PieceShape | null;
}

export interface SinkLayout {
  sinkId: string;
  pieceId: string | null;
  x: number;
  y: number;
  rotation: number;
}

export interface CornerLayout {
  pieceId: string;
  corner: CornerKey;
  treatment: CornerTreatment;
  valueIn: number | null;
}

export interface EdgeLayout {
  pieceId: string;
  edge: EdgeKey;
  treatment: EdgeTreatment;
  splashHeightIn: number | null;
  label: string | null;
}

export interface ReferenceLineLayout {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  kind: "cabinet" | "wall";
  color: string;
}

export interface DeletedLineLayout {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
}

export interface CanvasLayout {
  pieces: PieceLayout[];
  sinks: SinkLayout[];
  corners: CornerLayout[];
  edges: EdgeLayout[];
  referenceLines: ReferenceLineLayout[];
  deletedLines: DeletedLineLayout[];
}

export interface DrawingRevisionSummary {
  id: string;
  revisionNumber: number;
  layout: CanvasLayout;
  createdAt: string;
  createdByUserId: string | null;
  notes: string | null;
}

export interface GeneratedPricingLine {
  id: string;
  quoteAreaId: string;
  category:
    | "material"
    | "fabrication"
    | "finished_edge"
    | "splash"
    | "sink_cutout"
    | "sink_item"
    | "faucet_hole";
  label: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  lineTotalCents: number;
  priceListItemId: string | null;
  sortOrder: number;
  overridePriceCents: number | null;
  overrideReason: string | null;
  overrideByUserId: string | null;
  overrideAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  customerId: string;
  quoteId: string;
  areaId: string;
  area: {
    id: string;
    name: string;
    sortOrder: number;
    material?: string | null;
    color?: string | null;
    edgeProfile?: string | null;
    notes?: string | null;
  };
  pieces: DrawingPiece[];
  sinks: DrawingSink[];
  initialLayout: CanvasLayout | null;
  latestRevision: DrawingRevisionSummary | null;
  revisions: DrawingRevisionSummary[];
  pricingLines: GeneratedPricingLine[];
  hasPriceList: boolean;
  isDraft: boolean;
  fullscreen?: boolean;
}

interface DrawPreview {
  x: number;
  y: number;
  w: number;
  h: number;
  lengthIn: number;
  widthIn: number;
  leg?: {
    x: number;
    y: number;
    w: number;
    h: number;
    lengthIn: number;
    widthIn: number;
  };
  tail?: {
    x: number;
    y: number;
    w: number;
    h: number;
    lengthIn: number;
    widthIn: number;
  };
  segments?: ChainShapeSegment[];
}

interface TextNote {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface CreatedCounterPiece {
  id: string;
}

interface ContextMenuState {
  pieceId: string;
  x: number;
  y: number;
}

interface SinkContextMenuState {
  sinkId: string;
  x: number;
  y: number;
}

interface EdgeLengthEditorState {
  pieceId: string;
  edge: EdgeKey;
  value: string;
  segmentIndex?: number;
  shapeEdge?: ShapeEdge;
}

interface CornerEditorState {
  pieceId: string;
  corner: CornerKey;
  treatment: CornerTreatment;
  value: string;
}

interface EdgeTreatmentEditorState {
  pieceId: string;
  edge: EdgeKey;
  treatment: EdgeTreatment;
  splashHeightIn: string;
  label: string;
}

interface ChainEdgeActionState {
  pieceId: string;
  edge: ShapeEdge;
  segmentIndex: number;
  mode?: "offset" | "connect";
}

const steps: Array<{ id: EditorStep; title: string; shortTitle: string }> = [
  { id: 1, title: "Counter Dimensions", shortTitle: "Counter Dimensions" },
  { id: 2, title: "Curves & Bumpouts", shortTitle: "Curves & Bumpouts" },
  { id: 3, title: "Splash & Edge", shortTitle: "Splash & Edge" },
  { id: 4, title: "Sink & Cooktop", shortTitle: "Sink & Cooktop" },
  { id: 5, title: "Color & Edge", shortTitle: "Color & Edge" },
  { id: 6, title: "Price Details", shortTitle: "Price Details" },
];

const sinkTypeOptions: SinkType[] = ["undermount", "drop_in", "farm"];
const sinkShapeOptions: SinkShape[] = [
  "rectangle",
  "oval",
  "double",
  "60_40",
  "40_60",
  "70_30",
  "30_70",
];
const sinkCenterlineOptions: SinkCenterline[] = [
  "none",
  "left",
  "right",
  "center",
];

function autoLayout(pieces: DrawingPiece[]): PieceLayout[] {
  let x = 30;
  let y = 30;
  let rowMaxH = 0;

  return pieces.map((piece) => {
    const w = piece.lengthIn * SCALE;
    const h = piece.widthIn * SCALE;

    if (x + w > CANVAS_W - 30 && x > 30) {
      x = 30;
      y += rowMaxH + PIECE_GAP;
      rowMaxH = 0;
    }

    const pos: PieceLayout = { pieceId: piece.id, x, y, rotation: 0 };
    x += w + PIECE_GAP;
    if (h > rowMaxH) rowMaxH = h;
    return pos;
  });
}

function mergeLayout(
  layout: CanvasLayout | null,
  pieces: DrawingPiece[],
  sinks: DrawingSink[],
): CanvasLayout {
  const validPieceIds = new Set(pieces.map((piece) => piece.id));
  const validSinkIds = new Set(sinks.map((sink) => sink.id));
  const base = {
    pieces: (layout?.pieces ?? []).filter((piece) =>
      validPieceIds.has(piece.pieceId),
    ),
    sinks: (layout?.sinks ?? []).filter(
      (sink) =>
        validSinkIds.has(sink.sinkId) &&
        (sink.pieceId === null || validPieceIds.has(sink.pieceId)),
    ),
    corners: (layout?.corners ?? []).filter((corner) =>
      validPieceIds.has(corner.pieceId),
    ),
    edges: (layout?.edges ?? []).filter((edge) =>
      validPieceIds.has(edge.pieceId),
    ),
    referenceLines: (layout?.referenceLines ?? []).filter((line) =>
      validPieceIds.has(line.pieceId),
    ),
    deletedLines: (layout?.deletedLines ?? []).filter((line) =>
      validPieceIds.has(line.pieceId),
    ),
  };
  const existing = new Set(base.pieces.map((p) => p.pieceId));
  const missing = pieces.filter((piece) => !existing.has(piece.id));

  if (missing.length === 0) {
    return base;
  }

  const auto = autoLayout(pieces);
  const additions = missing.map(
    (piece) =>
      auto.find((pos) => pos.pieceId === piece.id) ?? {
        pieceId: piece.id,
        x: 30,
        y: 30 + base.pieces.length * (STANDARD_DEPTH_IN * SCALE + PIECE_GAP),
        rotation: 0,
      },
  );

  return { ...base, pieces: [...base.pieces, ...additions] };
}

function roundToSixteenth(value: number, enabled: boolean) {
  return enabled ? Math.round(value * 16) / 16 : Math.round(value * 10) / 10;
}

function formatInches(value: number) {
  const whole = Math.floor(value);
  const fraction = Math.round((value - whole) * 16);
  if (fraction === 0) return `${whole}"`;
  if (fraction === 16) return `${whole + 1}"`;

  let numerator = fraction;
  let denominator = 16;
  while (numerator % 2 === 0) {
    numerator /= 2;
    denominator /= 2;
  }

  return whole === 0
    ? `${numerator}/${denominator}"`
    : `${whole} ${numerator}/${denominator}"`;
}

function toolCursor(tool: Tool, isDraft: boolean) {
  if (!isDraft) return "default";
  if (tool === "draw") return "crosshair";
  if (tool === "pan") return "grab";
  if (tool === "text") return "text";
  return "default";
}

function isCreatedCounterPiece(value: unknown): value is CreatedCounterPiece {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function edgeLabel(edge: EdgeKey) {
  if (edge === "top") return "Top Edge";
  if (edge === "right") return "Right Edge";
  if (edge === "bottom") return "Bottom Edge";
  return "Left Edge";
}

function nextEdge(edge: EdgeKey): EdgeKey {
  const edgeOrder: EdgeKey[] = ["top", "right", "bottom", "left"];
  const index = edgeOrder.indexOf(edge);
  return edgeOrder[(index + 1) % edgeOrder.length] ?? "top";
}

function cornerLabel(corner: CornerKey) {
  if (corner === "topLeft") return "Top Left Corner";
  if (corner === "topRight") return "Top Right Corner";
  if (corner === "bottomRight") return "Bottom Right Corner";
  return "Bottom Left Corner";
}

function nextCorner(corner: CornerKey): CornerKey {
  const cornerOrder: CornerKey[] = [
    "topLeft",
    "topRight",
    "bottomRight",
    "bottomLeft",
  ];
  const index = cornerOrder.indexOf(corner);
  return cornerOrder[(index + 1) % cornerOrder.length] ?? "topLeft";
}

function treatmentLabel(treatment: CornerTreatment) {
  if (treatment === "radius") return "Radius";
  if (treatment === "clip") return "Clip";
  if (treatment === "bumpOut") return "Bump Out";
  if (treatment === "notch") return "Notch";
  return "None";
}

function treatmentMarker(treatment: CornerTreatment) {
  if (treatment === "none") return "-Std-";
  if (treatment === "bumpOut") return "Bump";
  return treatmentLabel(treatment);
}

function edgeTreatmentLabel(treatment: EdgeTreatment) {
  if (treatment === "finished") return "Finished Edge (Eased)";
  if (treatment === "appliance") return "Appliance Edge";
  if (treatment === "mitered") return "Mitered Edge";
  if (treatment === "waterfall") return "Waterfall";
  if (treatment === "splash") return "Splash";
  if (treatment === "additionalFinished") return "Additional Finished Edge";
  return "Unfinished Edge";
}

function edgeMarker(edge: EdgeLayout | undefined) {
  if (!edge) return "F";
  if (edge.treatment === "unfinished") return "U";
  if (edge.treatment === "mitered") return "M";
  if (edge.treatment === "waterfall") return "W";
  if (edge.treatment === "appliance") return "A";
  if (edge.treatment === "additionalFinished") return edge.label ?? "F1";
  if (edge.treatment === "splash") {
    if (edge.splashHeightIn === 3) return "S3";
    if (edge.splashHeightIn === 4) return "S4";
    if (edge.splashHeightIn === 5) return "S5";
    return edge.label ?? "S";
  }
  return edge.label ?? "F";
}

function edgeValue(piece: DrawingPiece, edge: EdgeKey) {
  return edge === "top" || edge === "bottom" ? piece.lengthIn : piece.widthIn;
}

function isLShape(shape: PieceShape | null | undefined): shape is LShapeLayout {
  return shape?.type === "l";
}

function isZShape(shape: PieceShape | null | undefined): shape is ZShapeLayout {
  return shape?.type === "z";
}

function isChainShape(
  shape: PieceShape | null | undefined,
): shape is ChainShapeLayout {
  return shape?.type === "chain";
}

function lShapeGeometry(piece: DrawingPiece, shape: LShapeLayout) {
  const mainW = piece.lengthIn * SCALE;
  const mainH = piece.widthIn * SCALE;
  const legW = shape.legWidthIn * SCALE;
  const legH = shape.legLengthIn * SCALE;
  const legX = shape.legX;
  const legY = shape.legY;
  const legOnLeft = legX <= 0;
  const legAbove = legY < 0;

  const outline = (() => {
    if (!legAbove && !legOnLeft) {
      return [
        0,
        0,
        mainW,
        0,
        mainW,
        legY + legH,
        legX,
        legY + legH,
        legX,
        mainH,
        0,
        mainH,
      ];
    }
    if (!legAbove && legOnLeft) {
      return [
        0,
        0,
        mainW,
        0,
        mainW,
        mainH,
        legX + legW,
        mainH,
        legX + legW,
        legY + legH,
        0,
        legY + legH,
      ];
    }
    if (legAbove && !legOnLeft) {
      return [0, 0, legX, 0, legX, legY, mainW, legY, mainW, mainH, 0, mainH];
    }
    return [
      0,
      legY,
      legX + legW,
      legY,
      legX + legW,
      0,
      mainW,
      0,
      mainW,
      mainH,
      0,
      mainH,
    ];
  })();

  return {
    mainW,
    mainH,
    legW,
    legH,
    legX,
    legY,
    outline,
    rects: [
      { x: 0, y: 0, w: mainW, h: mainH },
      { x: legX, y: legY, w: legW, h: legH },
    ],
  };
}

interface ShapeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ShapeEdge {
  from: [number, number];
  to: [number, number];
}

interface LabelPosition {
  x: number;
  y: number;
}

function pointKey(x: number, y: number) {
  return `${Number(x.toFixed(4))},${Number(y.toFixed(4))}`;
}

function rectUnionBoundary(rects: ShapeRect[]) {
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

      if (isCovered) {
        covered.add(`${xIndex},${yIndex}`);
      }
    }
  }

  const edges: ShapeEdge[] = [];
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

function mergeBoundaryEdges(edges: ShapeEdge[]) {
  const horizontal = new Map<number, Array<[number, number]>>();
  const vertical = new Map<number, Array<[number, number]>>();

  edges.forEach((edge) => {
    if (edge.from[1] === edge.to[1]) {
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

  const merged: ShapeEdge[] = [];
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

function rectUnionOutline(rects: ShapeRect[]) {
  const edges = rectUnionBoundary(rects);

  if (edges.length === 0) {
    return [];
  }

  const neighbors = new Map<string, string[]>();
  const points = new Map<string, [number, number]>();
  const addNeighbor = (from: [number, number], to: [number, number]) => {
    const fromKey = pointKey(from[0], from[1]);
    const toKey = pointKey(to[0], to[1]);
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

  if (!start) {
    return [];
  }

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

  const simplified = ordered.filter((point, index, all) => {
    const previous = all[(index - 1 + all.length) % all.length];
    const next = all[(index + 1) % all.length];
    if (!previous || !next) return true;
    return !(
      (previous[0] === point[0] && point[0] === next[0]) ||
      (previous[1] === point[1] && point[1] === next[1])
    );
  });

  return simplified.flatMap(([x, y]) => [x, y]);
}

function isPointInsideRects(rects: ShapeRect[], x: number, y: number) {
  return rects.some(
    (rect) =>
      x >= rect.x &&
      x <= rect.x + rect.w &&
      y >= rect.y &&
      y <= rect.y + rect.h,
  );
}

function chainSegmentLabelPosition(
  segment: ShapeRect & { orientation: "horizontal" | "vertical" },
  rects: ShapeRect[],
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

function zShapeGeometry(piece: DrawingPiece, shape: ZShapeLayout) {
  const mainW = piece.lengthIn * SCALE;
  const mainH = piece.widthIn * SCALE;
  const legW = shape.legWidthIn * SCALE;
  const legH = shape.legLengthIn * SCALE;
  const tailW = shape.tailLengthIn * SCALE;
  const tailH = shape.tailWidthIn * SCALE;
  const rects = [
    { x: 0, y: 0, w: mainW, h: mainH },
    { x: shape.legX, y: shape.legY, w: legW, h: legH },
    { x: shape.tailX, y: shape.tailY, w: tailW, h: tailH },
  ];

  return {
    mainW,
    mainH,
    legW,
    legH,
    tailW,
    tailH,
    rects,
    outline: rectUnionOutline(rects),
  };
}

function chainShapeGeometry(shape: ChainShapeLayout) {
  const rects = shape.segments.map((segment) => ({
    x: segment.x,
    y: segment.y,
    w: segment.w,
    h: segment.h,
  }));

  return {
    rects,
    outline: rectUnionOutline(rects),
    edges: mergeBoundaryEdges(rectUnionBoundary(rects)),
  };
}

function edgeMidpoint(edge: ShapeEdge) {
  return {
    x: (edge.from[0] + edge.to[0]) / 2,
    y: (edge.from[1] + edge.to[1]) / 2,
  };
}

function shapeBounds(rects: ShapeRect[]) {
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

function boundaryEdgeKey(edge: ShapeEdge, rects: ShapeRect[]): EdgeKey {
  const horizontal = edge.from[1] === edge.to[1];
  const outside = boundaryOutsideSide(edge, rects);

  if (horizontal) {
    return outside === "above" ? "top" : "bottom";
  }

  return outside === "left" ? "left" : "right";
}

function boundaryOutsideSide(
  edge: ShapeEdge,
  rects: ShapeRect[],
): "above" | "below" | "left" | "right" {
  const midpoint = edgeMidpoint(edge);
  const bounds = shapeBounds(rects);
  const horizontal = edge.from[1] === edge.to[1];

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

function boundaryGuide(edge: ShapeEdge, rects: ShapeRect[]) {
  const horizontal = edge.from[1] === edge.to[1];
  const midpoint = edgeMidpoint(edge);
  const outside = boundaryOutsideSide(edge, rects);
  const edgeLength = boundaryEdgeLength(edge);

  if (horizontal) {
    const isAbove = outside === "above";
    const y = edge.from[1] + (isAbove ? -14 : 14);
    const tickDirection = isAbove ? 1 : -1;
    return {
      line: [edge.from[0], y, edge.to[0], y],
      startTick: [edge.from[0], y, edge.from[0], edge.from[1]],
      endTick: [edge.to[0], y, edge.to[0], edge.to[1]],
      label: {
        x: midpoint.x,
        y,
      },
      leftArrow: [
        edge.from[0],
        y,
        edge.from[0] + 6,
        y - 4 * tickDirection,
        edge.from[0] + 6,
        y + 4 * tickDirection,
      ],
      rightArrow: [
        edge.to[0],
        y,
        edge.to[0] - 6,
        y - 4 * tickDirection,
        edge.to[0] - 6,
        y + 4 * tickDirection,
      ],
    };
  }

  const isLeft = outside === "left";
  const x = edge.from[0] + (isLeft ? -14 : 14);
  const tickDirection = isLeft ? 1 : -1;
  return {
    line: [x, edge.from[1], x, edge.to[1]],
    startTick: [x, edge.from[1], edge.from[0], edge.from[1]],
    endTick: [x, edge.to[1], edge.to[0], edge.to[1]],
    label: { x, y: midpoint.y },
    leftArrow: [
      x,
      edge.from[1],
      x - 4 * tickDirection,
      edge.from[1] + 6,
      x + 4 * tickDirection,
      edge.from[1] + 6,
    ],
    rightArrow: [
      x,
      edge.to[1],
      x - 4 * tickDirection,
      edge.to[1] - 6,
      x + 4 * tickDirection,
      edge.to[1] - 6,
    ],
  };
}

function boundaryEdgeLength(edge: ShapeEdge) {
  return (
    (Math.abs(edge.from[0] - edge.to[0]) +
      Math.abs(edge.from[1] - edge.to[1])) /
    SCALE
  );
}

function rectangleShapeEdge(
  width: number,
  height: number,
  edge: EdgeKey,
): ShapeEdge {
  if (edge === "top") return { from: [0, 0], to: [width, 0] };
  if (edge === "right") return { from: [width, 0], to: [width, height] };
  if (edge === "bottom") return { from: [width, height], to: [0, height] };
  return { from: [0, height], to: [0, 0] };
}

function chainSegmentIndexForEdge(shape: ChainShapeLayout, edge: ShapeEdge) {
  const midpoint = edgeMidpoint(edge);
  const horizontal = edge.from[1] === edge.to[1];

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

function rectIndexForEdge(rects: ShapeRect[], edge: ShapeEdge) {
  const midpoint = edgeMidpoint(edge);
  const horizontal = edge.from[1] === edge.to[1];

  return rects.findIndex((rect) => {
    const onX =
      midpoint.x >= rect.x - 0.001 && midpoint.x <= rect.x + rect.w + 0.001;
    const onY =
      midpoint.y >= rect.y - 0.001 && midpoint.y <= rect.y + rect.h + 0.001;

    if (horizontal) {
      return (
        onX &&
        (Math.abs(midpoint.y - rect.y) < 0.001 ||
          Math.abs(midpoint.y - (rect.y + rect.h)) < 0.001)
      );
    }

    return (
      onY &&
      (Math.abs(midpoint.x - rect.x) < 0.001 ||
        Math.abs(midpoint.x - (rect.x + rect.w)) < 0.001)
    );
  });
}

function rectsToChainSegments(rects: ShapeRect[]): ChainShapeSegment[] {
  return rects.map((rect) => ({
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    lengthIn: roundToSixteenth(rect.w / SCALE, true),
    widthIn: roundToSixteenth(rect.h / SCALE, true),
    orientation: rect.w >= rect.h ? "horizontal" : "vertical",
  }));
}

function chainInnerDepthGuides(shape: ChainShapeLayout) {
  const rects = shape.segments.map((segment) => ({
    x: segment.x,
    y: segment.y,
    w: segment.w,
    h: segment.h,
  }));
  if (isRectangularUnion(rects)) return [];

  const edges = mergeBoundaryEdges(rectUnionBoundary(rects));
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
      value: (x2 - x1) / SCALE,
      label: {
        x: (x1 + x2) / 2,
        y,
      },
    },
  ];
}

function valuesNear(a: number, b: number) {
  return Math.abs(a - b) <= CHAIN_JOIN_TOLERANCE_PX;
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return Math.min(endA, endB) - Math.max(startA, startB) > 0.001;
}

function shapeEdgesEqual(left: ShapeEdge, right: ShapeEdge) {
  return (
    valuesNear(left.from[0], right.from[0]) &&
    valuesNear(left.from[1], right.from[1]) &&
    valuesNear(left.to[0], right.to[0]) &&
    valuesNear(left.to[1], right.to[1])
  );
}

function lineId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}:${Date.now()}`;
}

function shapeEdgeMatchesLine(
  edge: ShapeEdge,
  line: { from: [number, number]; to: [number, number] },
) {
  return (
    shapeEdgesEqual(edge, line) ||
    shapeEdgesEqual(edge, { from: line.to, to: line.from })
  );
}

function addDeletedLineOnce(
  lines: DeletedLineLayout[],
  pieceId: string,
  edge: ShapeEdge,
) {
  if (
    lines.some(
      (line) => line.pieceId === pieceId && shapeEdgeMatchesLine(edge, line),
    )
  ) {
    return lines;
  }

  return [
    ...lines,
    buildDeletedLine({
      id: lineId(pieceId),
      pieceId,
      edge,
    }),
  ];
}

function drawingRectsForPiece(
  piece: DrawingPiece,
  pieceLayout: PieceLayout,
): ShapeRect[] {
  if (pieceLayout.shape && isChainShape(pieceLayout.shape)) {
    return chainShapeGeometry(pieceLayout.shape).rects;
  }
  if (pieceLayout.shape && isZShape(pieceLayout.shape)) {
    return zShapeGeometry(piece, pieceLayout.shape).rects;
  }
  if (pieceLayout.shape && isLShape(pieceLayout.shape)) {
    return lShapeGeometry(piece, pieceLayout.shape).rects;
  }

  return [
    {
      x: 0,
      y: 0,
      w: piece.lengthIn * SCALE,
      h: piece.widthIn * SCALE,
    },
  ];
}

function canvasPointToPiecePoint(
  piece: PieceLayout,
  point: { x: number; y: number },
) {
  const translated = {
    x: point.x - piece.x,
    y: point.y - piece.y,
  };
  const radians = (-piece.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: translated.x * cos - translated.y * sin,
    y: translated.x * sin + translated.y * cos,
  };
}

function chainSegmentAttachmentSide(
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

function chainSegmentAttachmentAxisSide(
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

function resizeChainSegments(
  segments: ChainShapeSegment[],
  segmentIndex: number,
  numericValue: number,
  edge: ShapeEdge,
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
    oldSizePx + numericValue * SCALE - oldEdgeSizePx,
    SCALE,
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
          lengthIn: roundToSixteenth(newSizePx / SCALE, true),
        };
      }

      return {
        ...segment,
        y: resizeFromEnd ? segment.y : segment.y - deltaPx,
        h: newSizePx,
        widthIn: roundToSixteenth(newSizePx / SCALE, true),
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

function chainFreeEnd(shape: ChainShapeLayout) {
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

function continueArrowPoints(direction: ContinueDirection) {
  if (direction === "up") return [0, 20, 0, -28, -12, -14, 0, -28, 12, -14];
  if (direction === "down") return [0, -20, 0, 28, -12, 14, 0, 28, 12, 14];
  if (direction === "left") return [20, 0, -28, 0, -14, -12, -28, 0, -14, 12];
  return [-20, 0, 28, 0, 14, -12, 28, 0, 14, 12];
}

function Modal({
  open,
  title,
  children,
  onClose,
  panelClassName = "w-full max-w-3xl rounded-lg border bg-white shadow-xl",
  headerClassName = "flex items-center justify-between border-b px-5 py-4",
  bodyClassName = "p-5",
  closeLabel = "Close",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  closeLabel?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={panelClassName}>
        <div className={headerClassName}>
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm font-semibold text-current hover:bg-black/10"
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>
  );
}

interface EdgeLengthPreviewModel {
  rects: ShapeRect[];
  edge: ShapeEdge;
}

function EdgeLengthPreview({ model }: { model: EdgeLengthPreviewModel }) {
  const bounds = shapeBounds(model.rects);
  const width = 190;
  const height = 120;
  const padding = 16;
  const scale = Math.min(
    (width - padding * 2) / Math.max(bounds.maxX - bounds.minX, 1),
    (height - padding * 2) / Math.max(bounds.maxY - bounds.minY, 1),
  );
  const point = ([x, y]: [number, number]) => ({
    x: padding + (x - bounds.minX) * scale,
    y: padding + (y - bounds.minY) * scale,
  });
  const outlinePoints = rectUnionOutline(model.rects);
  const outline: string[] = [];
  for (let index = 0; index < outlinePoints.length; index += 2) {
    const mapped = point([
      outlinePoints[index] ?? 0,
      outlinePoints[index + 1] ?? 0,
    ]);
    outline.push(`${mapped.x},${mapped.y}`);
  }
  const from = point(model.edge.from);
  const to = point(model.edge.to);

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      className="h-32 w-56"
    >
      <defs>
        <marker
          id="edge-preview-arrow"
          markerHeight="6"
          markerWidth="6"
          orient="auto-start-reverse"
          refX="5"
          refY="3"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#f97316" />
        </marker>
      </defs>
      <polygon
        points={outline.join(" ")}
        fill="#ffffff"
        stroke="#9ca3af"
        strokeWidth="2"
      />
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="#f97316"
        strokeWidth="3"
        markerStart="url(#edge-preview-arrow)"
        markerEnd="url(#edge-preview-arrow)"
      />
    </svg>
  );
}

function dimensionLabelBox(text: string) {
  return {
    width: Math.max(text.length * 6 + 12, 30),
    height: 16,
  };
}

function splitGuideLineAroundLabel(
  line: number[],
  label: { x: number; y: number },
  text: string,
) {
  const box = dimensionLabelBox(text);
  const horizontal = line[1] === line[3];
  if (horizontal) {
    const y = line[1] ?? 0;
    const startX = line[0] ?? 0;
    const endX = line[2] ?? startX;
    const gapStart = label.x - box.width / 2 - 4;
    const gapEnd = label.x + box.width / 2 + 4;
    return [
      [startX, y, Math.max(startX, gapStart), y],
      [Math.min(endX, gapEnd), y, endX, y],
    ];
  }

  const x = line[0] ?? 0;
  const startY = line[1] ?? 0;
  const endY = line[3] ?? startY;
  const rotatedHeight = box.width;
  const gapStart = label.y - rotatedHeight / 2 - 4;
  const gapEnd = label.y + rotatedHeight / 2 + 4;
  return [
    [x, startY, x, Math.max(startY, gapStart)],
    [x, Math.min(endY, gapEnd), x, endY],
  ];
}

function DimensionLabel({
  text,
  x,
  y,
  hovered,
  backing = false,
  orientation = "horizontal",
}: {
  text: string;
  x: number;
  y: number;
  hovered: boolean;
  backing?: boolean;
  orientation?: "horizontal" | "vertical";
}) {
  const box = dimensionLabelBox(text);
  const rotation = orientation === "vertical" ? -90 : 0;

  return (
    <Group x={x} y={y} rotation={rotation}>
      {hovered || backing ? (
        <Rect
          x={-box.width / 2}
          y={-box.height / 2}
          width={box.width}
          height={box.height}
          fill={hovered ? DIMENSION_HOVER_FILL : DIMENSION_LABEL_FILL}
          stroke={hovered ? DIMENSION_HOVER_TEXT : DIMENSION_LABEL_FILL}
          strokeWidth={hovered ? 1 : 0}
          cornerRadius={2}
        />
      ) : null}
      <Text
        text={text}
        x={-box.width / 2}
        y={-5}
        width={box.width}
        align="center"
        fontSize={10}
        fill={hovered ? DIMENSION_HOVER_TEXT : DIMENSION_TEXT}
      />
    </Group>
  );
}

export function DrawingCanvasInner({
  customerId,
  quoteId,
  areaId,
  area,
  pieces,
  sinks,
  initialLayout,
  latestRevision,
  revisions,
  pricingLines,
  hasPriceList,
  isDraft,
  fullscreen = false,
}: Props) {
  const router = useRouter();
  const [layout, setLayout] = useState<CanvasLayout>(() =>
    mergeLayout(initialLayout, pieces, sinks),
  );
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedSinkId, setSelectedSinkId] = useState<string | null>(null);
  const [sinkPaletteId, setSinkPaletteId] = useState<string | null>(null);
  const [sinkCreateOpen, setSinkCreateOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<EditorStep>(1);
  const [tool, setTool] = useState<Tool>("draw");
  const [roundSixteenth, setRoundSixteenth] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  const [textNotes, setTextNotes] = useState<TextNote[]>([]);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [drawPath, setDrawPath] = useState<Array<{ x: number; y: number }>>([]);
  const [drawPreview, setDrawPreview] = useState<DrawPreview | null>(null);
  const [panStart, setPanStart] = useState<{
    pointer: { x: number; y: number };
    pan: { x: number; y: number };
  } | null>(null);
  const [pieceOverrides, setPieceOverrides] = useState<
    Record<string, { lengthIn: number; widthIn: number }>
  >({});
  const [pendingTextAt, setPendingTextAt] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [editDraft, setEditDraft] = useState<{
    pieceId: string;
    name: string;
    lengthIn: string;
    widthIn: string;
  } | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveNotes, setSaveNotes] = useState("");
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [areaDraft, setAreaDraft] = useState({
    name: area.name,
    sortOrder: String(area.sortOrder),
    material: area.material ?? "",
    color: area.color ?? "",
    edgeProfile: area.edgeProfile ?? "",
    notes: area.notes ?? "",
  });
  const [areaSaving, setAreaSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [sinkContextMenu, setSinkContextMenu] =
    useState<SinkContextMenuState | null>(null);
  const [edgeEditor, setEdgeEditor] = useState<EdgeLengthEditorState | null>(
    null,
  );
  const [offsetAmount, setOffsetAmount] = useState("1");
  const [chainEdgeAction, setChainEdgeAction] =
    useState<ChainEdgeActionState | null>(null);
  const [hoveredChainEdgeId, setHoveredChainEdgeId] = useState<string | null>(
    null,
  );
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);
  const [cornerEditor, setCornerEditor] = useState<CornerEditorState | null>(
    null,
  );
  const [edgeTreatmentEditor, setEdgeTreatmentEditor] =
    useState<EdgeTreatmentEditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const stageRef = useRef<Konva.Stage | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_W);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_H);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    setLayout((currentLayout) => {
      const nextLayout = mergeLayout(initialLayout, pieces, sinks);
      const currentPieces = new Map(
        currentLayout.pieces.map((piece) => [piece.pieceId, piece]),
      );

      return {
        ...nextLayout,
        pieces: nextLayout.pieces.map((piece) => {
          const currentPiece = currentPieces.get(piece.pieceId);
          if (!currentPiece?.shape || piece.shape) return piece;

          return {
            ...piece,
            shape: currentPiece.shape,
          };
        }),
      };
    });
  }, [initialLayout, pieces, sinks]);

  useEffect(() => {
    setPieceOverrides({});
  }, [pieces]);

  useEffect(() => {
    setSaveNotes("");
    setIsDirty(false);
  }, [latestRevision?.id]);

  useEffect(() => {
    setAreaDraft({
      name: area.name,
      sortOrder: String(area.sortOrder),
      material: area.material ?? "",
      color: area.color ?? "",
      edgeProfile: area.edgeProfile ?? "",
      notes: area.notes ?? "",
    });
  }, [
    area.color,
    area.edgeProfile,
    area.id,
    area.material,
    area.name,
    area.notes,
    area.sortOrder,
  ]);

  useEffect(() => {
    if (!editDraft) return;
    const refreshedPiece = pieces.find(
      (piece) => piece.id === editDraft.pieceId,
    );
    if (!refreshedPiece) return;
    setEditDraft({
      pieceId: refreshedPiece.id,
      name: refreshedPiece.name ?? "",
      lengthIn: String(refreshedPiece.lengthIn),
      widthIn: String(refreshedPiece.widthIn),
    });
  }, [editDraft?.pieceId, pieces]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const container = stageContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      setCanvasWidth(Math.max(CANVAS_W, Math.floor(container.clientWidth)));
      setCanvasHeight(
        fullscreen
          ? Math.max(CANVAS_H, Math.floor(container.clientHeight))
          : CANVAS_H,
      );
    };

    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(container);
    return () => observer.disconnect();
  }, [fullscreen]);

  const pieceMap = useMemo(
    () => new Map(pieces.map((p) => [p.id, p])),
    [pieces],
  );
  const sinkMap = useMemo(() => new Map(sinks.map((s) => [s.id, s])), [sinks]);
  const getRenderedPiece = useCallback(
    (piece: DrawingPiece): DrawingPiece => {
      const override = pieceOverrides[piece.id];
      return override ? { ...piece, ...override } : piece;
    },
    [pieceOverrides],
  );

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const resetTransientState = useCallback(() => {
    setSelectedPieceId(null);
    setSelectedSinkId(null);
    setSinkPaletteId(null);
    setContextMenu(null);
    setSinkContextMenu(null);
    setEdgeEditor(null);
    setChainEdgeAction(null);
    setHoveredChainEdgeId(null);
    setCornerEditor(null);
    setEdgeTreatmentEditor(null);
    setEditDraft(null);
    setPendingTextAt(null);
    setTextDraft("");
    setDrawStart(null);
    setDrawPath([]);
    setDrawPreview(null);
    setPanStart(null);
    setTool("draw");
    setActiveStep(1);
    setHelpOpen(false);
    setSaveModalOpen(false);
    setRevisionsOpen(false);
  }, []);

  const screenToCanvas = useCallback(
    (point: { x: number; y: number }) => {
      const safeZoom = zoom || 1;
      return {
        x: (point.x - pan.x) / safeZoom,
        y: (point.y - pan.y) / safeZoom,
      };
    },
    [pan.x, pan.y, zoom],
  );

  const getPointer = useCallback(() => {
    const pointer = stageRef.current?.getStage().getPointerPosition();
    return pointer ? screenToCanvas(pointer) : null;
  }, [screenToCanvas]);

  const buildPreview = useCallback(
    (
      start: { x: number; y: number },
      current: { x: number; y: number },
      path: Array<{ x: number; y: number }> = [],
    ): DrawPreview => {
      const trace = [...path, current];
      const depthPx = STANDARD_DEPTH_IN * SCALE;
      const firstHorizontalIntentIndex = trace.findIndex(
        (point) => Math.abs(point.x - start.x) >= depthPx,
      );
      const firstVerticalIntentIndex = trace.findIndex(
        (point) => Math.abs(point.y - start.y) >= depthPx,
      );
      const startsVertical =
        firstVerticalIntentIndex >= 0 &&
        (firstHorizontalIntentIndex < 0 ||
          firstVerticalIntentIndex <= firstHorizontalIntentIndex);
      const chainVertices = [{ ...start }];
      let currentAxis: "x" | "y" = startsVertical ? "y" : "x";
      let currentVertex = start;
      let currentEnd = { ...start };
      const firstDirectionPoint = trace.find(
        (point) => Math.abs(point.x - start.x) >= 10,
      );
      let horizontalDirection =
        (firstDirectionPoint?.x ?? current.x) >= start.x ? 1 : -1;
      let verticalDirection = current.y >= start.y ? 1 : -1;

      for (const point of trace) {
        if (currentAxis === "x") {
          const nextX =
            horizontalDirection > 0
              ? Math.max(point.x, currentVertex.x)
              : Math.min(point.x, currentVertex.x);
          currentEnd = { x: nextX, y: currentVertex.y };

          if (
            Math.abs(point.y - currentVertex.y) > depthPx + 8 &&
            Math.abs(currentEnd.x - currentVertex.x) >= depthPx
          ) {
            chainVertices.push(currentEnd);
            currentAxis = "y";
            verticalDirection = point.y >= currentVertex.y ? 1 : -1;
            currentVertex = currentEnd;
            currentEnd = { x: currentVertex.x, y: point.y };
          }
          continue;
        }

        const nextY =
          verticalDirection > 0
            ? Math.max(point.y, currentVertex.y)
            : Math.min(point.y, currentVertex.y);
        currentEnd = { x: currentVertex.x, y: nextY };

        if (
          Math.abs(point.x - currentVertex.x) > depthPx + 8 &&
          Math.abs(currentEnd.y - currentVertex.y) >= depthPx
        ) {
          chainVertices.push(currentEnd);
          currentAxis = "x";
          horizontalDirection = point.x >= currentVertex.x ? 1 : -1;
          currentVertex = currentEnd;
          currentEnd = { x: point.x, y: currentVertex.y };
        }
      }

      const lastChainVertex = chainVertices[chainVertices.length - 1] ?? start;
      if (
        Math.hypot(
          currentEnd.x - lastChainVertex.x,
          currentEnd.y - lastChainVertex.y,
        ) >= SCALE
      ) {
        chainVertices.push(currentEnd);
      }

      const chainSegments: ChainShapeSegment[] = [];
      chainVertices.slice(0, -1).forEach((from, index) => {
        const to = chainVertices[index + 1];
        if (!to) return;
        const dx = to.x - from.x;
        const dy = to.y - from.y;

        if (Math.abs(dx) >= Math.abs(dy)) {
          const previousVertex = chainVertices[index - 1];
          const y =
            index === 0
              ? from.y
              : previousVertex && from.y > previousVertex.y
                ? from.y - depthPx
                : from.y;
          const w = Math.max(Math.abs(dx), SCALE);
          chainSegments.push({
            x: Math.min(from.x, to.x),
            y,
            w,
            h: depthPx,
            lengthIn: roundToSixteenth(w / SCALE, roundSixteenth),
            widthIn: STANDARD_DEPTH_IN,
            orientation: "horizontal" as const,
          });
          return;
        }

        const previous = chainVertices[index - 1] ?? start;
        const previousDx = from.x - previous.x;
        const x =
          index === 0 ? from.x : previousDx >= 0 ? from.x - depthPx : from.x;
        const h = Math.max(Math.abs(dy), SCALE);
        if (h < SCALE) return;
        chainSegments.push({
          x,
          y: Math.min(from.y, to.y),
          w: depthPx,
          h,
          lengthIn: STANDARD_DEPTH_IN,
          widthIn: roundToSixteenth(h / SCALE, roundSixteenth),
          orientation: "vertical" as const,
        });
      });

      if (chainSegments.length >= 2) {
        const minX = Math.min(...chainSegments.map((segment) => segment.x));
        const minY = Math.min(...chainSegments.map((segment) => segment.y));
        const maxX = Math.max(
          ...chainSegments.map((segment) => segment.x + segment.w),
        );
        const maxY = Math.max(
          ...chainSegments.map((segment) => segment.y + segment.h),
        );
        return {
          x: minX,
          y: minY,
          w: maxX - minX,
          h: maxY - minY,
          lengthIn: roundToSixteenth((maxX - minX) / SCALE, roundSixteenth),
          widthIn: roundToSixteenth((maxY - minY) / SCALE, roundSixteenth),
          segments: chainSegments,
        };
      }

      const firstHorizontalIndex = trace.findIndex(
        (point) => Math.abs(point.x - start.x) >= 10,
      );
      const firstHorizontalPoint =
        firstHorizontalIndex >= 0 ? trace[firstHorizontalIndex] : undefined;
      const fallbackHorizontalDirection =
        (firstHorizontalPoint?.x ?? current.x) >= start.x ? 1 : -1;
      const h = depthPx;
      const firstVerticalIndex = trace.findIndex(
        (point, index) =>
          index >= Math.max(firstHorizontalIndex, 0) &&
          Math.abs(point.y - start.y) > h + 8,
      );

      if (startsVertical) {
        const verticalDirection = current.y >= start.y ? 1 : -1;
        const verticalTrace =
          firstHorizontalIntentIndex >= 0
            ? trace.slice(0, firstHorizontalIntentIndex + 1)
            : [start, current];
        const turnY =
          verticalDirection > 0
            ? Math.max(...verticalTrace.map((point) => point.y), start.y)
            : Math.min(...verticalTrace.map((point) => point.y), start.y);
        const heightPx = Math.max(Math.abs(turnY - start.y), SCALE);
        const heightIn = Math.max(
          roundToSixteenth(heightPx / SCALE, roundSixteenth),
          1,
        );
        const mainRect = {
          x: start.x,
          y: verticalDirection > 0 ? start.y : start.y - heightPx,
          w: depthPx,
          h: heightPx,
          lengthIn: STANDARD_DEPTH_IN,
          widthIn: heightIn,
          orientation: "vertical" as const,
        };
        const horizontalDirection = current.x >= start.x ? 1 : -1;
        const tailProgressPx =
          horizontalDirection > 0
            ? Math.max(current.x - start.x, 0)
            : Math.max(start.x - current.x, 0);
        const tailLengthIn = Math.max(
          roundToSixteenth(tailProgressPx / SCALE, roundSixteenth),
          0,
        );
        const tailW = tailLengthIn * SCALE;

        if (tailProgressPx > depthPx + 8) {
          const tailRect = {
            x: horizontalDirection > 0 ? start.x : start.x + depthPx - tailW,
            y: verticalDirection > 0 ? turnY - depthPx : turnY,
            w: tailW,
            h: depthPx,
            lengthIn: tailLengthIn,
            widthIn: STANDARD_DEPTH_IN,
            orientation: "horizontal" as const,
          };
          const segments = [mainRect, tailRect];
          const minX = Math.min(...segments.map((segment) => segment.x));
          const minY = Math.min(...segments.map((segment) => segment.y));
          const maxX = Math.max(
            ...segments.map((segment) => segment.x + segment.w),
          );
          const maxY = Math.max(
            ...segments.map((segment) => segment.y + segment.h),
          );
          return {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY,
            lengthIn: roundToSixteenth((maxX - minX) / SCALE, roundSixteenth),
            widthIn: roundToSixteenth((maxY - minY) / SCALE, roundSixteenth),
            segments,
          };
        }

        return {
          x: mainRect.x,
          y: mainRect.y,
          w: mainRect.w,
          h: mainRect.h,
          lengthIn: mainRect.lengthIn,
          widthIn: mainRect.widthIn,
        };
      }

      const turnTrace =
        firstVerticalIndex >= 0
          ? trace.slice(0, firstVerticalIndex + 1)
          : [start, current];
      const turnX =
        fallbackHorizontalDirection > 0
          ? Math.max(...turnTrace.map((point) => point.x), start.x)
          : Math.min(...turnTrace.map((point) => point.x), start.x);
      const lengthPx = Math.max(Math.abs(turnX - start.x), SCALE);
      const lengthIn = Math.max(
        roundToSixteenth(lengthPx / SCALE, roundSixteenth),
        1,
      );
      const widthIn = STANDARD_DEPTH_IN;
      const w = lengthIn * SCALE;
      const verticalOverflow = Math.abs(current.y - start.y) - h;
      const legLengthIn = Math.max(
        roundToSixteenth(verticalOverflow / SCALE, roundSixteenth),
        0,
      );
      const legDirection = current.y >= start.y ? 1 : -1;
      const legX =
        fallbackHorizontalDirection < 0 ? start.x - w : start.x + w - h;
      const legY =
        legDirection > 0 ? start.y + h : start.y - legLengthIn * SCALE;
      const tailProgressPx =
        fallbackHorizontalDirection > 0
          ? Math.max(current.x - turnX, 0)
          : Math.max(turnX - current.x, 0);
      const tailLengthIn = Math.max(
        roundToSixteenth(tailProgressPx / SCALE, roundSixteenth),
        0,
      );
      const tailW = tailLengthIn * SCALE;
      const tailX = fallbackHorizontalDirection > 0 ? turnX : turnX - tailW;
      const tailY = legDirection > 0 ? legY + legLengthIn * SCALE - h : legY;

      return {
        x: fallbackHorizontalDirection < 0 ? start.x - w : start.x,
        y: start.y,
        w,
        h,
        lengthIn,
        widthIn,
        ...(legLengthIn >= 4
          ? {
              leg: {
                x: legX,
                y: legY,
                w: h,
                h: legLengthIn * SCALE,
                lengthIn: STANDARD_DEPTH_IN,
                widthIn: legLengthIn,
              },
            }
          : {}),
        ...(legLengthIn >= 4 && tailLengthIn >= 4
          ? {
              tail: {
                x: tailX,
                y: tailY,
                w: tailW,
                h,
                lengthIn: tailLengthIn,
                widthIn: STANDARD_DEPTH_IN,
              },
            }
          : {}),
      };
    },
    [roundSixteenth],
  );

  const buildPieceFormData = useCallback(
    (name: string, lengthIn: number, widthIn: number, sortOrder: number) => {
      const formData = new FormData();
      formData.set("sortOrder", String(sortOrder));
      formData.set("name", name);
      formData.set("lengthIn", String(lengthIn));
      formData.set("widthIn", String(widthIn));
      formData.set("quantity", "1");
      return formData;
    },
    [],
  );

  const selectPiece = useCallback((piece: DrawingPiece) => {
    setSelectedPieceId(piece.id);
    setSelectedSinkId(null);
    setEditDraft({
      pieceId: piece.id,
      name: piece.name ?? "",
      lengthIn: String(piece.lengthIn),
      widthIn: String(piece.widthIn),
    });
    setTool("select");
    setContextMenu(null);
  }, []);

  const openEdgeEditor = useCallback(
    (
      piece: DrawingPiece,
      edge: EdgeKey,
      options?: {
        value?: number;
        segmentIndex?: number;
        shapeEdge?: ShapeEdge;
      },
    ) => {
      const renderedPiece = getRenderedPiece(piece);
      setSelectedPieceId(piece.id);
      setContextMenu(null);
      setCornerEditor(null);
      setTool("select");
      const nextEditor: EdgeLengthEditorState = {
        pieceId: piece.id,
        edge,
        value: String(options?.value ?? edgeValue(renderedPiece, edge)),
      };
      if (options?.segmentIndex !== undefined) {
        nextEditor.segmentIndex = options.segmentIndex;
      }
      if (options?.shapeEdge !== undefined) {
        nextEditor.shapeEdge = options.shapeEdge;
      }
      setEdgeEditor({
        ...nextEditor,
      });
    },
    [getRenderedPiece],
  );

  const openCornerEditor = useCallback((pieceId: string, corner: CornerKey) => {
    const existing = layoutRef.current.corners.find(
      (item) => item.pieceId === pieceId && item.corner === corner,
    );
    setSelectedPieceId(pieceId);
    setContextMenu(null);
    setEdgeEditor(null);
    setEdgeTreatmentEditor(null);
    setTool("select");
    setCornerEditor({
      pieceId,
      corner,
      treatment: existing?.treatment ?? "none",
      value:
        existing?.valueIn !== null && existing?.valueIn !== undefined
          ? String(existing.valueIn)
          : "",
    });
  }, []);

  const openEdgeTreatmentEditor = useCallback(
    (pieceId: string, edge: EdgeKey) => {
      const existing = layoutRef.current.edges.find(
        (item) => item.pieceId === pieceId && item.edge === edge,
      );
      setSelectedPieceId(pieceId);
      setContextMenu(null);
      setEdgeEditor(null);
      setCornerEditor(null);
      setTool("select");
      setEdgeTreatmentEditor({
        pieceId,
        edge,
        treatment: existing?.treatment ?? "finished",
        splashHeightIn:
          existing?.splashHeightIn !== null &&
          existing?.splashHeightIn !== undefined
            ? String(existing.splashHeightIn)
            : "",
        label: existing?.label ?? "",
      });
    },
    [],
  );

  const placeSinkOnPiece = useCallback(
    (pieceId: string, sinkId: string) => {
      const piece = pieces.find((item) => item.id === pieceId);
      const sink = sinks.find((item) => item.id === sinkId);
      const pieceLayout = layoutRef.current.pieces.find(
        (item) => item.pieceId === pieceId,
      );
      if (!piece || !sink || !pieceLayout) return;

      const pieceWidthPx = piece.lengthIn * SCALE;
      const pieceHeightPx = piece.widthIn * SCALE;
      const sinkWidthPx = sink.cutoutLengthIn * SCALE * 0.8;
      const sinkHeightPx = sink.cutoutWidthIn * SCALE * 0.8;

      setLayout((prev) => {
        const existing = prev.sinks.filter((item) => item.sinkId !== sinkId);
        return {
          ...prev,
          sinks: [
            ...existing,
            {
              sinkId,
              pieceId,
              x: Math.max((pieceWidthPx - sinkWidthPx) / 2, 8),
              y: Math.max((pieceHeightPx - sinkHeightPx) / 2, 8),
              rotation: 0,
            },
          ],
        };
      });
      setSelectedPieceId(pieceId);
      setSelectedSinkId(sinkId);
      setSinkPaletteId(null);
      setSinkContextMenu(null);
      markDirty();
    },
    [markDirty, pieces, sinks],
  );

  const removeSinkFromCounter = useCallback(
    (sinkId: string) => {
      setLayout((prev) => ({
        ...prev,
        sinks: prev.sinks.map((sink) =>
          sink.sinkId === sinkId
            ? { ...sink, pieceId: null, x: 0, y: 0 }
            : sink,
        ),
      }));
      setSelectedSinkId(null);
      setSinkContextMenu(null);
      markDirty();
    },
    [markDirty],
  );

  const deleteSinkFromCanvas = useCallback(
    (sinkId: string) => {
      startTransition(async () => {
        try {
          await deleteSinkCutoutAction(customerId, quoteId, areaId, sinkId);
          setLayout((prev) => ({
            ...prev,
            sinks: prev.sinks.filter((sink) => sink.sinkId !== sinkId),
          }));
          setSelectedSinkId(null);
          setSinkContextMenu(null);
          router.refresh();
        } catch (err) {
          setCanvasError(
            err instanceof Error ? err.message : "Failed to delete sink. Please try again.",
          );
        }
      });
    },
    [areaId, customerId, quoteId, router],
  );

  const handleSinkDragEnd = useCallback(
    (sinkId: string, x: number, y: number) => {
      setLayout((prev) => ({
        ...prev,
        sinks: prev.sinks.map((sink) =>
          sink.sinkId === sinkId ? { ...sink, x, y } : sink,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  const createSinkFromCanvas = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        try {
          await createSinkCutoutAction(customerId, quoteId, areaId, formData);
          setSinkCreateOpen(false);
          router.refresh();
        } catch (err) {
          setCanvasError(
            err instanceof Error ? err.message : "Failed to create sink. Please try again.",
          );
        }
      });
    },
    [areaId, customerId, quoteId, router],
  );

  const persistDrawing = useCallback(
    async (mode: "continue" | "save") => {
      setSaving(true);
      const result = await saveDrawingAction(
        customerId,
        quoteId,
        areaId,
        layoutRef.current,
        saveNotes.trim() || null,
      );
      setSaving(false);
      if (!result.ok) {
        setCanvasError(result.error);
        return;
      }
      setSaveModalOpen(false);
      setSaveNotes("");
      if (mode === "save") {
        resetTransientState();
      }
      router.refresh();
    },
    [areaId, customerId, quoteId, resetTransientState, router, saveNotes],
  );

  const addCounterPiece = useCallback(
    (preview: DrawPreview) => {
      startTransition(async () => {
        const nextPieceIndex = Math.max(
          pieces.length,
          layoutRef.current.pieces.length,
        );
        const createResult = await createCounterPieceForCanvasAction(
          customerId,
          quoteId,
          areaId,
          buildPieceFormData(
            `Counter ${nextPieceIndex + 1}`,
            preview.lengthIn,
            preview.widthIn,
            nextPieceIndex,
          ),
        );

        if (!createResult.ok) {
          setCanvasError(createResult.error);
          return;
        }
        const first = createResult.data;
        if (!isCreatedCounterPiece(first)) {
          return;
        }

        const createdLayouts: PieceLayout[] = [
          {
            pieceId: first.id,
            x: preview.x,
            y: preview.y,
            rotation: 0,
            ...(preview.segments && preview.segments.length > 1
              ? {
                  shape: {
                    type: "chain" as const,
                    segments: preview.segments.map((segment) => ({
                      ...segment,
                      x: segment.x - preview.x,
                      y: segment.y - preview.y,
                    })),
                  },
                }
              : preview.leg && preview.tail
                ? {
                    shape: {
                      type: "z" as const,
                      legX: preview.leg.x - preview.x,
                      legY: preview.leg.y - preview.y,
                      legWidthIn: preview.leg.lengthIn,
                      legLengthIn: preview.leg.widthIn,
                      tailX: preview.tail.x - preview.x,
                      tailY: preview.tail.y - preview.y,
                      tailLengthIn: preview.tail.lengthIn,
                      tailWidthIn: preview.tail.widthIn,
                    },
                  }
                : preview.leg
                  ? {
                      shape: {
                        type: "l" as const,
                        legX: preview.leg.x - preview.x,
                        legY: preview.leg.y - preview.y,
                        legWidthIn: preview.leg.lengthIn,
                        legLengthIn: preview.leg.widthIn,
                      },
                    }
                  : {}),
          },
        ];

        const snapshot = layoutRef.current;
        const nextLayout = {
          ...snapshot,
          pieces: [...snapshot.pieces, ...createdLayouts],
        };
        setLayout(nextLayout);
        const saveResult = await saveDrawingAction(customerId, quoteId, areaId, nextLayout, null);
        if (!saveResult.ok) {
          setLayout(snapshot);
          setCanvasError(saveResult.error);
          return;
        }
        setIsDirty(false);
        router.refresh();
      });
    },
    [areaId, buildPieceFormData, customerId, pieces.length, quoteId, router],
  );

  const handleDragEnd = useCallback(
    (pieceId: string, x: number, y: number) => {
      setLayout((prev) => ({
        ...prev,
        pieces: prev.pieces.map((p) =>
          p.pieceId === pieceId ? { ...p, x, y } : p,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  const handleGroupDragEnd = useCallback(
    (
      groupId: string,
      originX: number,
      originY: number,
      x: number,
      y: number,
    ) => {
      const dx = x - originX;
      const dy = y - originY;
      setLayout((prev) => ({
        ...prev,
        pieces: prev.pieces.map((piece) =>
          piece.groupId === groupId
            ? { ...piece, x: piece.x + dx, y: piece.y + dy }
            : piece,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  const savePieceEdit = useCallback(() => {
    if (!editDraft) return;
    const formData = new FormData();
    formData.set("name", editDraft.name);
    formData.set("lengthIn", editDraft.lengthIn);
    formData.set("widthIn", editDraft.widthIn);
    formData.set("quantity", "1");
    formData.set(
      "sortOrder",
      String(
        Math.max(
          pieces.findIndex((piece) => piece.id === editDraft.pieceId),
          0,
        ),
      ),
    );

    startTransition(async () => {
      try {
        await updateCounterPieceAction(
          customerId,
          quoteId,
          areaId,
          editDraft.pieceId,
          formData,
        );
        markDirty();
        router.refresh();
      } catch (err) {
        setCanvasError(
          err instanceof Error ? err.message : "Failed to update piece. Please try again.",
        );
      }
    });
  }, [areaId, customerId, editDraft, markDirty, pieces, quoteId, router]);

  const saveAreaDetails = useCallback(() => {
    if (!areaDraft.name.trim()) return;

    const formData = new FormData();
    formData.set("name", areaDraft.name.trim());
    formData.set("sortOrder", areaDraft.sortOrder.trim() || "0");
    if (areaDraft.material.trim())
      formData.set("material", areaDraft.material.trim());
    if (areaDraft.color.trim()) formData.set("color", areaDraft.color.trim());
    if (areaDraft.edgeProfile.trim())
      formData.set("edgeProfile", areaDraft.edgeProfile.trim());
    if (areaDraft.notes.trim()) formData.set("notes", areaDraft.notes.trim());

    setAreaSaving(true);
    startTransition(async () => {
      const result = await updateAreaAction(customerId, quoteId, areaId, formData);
      setAreaSaving(false);
      if (!result.ok) {
        setCanvasError(result.error);
        return;
      }
      router.refresh();
    });
  }, [areaDraft, areaId, customerId, quoteId, router, startTransition]);

  const savePieceDimensions = useCallback(
    (piece: DrawingPiece, lengthIn: number, widthIn: number) => {
      const formData = new FormData();
      formData.set("name", piece.name ?? "");
      formData.set("lengthIn", String(lengthIn));
      formData.set("widthIn", String(widthIn));
      formData.set("quantity", "1");
      formData.set(
        "sortOrder",
        String(
          Math.max(
            pieces.findIndex((candidate) => candidate.id === piece.id),
            0,
          ),
        ),
      );

      startTransition(async () => {
        try {
          await updateCounterPieceAction(
            customerId,
            quoteId,
            areaId,
            piece.id,
            formData,
          );
          markDirty();
          router.refresh();
        } catch (err) {
          setCanvasError(
            err instanceof Error ? err.message : "Failed to update piece dimensions. Please try again.",
          );
        }
      });
    },
    [areaId, customerId, markDirty, pieces, quoteId, router],
  );

  const persistChainSegmentsUpdate = useCallback(
    (
      piece: DrawingPiece,
      nextSegments: ChainShapeSegment[],
      referenceLines: ReferenceLineLayout[] = [],
    ) => {
      const currentLayout = layoutRef.current;
      const minX = Math.min(...nextSegments.map((segment) => segment.x));
      const maxX = Math.max(
        ...nextSegments.map((segment) => segment.x + segment.w),
      );
      const minY = Math.min(...nextSegments.map((segment) => segment.y));
      const maxY = Math.max(
        ...nextSegments.map((segment) => segment.y + segment.h),
      );
      const lengthIn = roundToSixteenth((maxX - minX) / SCALE, roundSixteenth);
      const widthIn = roundToSixteenth((maxY - minY) / SCALE, roundSixteenth);
      const nextLayout: CanvasLayout = {
        ...currentLayout,
        pieces: currentLayout.pieces.map((item) =>
          item.pieceId === piece.id
            ? {
                ...item,
                shape: {
                  type: "chain",
                  segments: nextSegments,
                },
              }
            : item,
        ),
        referenceLines: [...currentLayout.referenceLines, ...referenceLines],
      };
      const formData = new FormData();
      formData.set("name", piece.name ?? "");
      formData.set("lengthIn", String(lengthIn));
      formData.set("widthIn", String(widthIn));
      formData.set("quantity", "1");
      formData.set(
        "sortOrder",
        String(
          Math.max(
            pieces.findIndex((candidate) => candidate.id === piece.id),
            0,
          ),
        ),
      );

      const snapshot = layoutRef.current;
      setLayout(nextLayout);
      setPieceOverrides((prev) => ({
        ...prev,
        [piece.id]: { lengthIn, widthIn },
      }));
      markDirty();

      startTransition(async () => {
        const saveResult = await saveDrawingAction(customerId, quoteId, areaId, nextLayout, null);
        if (!saveResult.ok) {
          setLayout(snapshot);
          setCanvasError(saveResult.error);
          return;
        }
        try {
          await updateCounterPieceAction(
            customerId,
            quoteId,
            areaId,
            piece.id,
            formData,
          );
          router.refresh();
        } catch (err) {
          setLayout(snapshot);
          setCanvasError(
            err instanceof Error ? err.message : "Failed to save segment changes. Please try again.",
          );
        }
      });
    },
    [areaId, customerId, markDirty, pieces, quoteId, roundSixteenth, router],
  );

  const createOffsetChainSegment = useCallback(
    (
      pieceId: string,
      edge: ShapeEdge,
      segmentIndex: number,
      deltaPx: number,
    ) => {
      const currentLayout = layoutRef.current;
      const pieceLayout = currentLayout.pieces.find(
        (item) => item.pieceId === pieceId,
      );
      const piece = pieces.find((item) => item.id === pieceId);
      if (!pieceLayout || !piece) return;

      const shapeSegments =
        pieceLayout.shape && isChainShape(pieceLayout.shape)
          ? pieceLayout.shape.segments
          : rectsToChainSegments(
              pieceLayout.shape && isZShape(pieceLayout.shape)
                ? zShapeGeometry(piece, pieceLayout.shape).rects
                : pieceLayout.shape && isLShape(pieceLayout.shape)
                  ? lShapeGeometry(piece, pieceLayout.shape).rects
                  : [
                      {
                        x: 0,
                        y: 0,
                        w: piece.lengthIn * SCALE,
                        h: piece.widthIn * SCALE,
                      },
                    ],
            );
      const segment = shapeSegments[segmentIndex];
      if (!segment) return;

      const offsetResult = applyOffsetToSegments({
        segments: shapeSegments,
        edge,
        deltaPx,
        scale: SCALE,
        referenceLineId: lineId(pieceId),
        pieceId,
      });
      persistChainSegmentsUpdate(
        piece,
        offsetResult.segments,
        offsetResult.referenceLines,
      );
      setSelectedPieceId(pieceId);
      setChainEdgeAction(null);
      setHoveredChainEdgeId(null);
    },
    [persistChainSegmentsUpdate, pieces],
  );

  const applyOffsetToChainEdge = useCallback(
    (direction: ContinueDirection) => {
      if (!chainEdgeAction) return;
      const numericValue = Number(offsetAmount);
      if (!Number.isFinite(numericValue) || numericValue <= 0) return;
      const deltaPx =
        numericValue *
        SCALE *
        (direction === "right" || direction === "down" ? 1 : -1);
      createOffsetChainSegment(
        chainEdgeAction.pieceId,
        chainEdgeAction.edge,
        chainEdgeAction.segmentIndex,
        deltaPx,
      );
    },
    [chainEdgeAction, createOffsetChainSegment, offsetAmount],
  );

  const connectChainEdges = useCallback(
    (targetEdge: ShapeEdge) => {
      if (!chainEdgeAction || chainEdgeAction.mode !== "connect") return;
      if (shapeEdgesEqual(chainEdgeAction.edge, targetEdge)) return;
      const currentLayout = layoutRef.current;
      const pieceLayout = currentLayout.pieces.find(
        (item) => item.pieceId === chainEdgeAction.pieceId,
      );
      const piece = pieces.find((item) => item.id === chainEdgeAction.pieceId);
      if (!pieceLayout || !piece) {
        return;
      }

      const connection = connectEdgesToRectangle({
        firstEdge: chainEdgeAction.edge,
        secondEdge: targetEdge,
        scale: SCALE,
      });
      if (!connection) return;

      const nextLayout: CanvasLayout = {
        ...currentLayout,
        pieces: currentLayout.pieces.map((item) =>
          item.pieceId === chainEdgeAction.pieceId
            ? {
                ...item,
                shape: {
                  type: "chain",
                  segments: [connection.segment],
                },
              }
            : item,
        ),
        deletedLines: currentLayout.deletedLines.filter(
          (line) => line.pieceId !== chainEdgeAction.pieceId,
        ),
        referenceLines: currentLayout.referenceLines.filter(
          (line) => line.pieceId !== chainEdgeAction.pieceId,
        ),
      };
      const nextLengthIn = connection.lengthIn;
      const nextWidthIn = connection.widthIn;
      const formData = new FormData();
      formData.set("name", piece.name ?? "");
      formData.set("lengthIn", String(nextLengthIn));
      formData.set("widthIn", String(nextWidthIn));
      formData.set("quantity", "1");
      formData.set(
        "sortOrder",
        String(
          Math.max(
            pieces.findIndex((candidate) => candidate.id === piece.id),
            0,
          ),
        ),
      );

      const snapshot = currentLayout;
      setLayout(nextLayout);
      setPieceOverrides((prev) => ({
        ...prev,
        [piece.id]: { lengthIn: nextLengthIn, widthIn: nextWidthIn },
      }));
      setSelectedPieceId(chainEdgeAction.pieceId);
      setChainEdgeAction(null);
      setHoveredChainEdgeId(null);
      markDirty();

      startTransition(async () => {
        const saveResult = await saveDrawingAction(customerId, quoteId, areaId, nextLayout, null);
        if (!saveResult.ok) {
          setLayout(snapshot);
          setCanvasError(saveResult.error);
          return;
        }
        try {
          await updateCounterPieceAction(
            customerId,
            quoteId,
            areaId,
            piece.id,
            formData,
          );
          setIsDirty(false);
          router.refresh();
        } catch (err) {
          setLayout(snapshot);
          setCanvasError(
            err instanceof Error ? err.message : "Failed to save connection. Please try again.",
          );
        }
      });
      return;
    },
    [
      areaId,
      chainEdgeAction,
      customerId,
      markDirty,
      pieces,
      quoteId,
      roundSixteenth,
      router,
    ],
  );

  const applyChainEdgeClickDirection = useCallback(
    (pointer: { x: number; y: number }) => {
      if (!chainEdgeAction) return;
      const currentLayout = layoutRef.current;
      const pieceLayout = currentLayout.pieces.find(
        (item) => item.pieceId === chainEdgeAction.pieceId,
      );
      const piece = pieces.find((item) => item.id === chainEdgeAction.pieceId);
      if (!pieceLayout || !piece) return;

      const rects =
        pieceLayout.shape && isChainShape(pieceLayout.shape)
          ? chainShapeGeometry(pieceLayout.shape).rects
          : pieceLayout.shape && isZShape(pieceLayout.shape)
            ? zShapeGeometry(piece, pieceLayout.shape).rects
            : pieceLayout.shape && isLShape(pieceLayout.shape)
              ? lShapeGeometry(piece, pieceLayout.shape).rects
              : [
                  {
                    x: 0,
                    y: 0,
                    w: piece.lengthIn * SCALE,
                    h: piece.widthIn * SCALE,
                  },
                ];
      const localPointer = canvasPointToPiecePoint(pieceLayout, pointer);
      if (
        tool !== "offset" &&
        isPointInsideRects(rects, localPointer.x, localPointer.y)
      ) {
        return;
      }

      const edge = chainEdgeAction.edge;
      const direction = valuesNear(edge.from[1], edge.to[1])
        ? localPointer.y < edge.from[1]
          ? ("up" as const)
          : ("down" as const)
        : localPointer.x < edge.from[0]
          ? ("left" as const)
          : ("right" as const);

      if (tool === "offset") {
        applyOffsetToChainEdge(direction);
        return;
      }

      if (tool === "connect") {
        return;
      }
    },
    [applyOffsetToChainEdge, chainEdgeAction, pieces, tool],
  );

  const saveEdgeLength = useCallback(
    (mode: "stay" | "next") => {
      if (!edgeEditor) return;
      const basePiece = pieces.find((piece) => piece.id === edgeEditor.pieceId);
      if (!basePiece) return;

      const renderedPiece = getRenderedPiece(basePiece);
      const numericValue = Number(edgeEditor.value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) return;

      if (
        edgeEditor.segmentIndex !== undefined &&
        edgeEditor.shapeEdge !== undefined
      ) {
        const currentLayout = layoutRef.current;
        const pieceLayout = currentLayout.pieces.find(
          (item) => item.pieceId === basePiece.id,
        );

        const editableSegments =
          pieceLayout?.shape && isChainShape(pieceLayout.shape)
            ? pieceLayout.shape.segments
            : pieceLayout?.shape && isZShape(pieceLayout.shape)
              ? rectsToChainSegments(
                  zShapeGeometry(basePiece, pieceLayout.shape).rects,
                )
              : pieceLayout?.shape && isLShape(pieceLayout.shape)
                ? rectsToChainSegments(
                    lShapeGeometry(basePiece, pieceLayout.shape).rects,
                  )
                : null;

        if (editableSegments) {
          const editedSegment = editableSegments[edgeEditor.segmentIndex];
          if (!editedSegment) return;

          const nextSegments = resizeChainSegments(
            editableSegments,
            edgeEditor.segmentIndex,
            numericValue,
            edgeEditor.shapeEdge,
          );
          const minX = Math.min(...nextSegments.map((segment) => segment.x));
          const maxX = Math.max(
            ...nextSegments.map((segment) => segment.x + segment.w),
          );
          const minY = Math.min(...nextSegments.map((segment) => segment.y));
          const maxY = Math.max(
            ...nextSegments.map((segment) => segment.y + segment.h),
          );
          const newLengthIn = roundToSixteenth(
            (maxX - minX) / SCALE,
            roundSixteenth,
          );
          const newWidthIn = roundToSixteenth(
            (maxY - minY) / SCALE,
            roundSixteenth,
          );
          const formData = new FormData();
          formData.set("name", basePiece.name ?? "");
          formData.set("lengthIn", String(newLengthIn));
          formData.set("widthIn", String(newWidthIn));
          formData.set("quantity", "1");
          formData.set(
            "sortOrder",
            String(
              Math.max(
                pieces.findIndex((candidate) => candidate.id === basePiece.id),
                0,
              ),
            ),
          );
          const nextLayout: CanvasLayout = {
            ...currentLayout,
            pieces: currentLayout.pieces.map((item) =>
              item.pieceId === basePiece.id
                ? {
                    ...item,
                    shape: {
                      type: "chain",
                      segments: nextSegments,
                    },
                  }
                : item,
            ),
          };

          const snapshot = currentLayout;
          setLayout(nextLayout);
          markDirty();

          startTransition(async () => {
            const saveResult = await saveDrawingAction(
              customerId,
              quoteId,
              areaId,
              nextLayout,
              null,
            );
            if (!saveResult.ok) {
              setLayout(snapshot);
              setCanvasError(saveResult.error);
              return;
            }
            try {
              await updateCounterPieceAction(
                customerId,
                quoteId,
                areaId,
                basePiece.id,
                formData,
              );
              setEdgeEditor(null);
              setIsDirty(false);
              router.refresh();
            } catch (err) {
              setLayout(snapshot);
              setCanvasError(
                err instanceof Error ? err.message : "Failed to save edge length. Please try again.",
              );
            }
          });
          return;
        }
      }

      const lengthIn =
        edgeEditor.edge === "top" || edgeEditor.edge === "bottom"
          ? numericValue
          : renderedPiece.lengthIn;
      const widthIn =
        edgeEditor.edge === "left" || edgeEditor.edge === "right"
          ? numericValue
          : renderedPiece.widthIn;
      const currentLayout = layoutRef.current;
      const pieceLayout = currentLayout.pieces.find(
        (item) => item.pieceId === basePiece.id,
      );
      const deltaLengthPx = (lengthIn - basePiece.lengthIn) * SCALE;
      const deltaWidthPx = (widthIn - basePiece.widthIn) * SCALE;
      let nextLayout: CanvasLayout | null = null;

      if (isLShape(pieceLayout?.shape)) {
        const shape = pieceLayout.shape;
        const oldMainW = basePiece.lengthIn * SCALE;
        const oldMainH = basePiece.widthIn * SCALE;
        const newLegX =
          deltaLengthPx !== 0 &&
          shape.legX + shape.legWidthIn * SCALE > oldMainW / 2
            ? shape.legX + deltaLengthPx
            : shape.legX;
        const newLegY =
          deltaWidthPx !== 0 &&
          shape.legY + shape.legLengthIn * SCALE > oldMainH / 2
            ? shape.legY + deltaWidthPx
            : shape.legY;
        const updatedShape: LShapeLayout = {
          ...shape,
          legX: newLegX,
          legY: newLegY,
        };
        nextLayout = {
          ...currentLayout,
          pieces: currentLayout.pieces.map((item) =>
            item.pieceId === basePiece.id
              ? { ...item, shape: updatedShape }
              : item,
          ),
        };
      } else if (isZShape(pieceLayout?.shape)) {
        const shape = pieceLayout.shape;
        const oldMainW = basePiece.lengthIn * SCALE;
        const oldMainH = basePiece.widthIn * SCALE;
        const newLegX =
          deltaLengthPx !== 0 &&
          shape.legX + shape.legWidthIn * SCALE > oldMainW / 2
            ? shape.legX + deltaLengthPx
            : shape.legX;
        const newLegY =
          deltaWidthPx !== 0 &&
          shape.legY + shape.legLengthIn * SCALE > oldMainH / 2
            ? shape.legY + deltaWidthPx
            : shape.legY;
        const newTailX =
          deltaLengthPx !== 0 &&
          shape.tailX + shape.tailLengthIn * SCALE > oldMainW / 2
            ? shape.tailX + deltaLengthPx
            : shape.tailX;
        const newTailY =
          deltaWidthPx !== 0 &&
          shape.tailY + shape.tailWidthIn * SCALE > oldMainH / 2
            ? shape.tailY + deltaWidthPx
            : shape.tailY;
        const updatedShape: ZShapeLayout = {
          ...shape,
          legX: newLegX,
          legY: newLegY,
          tailX: newTailX,
          tailY: newTailY,
        };
        nextLayout = {
          ...currentLayout,
          pieces: currentLayout.pieces.map((item) =>
            item.pieceId === basePiece.id
              ? { ...item, shape: updatedShape }
              : item,
          ),
        };
      }

      if (nextLayout) {
        setLayout(nextLayout);
      }

      const formData = new FormData();
      formData.set("name", basePiece.name ?? "");
      formData.set("lengthIn", String(lengthIn));
      formData.set("widthIn", String(widthIn));
      formData.set("quantity", "1");
      formData.set(
        "sortOrder",
        String(
          Math.max(
            pieces.findIndex((candidate) => candidate.id === basePiece.id),
            0,
          ),
        ),
      );

      startTransition(async () => {
        if (nextLayout) {
          const saveResult = await saveDrawingAction(
            customerId,
            quoteId,
            areaId,
            nextLayout,
            null,
          );
          if (!saveResult.ok) {
            setLayout(currentLayout);
            setCanvasError(saveResult.error);
            return;
          }
        }
        try {
          await updateCounterPieceAction(
            customerId,
            quoteId,
            areaId,
            basePiece.id,
            formData,
          );
          setPieceOverrides((prev) => ({
            ...prev,
            [basePiece.id]: { lengthIn, widthIn },
          }));
          setEditDraft((prev) =>
            prev && prev.pieceId === basePiece.id
              ? {
                  ...prev,
                  lengthIn: String(lengthIn),
                  widthIn: String(widthIn),
                }
              : prev,
          );
          markDirty();

          if (mode === "next") {
            const next = nextEdge(edgeEditor.edge);
            const nextPiece = { ...basePiece, lengthIn, widthIn };
            setEdgeEditor({
              pieceId: basePiece.id,
              edge: next,
              value: String(edgeValue(nextPiece, next)),
            });
          } else {
            setEdgeEditor(null);
          }

          router.refresh();
        } catch (err) {
          if (nextLayout) setLayout(currentLayout);
          setCanvasError(
            err instanceof Error ? err.message : "Failed to save edge length. Please try again.",
          );
        }
      });
    },
    [
      areaId,
      customerId,
      edgeEditor,
      getRenderedPiece,
      markDirty,
      pieces,
      quoteId,
      roundSixteenth,
      router,
    ],
  );

  const extendChainFromSelectedEnd = useCallback(
    (pieceId: string, direction: ContinueDirection) => {
      const currentLayout = layoutRef.current;
      const pieceLayout = currentLayout.pieces.find(
        (item) => item.pieceId === pieceId,
      );
      if (!pieceLayout?.shape || !isChainShape(pieceLayout.shape)) return;

      const end = chainFreeEnd(pieceLayout.shape);
      if (!end) return;

      const depthPx =
        end.segment.orientation === "horizontal"
          ? end.segment.h
          : end.segment.w;
      const runPx = CONTINUE_RUN_IN * SCALE;
      const nextSegment =
        direction === "up" || direction === "down"
          ? {
              x:
                end.segment.orientation === "horizontal"
                  ? end.direction === "right"
                    ? end.x - depthPx
                    : end.x
                  : end.segment.x,
              y: direction === "up" ? end.y - runPx : end.y,
              w: depthPx,
              h: runPx,
              lengthIn: STANDARD_DEPTH_IN,
              widthIn: CONTINUE_RUN_IN,
              orientation: "vertical" as const,
            }
          : {
              x: direction === "right" ? end.x : end.x - runPx,
              y:
                end.segment.orientation === "vertical"
                  ? end.direction === "down"
                    ? end.y - depthPx
                    : end.y
                  : end.segment.y,
              w: runPx,
              h: depthPx,
              lengthIn: CONTINUE_RUN_IN,
              widthIn: STANDARD_DEPTH_IN,
              orientation: "horizontal" as const,
            };
      const nextSegments = [...pieceLayout.shape.segments, nextSegment];
      const minX = Math.min(...nextSegments.map((segment) => segment.x));
      const maxX = Math.max(
        ...nextSegments.map((segment) => segment.x + segment.w),
      );
      const minY = Math.min(...nextSegments.map((segment) => segment.y));
      const maxY = Math.max(
        ...nextSegments.map((segment) => segment.y + segment.h),
      );
      const nextLayout: CanvasLayout = {
        ...currentLayout,
        pieces: currentLayout.pieces.map((item) =>
          item.pieceId === pieceId
            ? { ...item, shape: { type: "chain", segments: nextSegments } }
            : item,
        ),
      };
      const basePiece = pieces.find((piece) => piece.id === pieceId);

      if (basePiece) {
        const nextLengthIn = roundToSixteenth(
          (maxX - minX) / SCALE,
          roundSixteenth,
        );
        const nextWidthIn = roundToSixteenth(
          (maxY - minY) / SCALE,
          roundSixteenth,
        );
        const formData = new FormData();
        formData.set("name", basePiece.name ?? "");
        formData.set("lengthIn", String(nextLengthIn));
        formData.set("widthIn", String(nextWidthIn));
        formData.set("quantity", "1");
        formData.set(
          "sortOrder",
          String(
            Math.max(
              pieces.findIndex((candidate) => candidate.id === basePiece.id),
              0,
            ),
          ),
        );

        const snapshot = currentLayout;
        setLayout(nextLayout);
        setSelectedPieceId(pieceId);
        markDirty();
        startTransition(async () => {
          const saveResult = await saveDrawingAction(
            customerId,
            quoteId,
            areaId,
            nextLayout,
            null,
          );
          if (!saveResult.ok) {
            setLayout(snapshot);
            setCanvasError(saveResult.error);
            return;
          }
          try {
            await updateCounterPieceAction(
              customerId,
              quoteId,
              areaId,
              basePiece.id,
              formData,
            );
            setIsDirty(false);
            router.refresh();
          } catch (err) {
            setLayout(snapshot);
            setCanvasError(
              err instanceof Error ? err.message : "Failed to extend counter. Please try again.",
            );
          }
        });
      }
    },
    [areaId, customerId, markDirty, pieces, quoteId, roundSixteenth, router],
  );

  const saveCornerTreatment = useCallback(
    (mode: "stay" | "next") => {
      if (!cornerEditor) return;
      const parsedValue = cornerEditor.value.trim()
        ? Number(cornerEditor.value)
        : null;
      const valueIn =
        Number.isFinite(parsedValue) && parsedValue !== null && parsedValue > 0
          ? parsedValue
          : null;

      setLayout((prev) => {
        const withoutCurrent = prev.corners.filter(
          (item) =>
            item.pieceId !== cornerEditor.pieceId ||
            item.corner !== cornerEditor.corner,
        );

        if (cornerEditor.treatment === "none") {
          return { ...prev, corners: withoutCurrent };
        }

        return {
          ...prev,
          corners: [
            ...withoutCurrent,
            {
              pieceId: cornerEditor.pieceId,
              corner: cornerEditor.corner,
              treatment: cornerEditor.treatment,
              valueIn,
            },
          ],
        };
      });
      markDirty();

      if (mode === "next") {
        const next = nextCorner(cornerEditor.corner);
        const nextSaved = layoutRef.current.corners.find(
          (item) =>
            item.pieceId === cornerEditor.pieceId && item.corner === next,
        );
        setCornerEditor({
          pieceId: cornerEditor.pieceId,
          corner: next,
          treatment: nextSaved?.treatment ?? "none",
          value:
            nextSaved?.valueIn !== null && nextSaved?.valueIn !== undefined
              ? String(nextSaved.valueIn)
              : "",
        });
        return;
      }

      setCornerEditor(null);
    },
    [cornerEditor, markDirty],
  );

  const saveEdgeTreatment = useCallback(
    (mode: "stay" | "next") => {
      if (!edgeTreatmentEditor) return;

      const splashHeightIn = edgeTreatmentEditor.splashHeightIn.trim()
        ? Number(edgeTreatmentEditor.splashHeightIn)
        : null;
      const normalizedSplashHeight =
        Number.isFinite(splashHeightIn) &&
        splashHeightIn !== null &&
        splashHeightIn > 0
          ? splashHeightIn
          : null;

      const normalizedLabel = edgeTreatmentEditor.label.trim() || null;

      setLayout((prev) => {
        const withoutCurrent = prev.edges.filter(
          (item) =>
            item.pieceId !== edgeTreatmentEditor.pieceId ||
            item.edge !== edgeTreatmentEditor.edge,
        );

        return {
          ...prev,
          edges: [
            ...withoutCurrent,
            {
              pieceId: edgeTreatmentEditor.pieceId,
              edge: edgeTreatmentEditor.edge,
              treatment: edgeTreatmentEditor.treatment,
              splashHeightIn:
                edgeTreatmentEditor.treatment === "splash"
                  ? normalizedSplashHeight
                  : null,
              label:
                edgeTreatmentEditor.treatment === "additionalFinished" ||
                edgeTreatmentEditor.treatment === "splash"
                  ? normalizedLabel
                  : null,
            },
          ],
        };
      });
      markDirty();

      if (mode === "next") {
        const next = nextEdge(edgeTreatmentEditor.edge);
        const nextSaved = layoutRef.current.edges.find(
          (item) =>
            item.pieceId === edgeTreatmentEditor.pieceId && item.edge === next,
        );
        setEdgeTreatmentEditor({
          pieceId: edgeTreatmentEditor.pieceId,
          edge: next,
          treatment: nextSaved?.treatment ?? "finished",
          splashHeightIn:
            nextSaved?.splashHeightIn !== null &&
            nextSaved?.splashHeightIn !== undefined
              ? String(nextSaved.splashHeightIn)
              : "",
          label: nextSaved?.label ?? "",
        });
        return;
      }

      setEdgeTreatmentEditor(null);
    },
    [edgeTreatmentEditor, markDirty],
  );

  const deletePiece = useCallback(
    (pieceId: string) => {
      startTransition(async () => {
        try {
          await deleteCounterPieceAction(customerId, quoteId, areaId, pieceId);
          setLayout((prev) => ({
            ...prev,
            pieces: prev.pieces.filter((piece) => piece.pieceId !== pieceId),
          }));
          setSelectedPieceId(null);
          setContextMenu(null);
          setEdgeEditor(null);
          setCornerEditor(null);
          setEdgeTreatmentEditor(null);
          setEditDraft(null);
          setPieceOverrides((prev) => {
            const next = { ...prev };
            delete next[pieceId];
            return next;
          });
          markDirty();
          router.refresh();
        } catch (err) {
          setCanvasError(
            err instanceof Error ? err.message : "Failed to delete piece. Please try again.",
          );
        }
      });
    },
    [areaId, customerId, markDirty, quoteId, router],
  );

  const erasePieceEdge = useCallback(
    (piece: DrawingPiece, pieceLayout: PieceLayout, edge: ShapeEdge) => {
      const nextDeletedLines = addDeletedLineOnce(
        layoutRef.current.deletedLines,
        piece.id,
        edge,
      );
      const remainingEdges = visibleBoundaryEdges({
        rects: drawingRectsForPiece(piece, pieceLayout),
        deletedLines: nextDeletedLines.filter(
          (line) => line.pieceId === piece.id,
        ),
      });

      if (remainingEdges.length === 0) {
        deletePiece(piece.id);
        return;
      }

      setLayout((prev) => ({
        ...prev,
        deletedLines: addDeletedLineOnce(prev.deletedLines, piece.id, edge),
      }));
      markDirty();
    },
    [deletePiece, markDirty],
  );

  const rotatePiece = useCallback(
    (pieceId: string, direction: "left" | "right") => {
      setLayout((prev) => ({
        ...prev,
        pieces: prev.pieces.map((piece) =>
          piece.pieceId === pieceId
            ? {
                ...piece,
                rotation: piece.rotation + (direction === "left" ? -90 : 90),
              }
            : piece,
        ),
      }));
      setContextMenu(null);
      setEdgeEditor(null);
      setCornerEditor(null);
      setEdgeTreatmentEditor(null);
      markDirty();
    },
    [markDirty],
  );

  const duplicatePiece = useCallback(
    (pieceId: string) => {
      const sourcePiece = pieces.find((piece) => piece.id === pieceId);
      const sourceLayout = layoutRef.current.pieces.find(
        (piece) => piece.pieceId === pieceId,
      );
      if (!sourcePiece || !sourceLayout) return;

      startTransition(async () => {
        try {
          const duplicated = await createCounterPieceForCanvasAction(
            customerId,
            quoteId,
            areaId,
            buildPieceFormData(
              sourcePiece.name
                ? `${sourcePiece.name} Copy`
                : `Counter ${pieces.length + 1}`,
              sourcePiece.lengthIn,
              sourcePiece.widthIn,
              pieces.length,
            ),
          );

          if (isCreatedCounterPiece(duplicated)) {
            setLayout((prev) => ({
              ...prev,
              pieces: [
                ...prev.pieces,
                {
                  pieceId: duplicated.id,
                  x: sourceLayout.x + 24,
                  y: sourceLayout.y + 24,
                  rotation: sourceLayout.rotation,
                  shape: sourceLayout.shape ?? null,
                },
              ],
            }));
            setSelectedPieceId(duplicated.id);
            markDirty();
          }

          setContextMenu(null);
          router.refresh();
        } catch (err) {
          setCanvasError(
            err instanceof Error ? err.message : "Failed to duplicate piece. Please try again.",
          );
        }
      });
    },
    [
      areaId,
      buildPieceFormData,
      customerId,
      markDirty,
      pieces,
      quoteId,
      router,
    ],
  );

  const handleStageMouseDown = useCallback(
    (e: { target: { getStage: () => unknown } }) => {
      if (!isDraft) return;
      const screenPointer = stageRef.current?.getStage().getPointerPosition();
      const pointer = getPointer();
      if (!pointer || !screenPointer) return;

      setContextMenu(null);
      setSinkContextMenu(null);

      if (tool === "pan") {
        setPanStart({ pointer: screenPointer, pan });
        return;
      }

      if (tool === "draw" && activeStep === 1) {
        setSelectedPieceId(null);
        setDrawStart(pointer);
        setDrawPath([pointer]);
        setDrawPreview(buildPreview(pointer, pointer, [pointer]));
        return;
      }

      if (tool === "pageBreak") {
        setPageBreaks((prev) => [...prev, pointer.y]);
        setTool("draw");
        return;
      }

      if (tool === "text") {
        setPendingTextAt(pointer);
        setTextDraft("");
        return;
      }

      if (e.target === stageRef.current?.getStage()) {
        if ((tool === "offset" || tool === "connect") && chainEdgeAction) {
          applyChainEdgeClickDirection(pointer);
          return;
        }
        setSelectedPieceId(null);
        setSelectedSinkId(null);
      }
    },
    [
      activeStep,
      applyChainEdgeClickDirection,
      buildPreview,
      chainEdgeAction,
      getPointer,
      isDraft,
      pan,
      tool,
    ],
  );

  const updateDrawFromScreenPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!drawStart || tool !== "draw") return;
      const containerRect = stageContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const localX = clientX - containerRect.left;
      const localY = clientY - containerRect.top;

      const nextPan = { ...pan };
      if (localX >= canvasWidth - AUTO_PAN_MARGIN) nextPan.x -= AUTO_PAN_STEP;
      if (localX <= AUTO_PAN_MARGIN) nextPan.x += AUTO_PAN_STEP;
      if (localY >= canvasHeight - AUTO_PAN_MARGIN) nextPan.y -= AUTO_PAN_STEP;
      if (localY <= AUTO_PAN_MARGIN) nextPan.y += AUTO_PAN_STEP;

      if (nextPan.x !== pan.x || nextPan.y !== pan.y) {
        setPan(nextPan);
      }

      const pointer = {
        x: (localX - nextPan.x) / zoom,
        y: (localY - nextPan.y) / zoom,
      };

      setDrawPath((prev) => {
        const last = prev[prev.length - 1];
        const nextPath =
          !last || Math.hypot(pointer.x - last.x, pointer.y - last.y) >= 8
            ? [...prev, pointer]
            : prev;
        setDrawPreview(buildPreview(drawStart, pointer, nextPath));
        return nextPath;
      });
    },
    [buildPreview, canvasHeight, canvasWidth, drawStart, pan, tool, zoom],
  );

  const handleStageMouseMove = useCallback(() => {
    if (panStart && tool === "pan") {
      const pointer = stageRef.current?.getStage().getPointerPosition();
      if (!pointer) return;
      setPan({
        x: panStart.pan.x + pointer.x - panStart.pointer.x,
        y: panStart.pan.y + pointer.y - panStart.pointer.y,
      });
      return;
    }

    const screenPointer = stageRef.current?.getStage().getPointerPosition();
    if (!screenPointer) return;
    updateDrawFromScreenPoint(
      screenPointer.x +
        (stageContainerRef.current?.getBoundingClientRect().left ?? 0),
      screenPointer.y +
        (stageContainerRef.current?.getBoundingClientRect().top ?? 0),
    );
  }, [panStart, tool, updateDrawFromScreenPoint]);

  const resetDrawInteraction = useCallback(() => {
    setDrawStart(null);
    setDrawPath([]);
    setDrawPreview(null);
  }, []);

  const handleStageMouseUp = useCallback(() => {
    if (panStart) {
      setPanStart(null);
      return;
    }

    if (!drawStart || !drawPreview) {
      resetDrawInteraction();
      return;
    }
    const shouldCreate = drawPreview.lengthIn >= 4;
    if (shouldCreate) addCounterPiece(drawPreview);
    resetDrawInteraction();
  }, [addCounterPiece, drawPreview, drawStart, panStart, resetDrawInteraction]);

  const handleStageMouseLeave = useCallback(() => {
    if (panStart) {
      setPanStart(null);
      return;
    }
  }, [panStart]);

  useEffect(() => {
    if (!drawStart || tool !== "draw") return;

    const handleWindowMouseMove = (event: MouseEvent) => {
      updateDrawFromScreenPoint(event.clientX, event.clientY);
    };

    const handleWindowMouseUp = () => {
      if (panStart) {
        setPanStart(null);
        return;
      }
      if (!drawStart || !drawPreview) {
        resetDrawInteraction();
        return;
      }
      const shouldCreate = drawPreview.lengthIn >= 4;
      if (shouldCreate) addCounterPiece(drawPreview);
      resetDrawInteraction();
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [
    addCounterPiece,
    drawPreview,
    drawStart,
    panStart,
    resetDrawInteraction,
    tool,
    updateDrawFromScreenPoint,
  ]);

  const toolbarItems: Array<{
    label: string;
    icon: string;
    action: () => void;
    active?: boolean;
    draftOnly?: boolean;
    disabled?: boolean;
    tone?: "default" | "orange" | "blue" | "purple" | "red" | "muted";
    dividerBefore?: boolean;
  }> = [
    {
      label: "Pen",
      icon: "/",
      action: () => setTool("draw"),
      active: tool === "draw",
      draftOnly: true,
    },
    {
      label: "Cursor",
      icon: "·",
      action: () => setTool("select"),
      active: tool === "select",
    },
    {
      label: "Erase",
      icon: "•",
      action: () =>
        setTool((prev) => (prev === "deleteLine" ? "draw" : "deleteLine")),
      active: tool === "deleteLine",
      draftOnly: true,
    },
    {
      label: "Distance",
      icon: "⌞",
      action: () => setTool("select"),
      active: tool === "select" && activeStep === 1,
      draftOnly: true,
      tone: "orange",
    },
    {
      label: "Fill It",
      icon: "⌜",
      action: () =>
        setTool((prev) => (prev === "connect" ? "draw" : "connect")),
      active: tool === "connect",
      draftOnly: true,
      tone: "blue",
    },
    {
      label: "Offset",
      icon: "=",
      action: () => setTool((prev) => (prev === "offset" ? "draw" : "offset")),
      active: tool === "offset",
      draftOnly: true,
    },
    {
      label: "Rotate",
      icon: "♂",
      action: () => {
        if (selectedPieceId) rotatePiece(selectedPieceId, "right");
      },
      draftOnly: true,
      disabled: !selectedPieceId,
      tone: "blue",
    },
    {
      label: "Extend",
      icon: "⊥",
      action: () => setTool("draw"),
      active: tool === "draw" && selectedPieceId !== null,
      draftOnly: true,
      disabled: !selectedPieceId,
      tone: "purple",
    },
    {
      label: "Segment",
      icon: "/",
      action: () =>
        setTool((prev) => (prev === "connect" ? "draw" : "connect")),
      active: tool === "connect",
      draftOnly: true,
    },
    {
      label: "Dimensions",
      icon: "↔",
      action: () => setRoundSixteenth((prev) => !prev),
      active: roundSixteenth,
      tone: "orange",
    },
    {
      label: "Color",
      icon: "•",
      action: () => setActiveStep(5),
      active: activeStep === 5,
      draftOnly: true,
      tone: "red",
    },
    {
      label: "Undo",
      icon: "·",
      action: () => undefined,
      disabled: true,
      tone: "muted",
      dividerBefore: true,
    },
    {
      label: "Redo",
      icon: "·",
      action: () => undefined,
      disabled: true,
      tone: "muted",
    },
  ];
  const activeStepTitle =
    steps.find((step) => step.id === activeStep)?.title ?? "Drawing";
  const selectedPiece = selectedPieceId
    ? (pieceMap.get(selectedPieceId) ?? null)
    : null;
  const edgeLengthPreview = useMemo<EdgeLengthPreviewModel | null>(() => {
    if (!edgeEditor) return null;
    const basePiece = pieceMap.get(edgeEditor.pieceId);
    const pieceLayout = layout.pieces.find(
      (item) => item.pieceId === edgeEditor.pieceId,
    );
    if (!basePiece) return null;

    const renderedPiece = getRenderedPiece(basePiece);
    const rects = pieceLayout?.shape
      ? isChainShape(pieceLayout.shape)
        ? chainShapeGeometry(pieceLayout.shape).rects
        : isZShape(pieceLayout.shape)
          ? zShapeGeometry(renderedPiece, pieceLayout.shape).rects
          : isLShape(pieceLayout.shape)
            ? lShapeGeometry(renderedPiece, pieceLayout.shape).rects
            : [
                {
                  x: 0,
                  y: 0,
                  w: renderedPiece.lengthIn * SCALE,
                  h: renderedPiece.widthIn * SCALE,
                },
              ]
      : [
          {
            x: 0,
            y: 0,
            w: renderedPiece.lengthIn * SCALE,
            h: renderedPiece.widthIn * SCALE,
          },
        ];
    const bounds = shapeBounds(rects);
    const fallbackEdges: Record<EdgeKey, ShapeEdge> = {
      top: { from: [bounds.minX, bounds.minY], to: [bounds.maxX, bounds.minY] },
      right: {
        from: [bounds.maxX, bounds.minY],
        to: [bounds.maxX, bounds.maxY],
      },
      bottom: {
        from: [bounds.minX, bounds.maxY],
        to: [bounds.maxX, bounds.maxY],
      },
      left: {
        from: [bounds.minX, bounds.minY],
        to: [bounds.minX, bounds.maxY],
      },
    };

    return {
      rects,
      edge: edgeEditor.shapeEdge ?? fallbackEdges[edgeEditor.edge],
    };
  }, [edgeEditor, getRenderedPiece, layout.pieces, pieceMap]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "n" && isDraft) {
        event.preventDefault();
        setTool((prev) => (prev === "text" ? "draw" : "text"));
      } else if (key === "y" && isDraft) {
        event.preventDefault();
        setTool("pageBreak");
      } else if (key === "e" && isDraft) {
        event.preventDefault();
        setTool("otherCounter");
      } else if (key === "z") {
        event.preventDefault();
        setRoundSixteenth((prev) => !prev);
      } else if (key === "j") {
        event.preventDefault();
        setZoom((prev) => Math.min(prev + 0.15, 2.25));
      } else if (key === "k") {
        event.preventDefault();
        setZoom((prev) => Math.max(prev - 0.15, 0.45));
      } else if (key === "l") {
        event.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (key === "m") {
        event.preventDefault();
        setTool((prev) => (prev === "pan" ? "draw" : "pan"));
      } else if (key === "o" && isDraft) {
        event.preventDefault();
        setTool((prev) => (prev === "offset" ? "draw" : "offset"));
      } else if (key === "c" && isDraft) {
        event.preventDefault();
        setTool((prev) => (prev === "connect" ? "draw" : "connect"));
      } else if ((key === "d" || key === "delete") && isDraft) {
        event.preventDefault();
        setTool((prev) => (prev === "deleteLine" ? "draw" : "deleteLine"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDraft]);

  useEffect(() => {
    if (tool === "offset" || tool === "connect") return;
    setChainEdgeAction(null);
    setHoveredChainEdgeId(null);
  }, [tool]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className={fullscreen ? "flex min-h-0 flex-1 flex-col" : "space-y-3"}>
      <div
        className={
          fullscreen
            ? "flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7faf4]"
            : "overflow-hidden rounded-lg border bg-[#f7faf4] shadow-sm"
        }
      >
        {canvasError && (
          <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="flex-1">{canvasError}</span>
            <button
              type="button"
              className="font-medium hover:text-red-900"
              onClick={() => setCanvasError(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHelpOpen(true)}
            >
              Help
            </Button>
            <Button size="sm" variant="outline" disabled>
              Undo
            </Button>
            <Button size="sm" variant="outline" disabled>
              Redo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRevisionsOpen(true)}
            >
              Revisions
            </Button>
            <Button
              size="sm"
              onClick={() => setSaveModalOpen(true)}
              disabled={!isDraft || saving}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (isDirty) {
                  setExitConfirmOpen(true);
                  return;
                }
                resetTransientState();
              }}
            >
              Exit
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {latestRevision
              ? `Revision ${latestRevision.revisionNumber} saved ${formatDate(latestRevision.createdAt)}`
              : "No saved revisions yet"}
            {isDirty ? " • Unsaved changes" : ""}
          </div>
        </div>

        <div className="flex items-stretch bg-[#6ba464] text-white">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={`flex min-h-14 flex-1 items-center justify-center gap-3 border-r border-white/35 px-3 text-left transition ${
                activeStep === step.id ? "bg-[#2f6b2c]" : "hover:bg-[#5b9655]"
              }`}
              onClick={() => setActiveStep(step.id)}
            >
              <span className="font-serif text-3xl leading-none">
                {step.id}
              </span>
              <span className="text-sm font-semibold leading-tight">
                {step.shortTitle}
              </span>
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 bg-white">
            {activeStep >= 5 ? (
              <div className="min-h-[560px] p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-[#2f6b2c]">
                      {activeStepTitle}
                    </h4>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Moraware keeps area work and pricing inside the editor.
                      Step 5 starts the area setup, Step 6 finishes pricing.
                    </p>
                  </div>
                  <div className="rounded-md border border-[#c8dec3] bg-white px-3 py-2 text-xs text-muted-foreground">
                    Editing area:{" "}
                    <span className="font-semibold text-foreground">
                      {areaDraft.name || area.name}
                    </span>
                  </div>
                </div>

                {activeStep === 5 ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-lg border border-[#c8dec3] bg-white p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`area-name-${areaId}`}>Name *</Label>
                          <Input
                            id={`area-name-${areaId}`}
                            value={areaDraft.name}
                            onChange={(event) =>
                              setAreaDraft((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`area-sort-${areaId}`}>Sort</Label>
                          <Input
                            id={`area-sort-${areaId}`}
                            type="number"
                            value={areaDraft.sortOrder}
                            onChange={(event) =>
                              setAreaDraft((prev) => ({
                                ...prev,
                                sortOrder: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`area-material-${areaId}`}>
                            Material
                          </Label>
                          <Input
                            id={`area-material-${areaId}`}
                            value={areaDraft.material}
                            onChange={(event) =>
                              setAreaDraft((prev) => ({
                                ...prev,
                                material: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`area-color-${areaId}`}>Color</Label>
                          <Input
                            id={`area-color-${areaId}`}
                            value={areaDraft.color}
                            onChange={(event) =>
                              setAreaDraft((prev) => ({
                                ...prev,
                                color: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`area-edge-${areaId}`}>
                            Edge Profile
                          </Label>
                          <Input
                            id={`area-edge-${areaId}`}
                            value={areaDraft.edgeProfile}
                            onChange={(event) =>
                              setAreaDraft((prev) => ({
                                ...prev,
                                edgeProfile: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`area-notes-${areaId}`}>Notes</Label>
                          <Input
                            id={`area-notes-${areaId}`}
                            value={areaDraft.notes}
                            onChange={(event) =>
                              setAreaDraft((prev) => ({
                                ...prev,
                                notes: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          onClick={() => void saveAreaDetails()}
                          disabled={areaSaving || !isDraft}
                        >
                          {areaSaving ? "Saving..." : "Save Area"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setActiveStep(6)}
                          disabled={!isDraft}
                        >
                          Next: Price Details
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#c8dec3] bg-[#f3f8ef] p-4">
                      <p className="text-sm font-semibold text-[#2f6b2c]">
                        Slabs & Layout
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        This is the Moraware Step 5 home for area ordering, slab
                        planning, and alternate color options.
                      </p>
                      <div className="mt-4 rounded-md border border-dashed border-[#b9d3b3] bg-white p-3 text-sm text-muted-foreground">
                        Next slice: surface slab rows and color-option
                        reordering here, then bring the quote pricing table into
                        Step 6.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-lg border border-[#c8dec3] bg-white p-4">
                      <p className="text-sm font-semibold text-[#2f6b2c]">
                        Price Details
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Price List</dt>
                          <dd>{hasPriceList ? "Assigned" : "None"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Tax Rate</dt>
                          <dd>See quote header</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Discount</dt>
                          <dd>See quote header</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Expiration</dt>
                          <dd>See quote header</dd>
                        </div>
                      </dl>
                      <div className="mt-4">
                        <form
                          action={generatePricingAction.bind(
                            null,
                            customerId,
                            quoteId,
                            areaId,
                          )}
                        >
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!isDraft || !hasPriceList}
                          >
                            Generate Pricing
                          </Button>
                        </form>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Step 6 keeps pricing in the editor and surfaces the
                        generated lines by area.
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#c8dec3] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#2f6b2c]">
                          Generated Lines
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {pricingLines.length} line
                          {pricingLines.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-3 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Category</TableHead>
                              <TableHead>Label</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pricingLines.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-sm text-muted-foreground"
                                >
                                  No generated pricing lines yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              pricingLines.map((line) => (
                                <TableRow key={line.id}>
                                  <TableCell>
                                    {line.category.replaceAll("_", " ")}
                                  </TableCell>
                                  <TableCell>{line.label}</TableCell>
                                  <TableCell>
                                    {line.quantity.toFixed(3)}
                                  </TableCell>
                                  <TableCell>{line.unit}</TableCell>
                                  <TableCell>
                                    $
                                    {(
                                      (line.overridePriceCents ??
                                        line.lineTotalCents) / 100
                                    ).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                ref={stageContainerRef}
                className={fullscreen ? "relative h-full min-h-0" : "relative"}
              >
                <Stage
                  ref={stageRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  style={{ cursor: toolCursor(tool, isDraft) }}
                  onMouseDown={handleStageMouseDown}
                  onMouseMove={handleStageMouseMove}
                  onMouseUp={handleStageMouseUp}
                  onMouseLeave={handleStageMouseLeave}
                >
                  <Layer>
                    <Group x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}>
                      <Rect
                        x={-WORKSPACE_PADDING}
                        y={-WORKSPACE_PADDING}
                        width={canvasWidth / zoom + WORKSPACE_PADDING * 2}
                        height={canvasHeight / zoom + WORKSPACE_PADDING * 2}
                        fill="#ffffff"
                        onMouseDown={(event) => {
                          if (
                            (tool === "offset" || tool === "connect") &&
                            chainEdgeAction
                          ) {
                            event.cancelBubble = true;
                            const pointer = getPointer();
                            if (pointer) {
                              applyChainEdgeClickDirection(pointer);
                            }
                          }
                        }}
                      />

                      {pieces.length === 0 && !drawPreview ? (
                        <Text
                          x={32}
                          y={34}
                          width={420}
                          text={
                            isDraft
                              ? 'Drag with the pencil to draw the first counter piece. Depth locks to 25 1/2".'
                              : "No drawing has been created yet."
                          }
                          fontSize={14}
                          fill="#6b7280"
                        />
                      ) : null}

                      {pageBreaks.map((y, index) => (
                        <Group key={`${y}-${index}`}>
                          <Line
                            points={[20, y, canvasWidth / zoom - 40, y]}
                            stroke="#9ca3af"
                            dash={[12, 8]}
                            strokeWidth={1}
                          />
                          <Text
                            x={28}
                            y={y + 8}
                            text="Page Break"
                            fontSize={12}
                            fill="#6b7280"
                          />
                        </Group>
                      ))}

                      {layout.pieces.map((pos) => {
                        const basePiece = pieceMap.get(pos.pieceId);
                        if (!basePiece) return null;
                        if (pos.groupId) {
                          const groupItems = layout.pieces.filter(
                            (item) =>
                              item.groupId === pos.groupId &&
                              pieceMap.has(item.pieceId),
                          );
                          if (groupItems[0]?.pieceId !== pos.pieceId)
                            return null;

                          const originX = Math.min(
                            ...groupItems.map((item) => item.x),
                          );
                          const originY = Math.min(
                            ...groupItems.map((item) => item.y),
                          );
                          const isGroupSelected = groupItems.some(
                            (item) =>
                              selectedPieceId === item.pieceId ||
                              editDraft?.pieceId === item.pieceId,
                          );

                          return (
                            <Group
                              key={pos.groupId}
                              x={originX}
                              y={originY}
                              draggable={isDraft && tool !== "pan"}
                              onMouseDown={(event) => {
                                event.cancelBubble = true;
                              }}
                              onClick={(event) => {
                                event.cancelBubble = true;
                                selectPiece(basePiece);
                              }}
                              onContextMenu={(event) => {
                                event.cancelBubble = true;
                                event.evt.preventDefault();
                                const pointer = stageRef.current
                                  ?.getStage()
                                  .getPointerPosition();
                                setSelectedPieceId(basePiece.id);
                                if (pointer)
                                  setContextMenu({
                                    pieceId: basePiece.id,
                                    x: pointer.x + 12,
                                    y: pointer.y + 12,
                                  });
                              }}
                              onDragEnd={(event) =>
                                handleGroupDragEnd(
                                  pos.groupId as string,
                                  originX,
                                  originY,
                                  event.target.x(),
                                  event.target.y(),
                                )
                              }
                            >
                              {groupItems.map((groupPos, index) => {
                                const groupPiece = pieceMap.get(
                                  groupPos.pieceId,
                                );
                                if (!groupPiece) return null;
                                const renderedGroupPiece =
                                  getRenderedPiece(groupPiece);
                                const groupW =
                                  renderedGroupPiece.lengthIn * SCALE;
                                const groupH =
                                  renderedGroupPiece.widthIn * SCALE;
                                const localX = groupPos.x - originX;
                                const localY = groupPos.y - originY;

                                return (
                                  <Group
                                    key={groupPos.pieceId}
                                    x={localX}
                                    y={localY}
                                    rotation={groupPos.rotation}
                                  >
                                    <Rect
                                      width={groupW}
                                      height={groupH}
                                      fill={
                                        isGroupSelected ? PIECE_FILL : "#ffffff"
                                      }
                                      stroke={
                                        isGroupSelected
                                          ? SELECT_STROKE
                                          : PIECE_STROKE
                                      }
                                      strokeWidth={isGroupSelected ? 2 : 1}
                                      cornerRadius={2}
                                    />
                                    <Text
                                      text={
                                        index === 0
                                          ? (groupPiece.name ?? "L Counter")
                                          : ""
                                      }
                                      x={6}
                                      y={6}
                                      fontSize={11}
                                      fill="#2f6b2c"
                                      fontStyle="bold"
                                    />
                                    <Text
                                      text={formatInches(
                                        renderedGroupPiece.lengthIn,
                                      )}
                                      x={groupW / 2 - 24}
                                      y={index === 0 ? -24 : groupH + 8}
                                      fontSize={11}
                                      fill="#4b5563"
                                    />
                                    <Text
                                      text={formatInches(
                                        renderedGroupPiece.widthIn,
                                      )}
                                      x={groupW + 6}
                                      y={groupH / 2 - 6}
                                      fontSize={11}
                                      fill="#4b5563"
                                    />
                                  </Group>
                                );
                              })}
                            </Group>
                          );
                        }
                        const piece = getRenderedPiece(basePiece);
                        const w = piece.lengthIn * SCALE;
                        const h = piece.widthIn * SCALE;
                        const lShape = isLShape(pos.shape)
                          ? lShapeGeometry(piece, pos.shape)
                          : null;
                        const zShape = isZShape(pos.shape)
                          ? zShapeGeometry(piece, pos.shape)
                          : null;
                        const chainShape = isChainShape(pos.shape)
                          ? chainShapeGeometry(pos.shape)
                          : null;
                        const isSelected =
                          selectedPieceId === pos.pieceId ||
                          editDraft?.pieceId === pos.pieceId;
                        const pieceSinks = layout.sinks.filter(
                          (s) =>
                            s.pieceId === pos.pieceId &&
                            sinkMap.get(s.sinkId) !== undefined,
                        );
                        const referenceLines = layout.referenceLines.filter(
                          (line) => line.pieceId === pos.pieceId,
                        );
                        const deletedLines = layout.deletedLines.filter(
                          (line) => line.pieceId === pos.pieceId,
                        );
                        const hasDeletedBoundaryLines =
                          deletedLines.length > 0;
                        const pieceFill = hasDeletedBoundaryLines
                          ? "rgba(255,255,255,0)"
                          : isSelected
                            ? PIECE_FILL
                            : "#ffffff";
                        const cornerTreatments = new Map(
                          layout.corners
                            .filter((corner) => corner.pieceId === pos.pieceId)
                            .map((corner) => [corner.corner, corner] as const),
                        );
                        const edgeTreatments = new Map(
                          layout.edges
                            .filter((edge) => edge.pieceId === pos.pieceId)
                            .map((edge) => [edge.edge, edge] as const),
                        );
                        const compoundEdges = chainShape
                          ? { edges: chainShape.edges, rects: chainShape.rects }
                          : zShape
                            ? {
                                edges: mergeBoundaryEdges(
                                  rectUnionBoundary(zShape.rects),
                                ),
                                rects: zShape.rects,
                              }
                            : lShape
                              ? {
                                  edges: mergeBoundaryEdges(
                                    rectUnionBoundary(lShape.rects),
                                  ),
                                  rects: lShape.rects,
                                }
                              : null;
                        const visibleCompoundEdges = compoundEdges
                          ? visibleBoundaryEdges({
                              rects: compoundEdges.rects,
                              deletedLines,
                            })
                          : [];
                        const visibleRectangleDimensionEdges =
                          !chainShape && !zShape && !lShape
                            ? ([
                                ["top", rectangleShapeEdge(w, h, "top")],
                                [
                                  "bottom",
                                  rectangleShapeEdge(w, h, "bottom"),
                                ],
                                ["left", rectangleShapeEdge(w, h, "left")],
                                ["right", rectangleShapeEdge(w, h, "right")],
                              ] as Array<[EdgeKey, ShapeEdge]>).filter(
                                ([, edge]) =>
                                  !deletedLines.some((line) =>
                                    shapeEdgeMatchesLine(edge, line),
                                  ),
                              )
                            : [];
                        const rectangleLengthDimension =
                          visibleRectangleDimensionEdges.find(
                            ([edgeKey]) =>
                              edgeKey === "top" || edgeKey === "bottom",
                          ) ?? null;
                        const rectangleDepthDimension =
                          visibleRectangleDimensionEdges.find(
                            ([edgeKey]) =>
                              edgeKey === "left" || edgeKey === "right",
                          ) ?? null;

                        return (
                          <Group
                            key={pos.pieceId}
                            x={pos.x}
                            y={pos.y}
                            rotation={pos.rotation}
                            draggable={
                              isDraft &&
                              tool !== "pan" &&
                              tool !== "offset" &&
                              tool !== "connect"
                            }
                            onMouseDown={(event) => {
                              event.cancelBubble = true;
                              if (activeStep === 4 && sinkPaletteId) {
                                placeSinkOnPiece(basePiece.id, sinkPaletteId);
                              }
                            }}
                            onClick={(event) => {
                              event.cancelBubble = true;
                              if (
                                (tool === "offset" || tool === "connect") &&
                                chainEdgeAction
                              ) {
                                const pointer = getPointer();
                                if (pointer) {
                                  applyChainEdgeClickDirection(pointer);
                                }
                                return;
                              }
                              if (activeStep === 4 && sinkPaletteId) {
                                placeSinkOnPiece(basePiece.id, sinkPaletteId);
                                return;
                              }
                              selectPiece(basePiece);
                            }}
                            onContextMenu={(event) => {
                              event.cancelBubble = true;
                              event.evt.preventDefault();
                              const pointer = stageRef.current
                                ?.getStage()
                                .getPointerPosition();
                              setSelectedPieceId(basePiece.id);
                              if (pointer)
                                setContextMenu({
                                  pieceId: basePiece.id,
                                  x: pointer.x + 12,
                                  y: pointer.y + 12,
                                });
                            }}
                            onDragEnd={(event) =>
                              handleDragEnd(
                                pos.pieceId,
                                event.target.x(),
                                event.target.y(),
                              )
                            }
                          >
                            {chainShape ? (
                              <>
                                {chainShape.rects.map((segment, index) => (
                                  <Rect
                                    key={`chain-segment-${index}`}
                                    x={segment.x}
                                    y={segment.y}
                                    width={segment.w}
                                    height={segment.h}
                                    fill={pieceFill}
                                  />
                                ))}
                                {visibleCompoundEdges.map((edge, index) =>
                                  (() => {
                                    const edgeActionId = `${pos.pieceId}:${index}`;
                                    const isActionSelected =
                                      chainEdgeAction?.pieceId ===
                                        pos.pieceId &&
                                      shapeEdgesEqual(
                                        chainEdgeAction.edge,
                                        edge,
                                      );
                                    const isActionHovered =
                                      hoveredChainEdgeId === edgeActionId;
                                    const selectable =
                                      tool === "offset" ||
                                      tool === "connect" ||
                                      tool === "deleteLine";

                                    return (
                                      <Group key={`chain-edge-${index}`}>
                                        <Line
                                          points={[
                                            edge.from[0],
                                            edge.from[1],
                                            edge.to[0],
                                            edge.to[1],
                                          ]}
                                          stroke={
                                            isActionSelected || isActionHovered
                                              ? GUIDE_COLOR
                                              : isSelected
                                                ? SELECT_STROKE
                                                : PIECE_STROKE
                                          }
                                          strokeWidth={
                                            isActionSelected || isActionHovered
                                              ? 4
                                              : isSelected
                                                ? 2
                                                : 1
                                          }
                                        />
                                        {selectable ? (
                                          <Line
                                            points={[
                                              edge.from[0],
                                              edge.from[1],
                                              edge.to[0],
                                              edge.to[1],
                                            ]}
                                            stroke="transparent"
                                            strokeWidth={16}
                                            onMouseEnter={() =>
                                              setHoveredChainEdgeId(
                                                edgeActionId,
                                              )
                                            }
                                            onMouseLeave={() =>
                                              setHoveredChainEdgeId(null)
                                            }
                                            onMouseDown={(event) => {
                                              event.cancelBubble = true;
                                            }}
                                            onClick={(event) => {
                                              event.cancelBubble = true;
                                              if (tool === "deleteLine") {
                                                erasePieceEdge(
                                                  basePiece,
                                                  pos,
                                                  edge,
                                                );
                                                return;
                                              }
                                              if (!isChainShape(pos.shape)) return;
                                              const segmentIndex =
                                                chainSegmentIndexForEdge(
                                                  pos.shape,
                                                  edge,
                                                );
                                              if (segmentIndex < 0) return;
                                              if (
                                                tool === "connect" &&
                                                chainEdgeAction?.mode ===
                                                  "connect" &&
                                                chainEdgeAction.pieceId ===
                                                  basePiece.id
                                              ) {
                                                connectChainEdges(edge);
                                                return;
                                              }
                                              setSelectedPieceId(basePiece.id);
                                              setChainEdgeAction({
                                                pieceId: basePiece.id,
                                                edge,
                                                segmentIndex,
                                                mode:
                                                  tool === "connect"
                                                    ? "connect"
                                                    : "offset",
                                              });
                                            }}
                                          />
                                        ) : null}
                                      </Group>
                                    );
                                  })(),
                                )}
                              </>
                            ) : zShape ? (
                              <Line
                                points={zShape.outline}
                                closed
                                fill={pieceFill}
                                stroke="transparent"
                                strokeWidth={0}
                              />
                            ) : lShape ? (
                              <Line
                                points={lShape.outline}
                                closed
                                fill={pieceFill}
                                stroke="transparent"
                                strokeWidth={0}
                              />
                            ) : (
                              <Rect
                                width={w}
                                height={h}
                                fill={pieceFill}
                                stroke="transparent"
                                strokeWidth={0}
                                cornerRadius={2}
                              />
                            )}
                            {!chainShape && !zShape && !lShape ? (
                              <>
                                {(
                                  [
                                    "top",
                                    "right",
                                    "bottom",
                                    "left",
                                  ] as EdgeKey[]
                                ).map((edgeKey) => {
                                  const edge = rectangleShapeEdge(
                                    w,
                                    h,
                                    edgeKey,
                                  );
                                  const isDeleted = deletedLines.some((line) =>
                                    shapeEdgeMatchesLine(edge, line),
                                  );
                                  if (isDeleted) return null;
                                  const edgeActionId = `${pos.pieceId}:rect:${edgeKey}`;
                                  const isActionSelected =
                                    chainEdgeAction?.pieceId === pos.pieceId &&
                                    shapeEdgesEqual(chainEdgeAction.edge, edge);
                                  const isActionHovered =
                                    hoveredChainEdgeId === edgeActionId;

                                  return (
                                    <Group key={edgeActionId}>
                                      <Line
                                        points={[
                                          edge.from[0],
                                          edge.from[1],
                                          edge.to[0],
                                          edge.to[1],
                                        ]}
                                        stroke={
                                          isActionSelected || isActionHovered
                                            ? GUIDE_COLOR
                                            : isSelected
                                              ? SELECT_STROKE
                                              : PIECE_STROKE
                                        }
                                        strokeWidth={
                                          isActionSelected || isActionHovered
                                            ? 4
                                            : isSelected
                                              ? 2
                                              : 1
                                        }
                                      />
                                      {tool === "offset" ||
                                      tool === "connect" ||
                                      tool === "deleteLine" ? (
                                        <Line
                                          points={[
                                            edge.from[0],
                                            edge.from[1],
                                            edge.to[0],
                                            edge.to[1],
                                          ]}
                                          stroke="transparent"
                                          strokeWidth={16}
                                          onMouseEnter={() =>
                                            setHoveredChainEdgeId(edgeActionId)
                                          }
                                          onMouseLeave={() =>
                                            setHoveredChainEdgeId(null)
                                          }
                                          onMouseDown={(event) => {
                                            event.cancelBubble = true;
                                          }}
                                          onClick={(event) => {
                                            event.cancelBubble = true;
                                            setSelectedPieceId(basePiece.id);
                                            if (tool === "deleteLine") {
                                              erasePieceEdge(
                                                basePiece,
                                                pos,
                                                edge,
                                              );
                                              return;
                                            }
                                            if (
                                              tool === "connect" &&
                                              chainEdgeAction?.mode ===
                                                "connect" &&
                                              chainEdgeAction.pieceId ===
                                                basePiece.id
                                            ) {
                                              connectChainEdges(edge);
                                              return;
                                            }
                                            setChainEdgeAction({
                                              pieceId: basePiece.id,
                                              edge,
                                              segmentIndex: 0,
                                              mode:
                                                tool === "connect"
                                                  ? "connect"
                                                  : "offset",
                                            });
                                          }}
                                        />
                                      ) : null}
                                    </Group>
                                  );
                                })}
                              </>
                            ) : null}
                            {compoundEdges && !chainShape ? (
                              <>
                                {visibleCompoundEdges.map((edge, index) => {
                                  const edgeActionId = `${pos.pieceId}:compound-edge:${index}`;
                                  const isActionSelected =
                                    chainEdgeAction?.pieceId === pos.pieceId &&
                                    shapeEdgesEqual(chainEdgeAction.edge, edge);
                                  const isActionHovered =
                                    hoveredChainEdgeId === edgeActionId;
                                  const segmentIndex = rectIndexForEdge(
                                    compoundEdges.rects,
                                    edge,
                                  );

                                  return (
                                    <Group key={edgeActionId}>
                                      <Line
                                        points={[
                                          edge.from[0],
                                          edge.from[1],
                                          edge.to[0],
                                          edge.to[1],
                                        ]}
                                        stroke={
                                          isActionSelected || isActionHovered
                                            ? GUIDE_COLOR
                                            : isSelected
                                              ? SELECT_STROKE
                                              : PIECE_STROKE
                                        }
                                        strokeWidth={
                                          isActionSelected || isActionHovered
                                            ? 4
                                            : isSelected
                                              ? 2
                                              : 1
                                        }
                                      />
                                      {tool === "offset" ||
                                      tool === "connect" ||
                                      tool === "deleteLine" ? (
                                        <Line
                                          points={[
                                            edge.from[0],
                                            edge.from[1],
                                            edge.to[0],
                                            edge.to[1],
                                          ]}
                                          stroke="transparent"
                                          strokeWidth={16}
                                          onMouseEnter={() =>
                                            setHoveredChainEdgeId(edgeActionId)
                                          }
                                          onMouseLeave={() =>
                                            setHoveredChainEdgeId(null)
                                          }
                                          onMouseDown={(event) => {
                                            event.cancelBubble = true;
                                          }}
                                          onClick={(event) => {
                                            event.cancelBubble = true;
                                            setSelectedPieceId(basePiece.id);
                                            if (tool === "deleteLine") {
                                              erasePieceEdge(
                                                basePiece,
                                                pos,
                                                edge,
                                              );
                                              return;
                                            }
                                            if (segmentIndex < 0) return;
                                            if (
                                              tool === "connect" &&
                                              chainEdgeAction?.mode ===
                                                "connect" &&
                                              chainEdgeAction.pieceId ===
                                                basePiece.id
                                            ) {
                                              connectChainEdges(edge);
                                              return;
                                            }
                                            setChainEdgeAction({
                                              pieceId: basePiece.id,
                                              edge,
                                              segmentIndex,
                                              mode:
                                                tool === "connect"
                                                  ? "connect"
                                                  : "offset",
                                            });
                                          }}
                                        />
                                      ) : null}
                                    </Group>
                                  );
                                })}
                              </>
                            ) : null}
                            {referenceLines.map((line) => {
                              const isHovered =
                                hoveredChainEdgeId === `reference:${line.id}`;
                              return (
                                <Group key={line.id}>
                                  <Line
                                    points={[
                                      line.from[0],
                                      line.from[1],
                                      line.to[0],
                                      line.to[1],
                                    ]}
                                    stroke={
                                      isHovered ? GUIDE_COLOR : line.color
                                    }
                                    strokeWidth={
                                      isHovered || line.color === PIECE_STROKE
                                        ? 2
                                        : 1
                                    }
                                    dash={
                                      line.color === PIECE_STROKE ? [] : [6, 5]
                                    }
                                  />
                                  {tool === "deleteLine" ||
                                  (tool === "connect" &&
                                    line.color === PIECE_STROKE &&
                                    chainEdgeAction?.mode === "connect" &&
                                    chainEdgeAction.pieceId ===
                                      basePiece.id) ? (
                                    <Line
                                      points={[
                                        line.from[0],
                                        line.from[1],
                                        line.to[0],
                                        line.to[1],
                                      ]}
                                      stroke="transparent"
                                      strokeWidth={16}
                                      onMouseEnter={() =>
                                        setHoveredChainEdgeId(
                                          `reference:${line.id}`,
                                        )
                                      }
                                      onMouseLeave={() =>
                                        setHoveredChainEdgeId(null)
                                      }
                                      onMouseDown={(event) => {
                                        event.cancelBubble = true;
                                      }}
                                      onClick={(event) => {
                                        event.cancelBubble = true;
                                        if (tool === "connect") {
                                          connectChainEdges({
                                            from: line.from,
                                            to: line.to,
                                          });
                                          return;
                                        }

                                        setLayout((prev) => ({
                                          ...prev,
                                          referenceLines: removeReferenceLine(
                                            prev.referenceLines,
                                            line.id,
                                          ),
                                        }));
                                        setHoveredChainEdgeId(null);
                                        markDirty();
                                      }}
                                    />
                                  ) : null}
                                </Group>
                              );
                            })}
                            {!chainShape ? (
                              <>
                                {rectangleLengthDimension?.[0] === "top" ? (
                                <Group
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    if (tool === "offset") {
                                      setSelectedPieceId(basePiece.id);
                                      setChainEdgeAction({
                                        pieceId: basePiece.id,
                                        edge: rectangleShapeEdge(w, h, "top"),
                                        segmentIndex: 0,
                                        mode: "offset",
                                      });
                                      return;
                                    }
                                    openEdgeEditor(basePiece, "top");
                                  }}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                  }}
                                  onMouseEnter={() =>
                                    setHoveredDimension(`${pos.pieceId}:top`)
                                  }
                                  onMouseLeave={() => setHoveredDimension(null)}
                                >
                                  <DimensionLabel
                                    text={formatInches(piece.lengthIn)}
                                    x={w / 2}
                                    y={-18}
                                    hovered={
                                      hoveredDimension === `${pos.pieceId}:top`
                                    }
                                  />
                                </Group>
                                ) : null}
                                {rectangleLengthDimension?.[0] === "bottom" ? (
                                <Group
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    if (tool === "offset") {
                                      setSelectedPieceId(basePiece.id);
                                      setChainEdgeAction({
                                        pieceId: basePiece.id,
                                        edge: rectangleShapeEdge(
                                          w,
                                          h,
                                          "bottom",
                                        ),
                                        segmentIndex: 0,
                                        mode: "offset",
                                      });
                                      return;
                                    }
                                    openEdgeEditor(basePiece, "bottom");
                                  }}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                  }}
                                  onMouseEnter={() =>
                                    setHoveredDimension(`${pos.pieceId}:bottom`)
                                  }
                                  onMouseLeave={() => setHoveredDimension(null)}
                                >
                                  <DimensionLabel
                                    text={formatInches(piece.lengthIn)}
                                    x={w / 2}
                                    y={h + 14}
                                    hovered={
                                      hoveredDimension ===
                                      `${pos.pieceId}:bottom`
                                    }
                                  />
                                </Group>
                                ) : null}
                                {rectangleDepthDimension?.[0] === "left" ? (
                                <Group
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    if (tool === "offset") {
                                      setSelectedPieceId(basePiece.id);
                                      setChainEdgeAction({
                                        pieceId: basePiece.id,
                                        edge: rectangleShapeEdge(w, h, "left"),
                                        segmentIndex: 0,
                                        mode: "offset",
                                      });
                                      return;
                                    }
                                    openEdgeEditor(basePiece, "left");
                                  }}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                  }}
                                  onMouseEnter={() =>
                                    setHoveredDimension(`${pos.pieceId}:left`)
                                  }
                                  onMouseLeave={() => setHoveredDimension(null)}
                                >
                                  <DimensionLabel
                                    text={formatInches(piece.widthIn)}
                                    x={-34}
                                    y={h / 2}
                                    orientation="vertical"
                                    hovered={
                                      hoveredDimension === `${pos.pieceId}:left`
                                    }
                                  />
                                </Group>
                                ) : null}
                                {rectangleDepthDimension?.[0] === "right" ? (
                                <Group
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    if (tool === "offset") {
                                      setSelectedPieceId(basePiece.id);
                                      setChainEdgeAction({
                                        pieceId: basePiece.id,
                                        edge: rectangleShapeEdge(w, h, "right"),
                                        segmentIndex: 0,
                                        mode: "offset",
                                      });
                                      return;
                                    }
                                    openEdgeEditor(basePiece, "right");
                                  }}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                  }}
                                  onMouseEnter={() =>
                                    setHoveredDimension(`${pos.pieceId}:right`)
                                  }
                                  onMouseLeave={() => setHoveredDimension(null)}
                                >
                                  <DimensionLabel
                                    text={formatInches(piece.widthIn)}
                                    x={w + 34}
                                    y={h / 2}
                                    orientation="vertical"
                                    hovered={
                                      hoveredDimension ===
                                      `${pos.pieceId}:right`
                                    }
                                  />
                                </Group>
                                ) : null}
                              </>
                            ) : null}
                            {compoundEdges ? (
                              <>
                                {visibleCompoundEdges.map((edge, index) => {
                                  const dimensionId = `${pos.pieceId}:${index}`;
                                  const isHovered =
                                    hoveredDimension === dimensionId;
                                  const edgeKey = boundaryEdgeKey(
                                    edge,
                                    compoundEdges.rects,
                                  );
                                  const guide = boundaryGuide(
                                    edge,
                                    compoundEdges.rects,
                                  );
                                  const edgeLength = boundaryEdgeLength(edge);
                                  const edgeText = formatInches(edgeLength);
                                  const guideHorizontal =
                                    guide.line[1] === guide.line[3];
                                  const guideSegments =
                                    splitGuideLineAroundLabel(
                                      guide.line,
                                      guide.label,
                                      edgeText,
                                    );
                                  const segmentIndex = isChainShape(pos.shape)
                                    ? chainSegmentIndexForEdge(pos.shape, edge)
                                    : rectIndexForEdge(
                                        compoundEdges.rects,
                                        edge,
                                      );

                                  if (edgeLength < 1) return null;

                                  return (
                                    <Group
                                      key={`compound-dimension-${index}`}
                                      onClick={(event) => {
                                        event.cancelBubble = true;
                                        if (
                                          tool === "offset" ||
                                          tool === "connect"
                                        ) {
                                          if (
                                            tool === "offset" &&
                                            segmentIndex >= 0
                                          ) {
                                            setSelectedPieceId(basePiece.id);
                                            setChainEdgeAction({
                                              pieceId: basePiece.id,
                                              edge,
                                              segmentIndex,
                                              mode: "offset",
                                            });
                                          }
                                          if (
                                            tool === "connect" &&
                                            segmentIndex >= 0
                                          ) {
                                            setSelectedPieceId(basePiece.id);
                                            if (
                                              chainEdgeAction?.mode ===
                                                "connect" &&
                                              chainEdgeAction.pieceId ===
                                                basePiece.id
                                            ) {
                                              connectChainEdges(edge);
                                              return;
                                            }
                                            setChainEdgeAction({
                                              pieceId: basePiece.id,
                                              edge,
                                              segmentIndex,
                                              mode: "connect",
                                            });
                                          }
                                          return;
                                        }
                                        if (activeStep === 3) {
                                          openEdgeTreatmentEditor(
                                            basePiece.id,
                                            edgeKey,
                                          );
                                          return;
                                        }
                                        openEdgeEditor(basePiece, edgeKey, {
                                          value: edgeLength,
                                          ...(segmentIndex >= 0
                                            ? { segmentIndex }
                                            : {}),
                                          shapeEdge: edge,
                                        });
                                      }}
                                      onMouseDown={(event) => {
                                        event.cancelBubble = true;
                                      }}
                                      onMouseEnter={() =>
                                        setHoveredDimension(dimensionId)
                                      }
                                      onMouseLeave={() =>
                                        setHoveredDimension(null)
                                      }
                                    >
                                      <Line
                                        points={guide.line}
                                        stroke="transparent"
                                        strokeWidth={18}
                                      />
                                      {guideSegments.map(
                                        (segment, segmentIndex) => (
                                          <Line
                                            key={`guide-segment-${segmentIndex}`}
                                            points={segment}
                                            stroke={DIMENSION_GUIDE}
                                            strokeWidth={1}
                                          />
                                        ),
                                      )}
                                      <Line
                                        points={guide.startTick}
                                        stroke={DIMENSION_GUIDE}
                                        strokeWidth={1}
                                      />
                                      <Line
                                        points={guide.endTick}
                                        stroke={DIMENSION_GUIDE}
                                        strokeWidth={1}
                                      />
                                      <Line
                                        points={guide.leftArrow}
                                        closed
                                        fill={DIMENSION_GUIDE}
                                      />
                                      <Line
                                        points={guide.rightArrow}
                                        closed
                                        fill={DIMENSION_GUIDE}
                                      />
                                      <DimensionLabel
                                        text={edgeText}
                                        x={guide.label.x}
                                        y={guide.label.y}
                                        orientation={
                                          guideHorizontal
                                            ? "horizontal"
                                            : "vertical"
                                        }
                                        hovered={isHovered}
                                      />
                                    </Group>
                                  );
                                })}
                                {isChainShape(pos.shape)
                                  ? chainInnerDepthGuides(pos.shape).map(
                                      (guide, index) => {
                                        const dimensionId = `${pos.pieceId}:inner-depth:${index}`;
                                        const isHovered =
                                          hoveredDimension === dimensionId;

                                        return (
                                          <Group
                                            key={`inner-depth-${index}`}
                                            onClick={(event) => {
                                              event.cancelBubble = true;
                                              openEdgeEditor(
                                                basePiece,
                                                "bottom",
                                                {
                                                  value: guide.value,
                                                  segmentIndex:
                                                    guide.segmentIndex,
                                                  shapeEdge: guide.edge,
                                                },
                                              );
                                            }}
                                            onMouseDown={(event) => {
                                              event.cancelBubble = true;
                                            }}
                                            onMouseEnter={() =>
                                              setHoveredDimension(dimensionId)
                                            }
                                            onMouseLeave={() =>
                                              setHoveredDimension(null)
                                            }
                                          >
                                            <Line
                                              points={[
                                                guide.edge.from[0],
                                                guide.edge.from[1],
                                                guide.edge.to[0],
                                                guide.edge.to[1],
                                              ]}
                                              stroke="transparent"
                                              strokeWidth={18}
                                            />
                                            {splitGuideLineAroundLabel(
                                              [
                                                guide.edge.from[0],
                                                guide.edge.from[1],
                                                guide.edge.to[0],
                                                guide.edge.to[1],
                                              ],
                                              guide.label,
                                              formatInches(guide.value),
                                            ).map((segment, segmentIndex) => (
                                              <Line
                                                key={`inner-guide-segment-${segmentIndex}`}
                                                points={segment}
                                                stroke={DIMENSION_GUIDE}
                                                strokeWidth={1}
                                              />
                                            ))}
                                            <Line
                                              points={[
                                                guide.edge.from[0],
                                                guide.edge.from[1] - 7,
                                                guide.edge.from[0],
                                                guide.edge.from[1] + 7,
                                              ]}
                                              stroke={DIMENSION_GUIDE}
                                              strokeWidth={1}
                                            />
                                            <Line
                                              points={[
                                                guide.edge.to[0],
                                                guide.edge.to[1] - 7,
                                                guide.edge.to[0],
                                                guide.edge.to[1] + 7,
                                              ]}
                                              stroke={DIMENSION_GUIDE}
                                              strokeWidth={1}
                                            />
                                            <DimensionLabel
                                              text={formatInches(guide.value)}
                                              x={guide.label.x}
                                              y={guide.label.y}
                                              hovered={isHovered}
                                            />
                                          </Group>
                                        );
                                      },
                                    )
                                  : null}
                              </>
                            ) : null}
                            {chainShape &&
                            isSelected &&
                            activeStep === 1 &&
                            tool === "draw"
                              ? (() => {
                                  if (!isChainShape(pos.shape)) return null;
                                  const freeEnd = chainFreeEnd(pos.shape);
                                  if (!freeEnd) return null;
                                  const arrows: Array<{
                                    direction: ContinueDirection;
                                    x: number;
                                    y: number;
                                  }> =
                                    freeEnd.segment.orientation === "horizontal"
                                      ? [
                                          {
                                            direction:
                                              freeEnd.direction === "right"
                                                ? "right"
                                                : "left",
                                            x: freeEnd.x,
                                            y: freeEnd.y,
                                          },
                                          {
                                            direction: "up",
                                            x: freeEnd.x,
                                            y: freeEnd.y,
                                          },
                                          {
                                            direction: "down",
                                            x: freeEnd.x,
                                            y: freeEnd.y,
                                          },
                                        ]
                                      : [
                                          {
                                            direction:
                                              freeEnd.direction === "down"
                                                ? "down"
                                                : "up",
                                            x: freeEnd.x,
                                            y: freeEnd.y,
                                          },
                                          {
                                            direction: "left",
                                            x: freeEnd.x,
                                            y: freeEnd.y,
                                          },
                                          {
                                            direction: "right",
                                            x: freeEnd.x,
                                            y: freeEnd.y,
                                          },
                                        ];

                                  return (
                                    <>
                                      {arrows.map((arrow) => (
                                        <Line
                                          key={`continue-${arrow.direction}`}
                                          x={arrow.x}
                                          y={arrow.y}
                                          points={continueArrowPoints(
                                            arrow.direction,
                                          )}
                                          stroke={GUIDE_COLOR}
                                          strokeWidth={4}
                                          lineCap="round"
                                          lineJoin="round"
                                          opacity={0.8}
                                          onClick={(event) => {
                                            event.cancelBubble = true;
                                            extendChainFromSelectedEnd(
                                              pos.pieceId,
                                              arrow.direction,
                                            );
                                          }}
                                          onMouseDown={(event) => {
                                            event.cancelBubble = true;
                                          }}
                                        />
                                      ))}
                                    </>
                                  );
                                })()
                              : null}
                            {compoundEdges && activeStep === 3 ? (
                              <>
                                {visibleCompoundEdges.map((edge, index) => {
                                  const edgeKey = boundaryEdgeKey(
                                    edge,
                                    compoundEdges.rects,
                                  );
                                  const treatment = edgeTreatments.get(edgeKey);
                                  const midpoint = edgeMidpoint(edge);

                                  return (
                                    <Text
                                      key={`compound-edge-marker-${index}`}
                                      text={edgeMarker(treatment)}
                                      x={midpoint.x - 8}
                                      y={midpoint.y - 6}
                                      fontSize={10}
                                      fill={
                                        treatment?.treatment === "unfinished"
                                          ? "#6b7280"
                                          : "#2f6b2c"
                                      }
                                      fontStyle="bold"
                                      onClick={(event) => {
                                        event.cancelBubble = true;
                                        openEdgeTreatmentEditor(
                                          basePiece.id,
                                          edgeKey,
                                        );
                                      }}
                                      onMouseDown={(event) => {
                                        event.cancelBubble = true;
                                      }}
                                    />
                                  );
                                })}
                              </>
                            ) : null}
                            <Text
                              text={piece.name ?? "Counter"}
                              x={6}
                              y={6}
                              fontSize={11}
                              fill="#2f6b2c"
                              fontStyle="bold"
                            />
                            {activeStep === 3 ? (
                              <>
                                {[
                                  { edge: "top" as const, x: w / 2 - 14, y: 6 },
                                  {
                                    edge: "right" as const,
                                    x: w - 18,
                                    y: h / 2 - 6,
                                  },
                                  {
                                    edge: "bottom" as const,
                                    x: w / 2 - 14,
                                    y: h - 18,
                                  },
                                  { edge: "left" as const, x: 6, y: h / 2 - 6 },
                                ].map((marker) => {
                                  const treatment = edgeTreatments.get(
                                    marker.edge,
                                  );

                                  return (
                                    <Text
                                      key={marker.edge}
                                      text={edgeMarker(treatment)}
                                      x={marker.x}
                                      y={marker.y}
                                      fontSize={10}
                                      fill={
                                        treatment?.treatment === "unfinished"
                                          ? "#6b7280"
                                          : "#2f6b2c"
                                      }
                                      fontStyle="bold"
                                      onClick={(event) => {
                                        event.cancelBubble = true;
                                        openEdgeTreatmentEditor(
                                          basePiece.id,
                                          marker.edge,
                                        );
                                      }}
                                      onMouseDown={(event) => {
                                        event.cancelBubble = true;
                                      }}
                                    />
                                  );
                                })}
                              </>
                            ) : null}
                            {pieceSinks.map((sinkPos) => {
                              const sink = sinkMap.get(sinkPos.sinkId);
                              if (!sink) return null;
                              const sw = sink.cutoutLengthIn * SCALE * 0.8;
                              const sh = sink.cutoutWidthIn * SCALE * 0.8;
                              const sx =
                                sinkPos.x !== 0 ? sinkPos.x : (w - sw) / 2;
                              const sy =
                                sinkPos.y !== 0 ? sinkPos.y : (h - sh) / 2;
                              const sinkSelected =
                                selectedSinkId === sinkPos.sinkId;
                              return (
                                <Group
                                  key={sinkPos.sinkId}
                                  x={sx}
                                  y={sy}
                                  draggable={isDraft && activeStep === 4}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                    const pointer = stageRef.current
                                      ?.getStage()
                                      .getPointerPosition();
                                    setSelectedSinkId(sinkPos.sinkId);
                                    setSelectedPieceId(pos.pieceId);
                                    setSinkPaletteId(null);
                                    setContextMenu(null);
                                    if (pointer) {
                                      setSinkContextMenu({
                                        sinkId: sinkPos.sinkId,
                                        x: pointer.x + 12,
                                        y: pointer.y + 12,
                                      });
                                    }
                                  }}
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    const pointer = stageRef.current
                                      ?.getStage()
                                      .getPointerPosition();
                                    setSelectedSinkId(sinkPos.sinkId);
                                    setSelectedPieceId(pos.pieceId);
                                    setSinkPaletteId(null);
                                    setContextMenu(null);
                                    if (pointer) {
                                      setSinkContextMenu({
                                        sinkId: sinkPos.sinkId,
                                        x: pointer.x + 12,
                                        y: pointer.y + 12,
                                      });
                                    }
                                  }}
                                  onDragEnd={(event) =>
                                    handleSinkDragEnd(
                                      sinkPos.sinkId,
                                      event.target.x(),
                                      event.target.y(),
                                    )
                                  }
                                >
                                  <Rect
                                    width={sw}
                                    height={sh}
                                    fill={SINK_COLOR}
                                    opacity={0.6}
                                    cornerRadius={3}
                                    stroke={
                                      sinkSelected ? SELECT_STROKE : "#1e3a8a"
                                    }
                                    strokeWidth={sinkSelected ? 2 : 1}
                                  />
                                  <Text
                                    text={sink.model ?? "Sink"}
                                    x={3}
                                    y={sh / 2 - 5}
                                    fontSize={9}
                                    fill="#1e3a8a"
                                  />
                                </Group>
                              );
                            })}
                          </Group>
                        );
                      })}

                      {drawPreview ? (
                        <Group x={drawPreview.x} y={drawPreview.y}>
                          {drawPreview.segments &&
                          drawPreview.segments.length > 0 ? (
                            <>
                              {drawPreview.segments.map((segment, index) => (
                                <Rect
                                  key={`preview-segment-${index}`}
                                  x={segment.x - drawPreview.x}
                                  y={segment.y - drawPreview.y}
                                  width={segment.w}
                                  height={segment.h}
                                  fill={PIECE_FILL}
                                  opacity={0.8}
                                />
                              ))}
                              {rectUnionBoundary(
                                drawPreview.segments.map((segment) => ({
                                  x: segment.x - drawPreview.x,
                                  y: segment.y - drawPreview.y,
                                  w: segment.w,
                                  h: segment.h,
                                })),
                              ).map((edge, index) => (
                                <Line
                                  key={`preview-edge-${index}`}
                                  points={[
                                    edge.from[0],
                                    edge.from[1],
                                    edge.to[0],
                                    edge.to[1],
                                  ]}
                                  stroke={GUIDE_COLOR}
                                  strokeWidth={2}
                                />
                              ))}
                            </>
                          ) : (
                            <Rect
                              width={drawPreview.w}
                              height={drawPreview.h}
                              fill={PIECE_FILL}
                              opacity={0.8}
                              stroke={GUIDE_COLOR}
                              strokeWidth={2}
                            />
                          )}
                          <Line
                            points={[0, -10, drawPreview.w, -10]}
                            stroke="#d1d5db"
                            strokeWidth={1}
                          />
                          <Line
                            points={[-10, 0, -10, drawPreview.h]}
                            stroke="#d1d5db"
                            strokeWidth={1}
                          />
                          <Text
                            text={formatInches(drawPreview.lengthIn)}
                            x={drawPreview.w / 2 - 28}
                            y={-24}
                            fontSize={12}
                            fill="#4b5563"
                          />
                          <Text
                            text={formatInches(drawPreview.widthIn)}
                            x={-50}
                            y={drawPreview.h / 2 - 6}
                            fontSize={12}
                            fill="#4b5563"
                          />
                          {!drawPreview.segments && drawPreview.leg ? (
                            <Group
                              x={drawPreview.leg.x - drawPreview.x}
                              y={drawPreview.leg.y - drawPreview.y}
                            >
                              <Rect
                                width={drawPreview.leg.w}
                                height={drawPreview.leg.h}
                                fill={PIECE_FILL}
                                opacity={0.8}
                                stroke={GUIDE_COLOR}
                                strokeWidth={2}
                              />
                              <Text
                                text={formatInches(drawPreview.leg.widthIn)}
                                x={drawPreview.leg.w + 6}
                                y={drawPreview.leg.h / 2 - 6}
                                fontSize={12}
                                fill="#4b5563"
                              />
                            </Group>
                          ) : null}
                          {!drawPreview.segments && drawPreview.tail ? (
                            <Group
                              x={drawPreview.tail.x - drawPreview.x}
                              y={drawPreview.tail.y - drawPreview.y}
                            >
                              <Rect
                                width={drawPreview.tail.w}
                                height={drawPreview.tail.h}
                                fill={PIECE_FILL}
                                opacity={0.8}
                                stroke={GUIDE_COLOR}
                                strokeWidth={2}
                              />
                              <Text
                                text={formatInches(drawPreview.tail.lengthIn)}
                                x={drawPreview.tail.w / 2 - 28}
                                y={drawPreview.tail.h + 8}
                                fontSize={12}
                                fill="#4b5563"
                              />
                            </Group>
                          ) : null}
                          {drawPreview.segments?.map((segment, index) => (
                            <Text
                              key={`${segment.orientation}-${index}`}
                              text={formatInches(
                                segment.orientation === "horizontal"
                                  ? segment.lengthIn
                                  : segment.widthIn,
                              )}
                              x={segment.x - drawPreview.x + segment.w / 2 - 28}
                              y={
                                segment.y -
                                drawPreview.y +
                                (segment.orientation === "horizontal"
                                  ? segment.h + 8
                                  : segment.h / 2 - 6)
                              }
                              fontSize={12}
                              fill="#4b5563"
                            />
                          ))}
                        </Group>
                      ) : null}

                      {textNotes.map((note) => (
                        <Text
                          key={note.id}
                          x={note.x}
                          y={note.y}
                          text={note.text}
                          fontSize={14}
                          fill="#374151"
                        />
                      ))}
                    </Group>
                  </Layer>
                </Stage>

                {contextMenu && selectedPiece && isDraft ? (
                  <div
                    className="absolute z-20 min-w-44 rounded-md border border-[#c8dec3] bg-white p-2 shadow-xl"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                  >
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f3f8ef]"
                      onClick={() => rotatePiece(contextMenu.pieceId, "left")}
                    >
                      Rotate Counter Left
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f3f8ef]"
                      onClick={() => rotatePiece(contextMenu.pieceId, "right")}
                    >
                      Rotate Counter Right
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f3f8ef]"
                      onClick={() => duplicatePiece(contextMenu.pieceId)}
                    >
                      Duplicate Counter
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() => deletePiece(contextMenu.pieceId)}
                    >
                      Delete Counter
                    </button>
                  </div>
                ) : null}

                {sinkContextMenu &&
                selectedSinkId &&
                activeStep === 4 &&
                isDraft ? (
                  <div
                    className="absolute z-20 min-w-44 rounded-md border border-[#c8dec3] bg-white p-2 shadow-xl"
                    style={{ left: sinkContextMenu.x, top: sinkContextMenu.y }}
                  >
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f3f8ef]"
                      onClick={() =>
                        removeSinkFromCounter(sinkContextMenu.sinkId)
                      }
                    >
                      Remove From Counter
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() =>
                        deleteSinkFromCanvas(sinkContextMenu.sinkId)
                      }
                    >
                      Delete Sink
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <aside className="w-40 border-l bg-[#eeecea] py-1 text-sm shadow-inner">
            {toolbarItems.map((item) => (
              <div key={item.label}>
                {item.dividerBefore ? (
                  <div className="mx-3 my-2 border-t border-[#d0ccc7]" />
                ) : null}
                <button
                  type="button"
                  className={`flex h-7 w-full items-center gap-3 px-4 text-left transition ${
                    item.active
                      ? "bg-[#d8d5d0]"
                      : "hover:bg-[#e1ded9]"
                  } ${
                    item.tone === "orange"
                      ? "text-[#ea580c]"
                      : item.tone === "blue"
                        ? "text-[#0f3a68]"
                        : item.tone === "purple"
                          ? "text-[#7c3aed]"
                          : item.tone === "red"
                            ? "text-[#dc2626]"
                            : item.tone === "muted"
                              ? "text-[#a39d96]"
                              : "text-[#111827]"
                  } disabled:cursor-not-allowed disabled:text-[#b7b0a8]`}
                  onClick={item.action}
                  disabled={item.disabled || (!isDraft && item.draftOnly)}
                >
                  <span className="w-3 text-center text-xs leading-none">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            ))}
          </aside>
        </div>
      </div>

      {tool === "otherCounter" ? (
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="font-semibold text-[#2f6b2c]">Add Counter</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Moraware opens a modal here for counter name, size, splash, edge,
            curves, sinks, and cutouts. This panel marks the workflow hook for
            that same control.
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={() => setTool("draw")}
          >
            Done
          </Button>
        </div>
      ) : null}

      {tool === "offset" || tool === "connect" ? (
        <div className="rounded-md border border-[#c8dec3] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[#2f6b2c]">
                {tool === "offset" ? "Offset Edge" : "Connect Edge"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tool === "offset"
                  ? "Select the cabinet/reference edge, then click the side where the new parallel counter edge should appear. The old line stays as a dashed reference."
                  : "Click the first edge, then click the second edge to connect between them."}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTool("draw");
                setChainEdgeAction(null);
              }}
            >
              Done
            </Button>
          </div>
          {tool === "offset" ? (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium">
                Offset Inches
                <input
                  className="mt-1 flex h-9 w-28 rounded-md border px-3 text-sm"
                  type="number"
                  min="0.0625"
                  step="0.0625"
                  value={offsetAmount}
                  onChange={(event) => setOffsetAmount(event.target.value)}
                />
              </label>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            {selectedPieceId
              ? "Offset clicks can be inside the piece; selection is ignored while offset is active."
              : "Select a counter piece first, then click the edge you want to adjust."}
          </p>
        </div>
      ) : null}

      {tool === "deleteLine" ? (
        <div className="rounded-md border border-[#c8dec3] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[#2f6b2c]">Delete Line</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click a dashed cabinet or wall reference line to remove it.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setTool("draw")}>
              Done
            </Button>
          </div>
        </div>
      ) : null}

      {activeStep === 4 ? (
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSinkCreateOpen(true)}
            >
              Add Sink
            </Button>
            {sinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sink cutouts exist for this area yet.
              </p>
            ) : (
              sinks.map((sink) => {
                const placement = layout.sinks.find(
                  (item) => item.sinkId === sink.id,
                );
                const placed =
                  placement?.pieceId !== null &&
                  placement?.pieceId !== undefined;

                return (
                  <Button
                    key={sink.id}
                    size="sm"
                    variant={sinkPaletteId === sink.id ? "default" : "outline"}
                    onClick={() => {
                      setSinkPaletteId((prev) =>
                        prev === sink.id ? null : sink.id,
                      );
                      setSelectedSinkId(sink.id);
                      setSinkContextMenu(null);
                    }}
                  >
                    {sink.model ?? "Sink"}
                    {placed ? " Placed" : ""}
                  </Button>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {editDraft ? (
        <div className="rounded-md border border-[#c8dec3] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[#2f6b2c]">Edit Counter Piece</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Change the size and depth for the selected piece, or use the
                on-piece menu for rotate, duplicate, and delete.
              </p>
            </div>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted"
              onClick={() => {
                setEditDraft(null);
                setSelectedPieceId(null);
                setContextMenu(null);
                setEdgeEditor(null);
                setTool("draw");
              }}
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm font-medium">
              Name
              <input
                className="mt-1 flex h-9 w-full rounded-md border px-3 text-sm"
                value={editDraft.name}
                onChange={(event) =>
                  setEditDraft((prev) =>
                    prev ? { ...prev, name: event.target.value } : prev,
                  )
                }
              />
            </label>
            <label className="text-sm font-medium">
              Length
              <input
                className="mt-1 flex h-9 w-full rounded-md border px-3 text-sm"
                type="number"
                min="1"
                step="0.0625"
                value={editDraft.lengthIn}
                onChange={(event) =>
                  setEditDraft((prev) =>
                    prev ? { ...prev, lengthIn: event.target.value } : prev,
                  )
                }
              />
            </label>
            <label className="text-sm font-medium">
              Depth
              <input
                className="mt-1 flex h-9 w-full rounded-md border px-3 text-sm"
                type="number"
                min="1"
                step="0.0625"
                value={editDraft.widthIn}
                onChange={(event) =>
                  setEditDraft((prev) =>
                    prev ? { ...prev, widthIn: event.target.value } : prev,
                  )
                }
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={savePieceEdit} disabled={isPending}>
              Save Piece
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => deletePiece(editDraft.pieceId)}
              disabled={isPending}
            >
              Delete Piece
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditDraft((prev) =>
                  prev ? { ...prev, widthIn: String(STANDARD_DEPTH_IN) } : prev,
                );
                markDirty();
              }}
            >
              Set Depth 25 1/2"
            </Button>
          </div>
        </div>
      ) : null}

      {pendingTextAt ? (
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="font-semibold text-[#2f6b2c]">Add Text</p>
          <textarea
            className="mt-2 min-h-20 w-full rounded-md border px-3 py-2 text-sm"
            value={textDraft}
            onChange={(event) => setTextDraft(event.target.value)}
            placeholder="Text"
          />
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (textDraft.trim()) {
                  setTextNotes((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      x: pendingTextAt.x,
                      y: pendingTextAt.y,
                      text: textDraft.trim(),
                    },
                  ]);
                }
                setPendingTextAt(null);
                setTextDraft("");
                setTool("draw");
              }}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingTextAt(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setLayout(mergeLayout(null, pieces, sinks));
            setSelectedPieceId(null);
            setContextMenu(null);
            setEdgeEditor(null);
            setCornerEditor(null);
            setEdgeTreatmentEditor(null);
            setEditDraft(null);
            setIsDirty(false);
          }}
        >
          Reset Layout
        </Button>
        <p className="text-xs text-muted-foreground">
          {isPending
            ? "Updating drawing..."
            : tool === "offset"
              ? "Offset mode: enter inches, click the real chain edge, then click white space on the side where you want the new parallel run."
              : tool === "connect"
                ? "Connect mode: click the first edge, then click the second edge to connect between them."
                : 'Drag with the pencil to create a 25 1/2" deep counter. Use on-piece controls for rotate, duplicate, and delete.'}
        </p>
      </div>

      <Modal
        open={helpOpen}
        title="CounterGo Help"
        onClose={() => setHelpOpen(false)}
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use the step tabs to move through the Moraware workflow in order.
          </p>
          <p>
            Drag with the pencil in Counter Dimensions to draw new counter
            pieces. Click a piece to manage it directly from the drawing.
          </p>
          <p>
            Revisions stores saved drawing states so you can revert to an
            earlier layout when needed.
          </p>
        </div>
      </Modal>

      <Modal
        open={saveModalOpen}
        title="Save Quote"
        onClose={() => setSaveModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`drawing-notes-${areaId}`}>
              Notes about this revision:
            </Label>
            <Input
              id={`drawing-notes-${areaId}`}
              value={saveNotes}
              onChange={(event) => setSaveNotes(event.target.value)}
              placeholder="Describe what changed in this revision."
              maxLength={500}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void persistDrawing("continue")}
              disabled={saving || !isDraft}
            >
              {saving ? "Saving..." : "Save & Continue"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void persistDrawing("save")}
              disabled={saving || !isDraft}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={revisionsOpen}
        title="Revert to Quote Revision"
        onClose={() => setRevisionsOpen(false)}
      >
        <div className="space-y-4">
          {revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No drawing revisions have been saved yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revision</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-36">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisions.map((revision) => (
                  <TableRow key={revision.id}>
                    <TableCell>{revision.revisionNumber}</TableCell>
                    <TableCell>{formatDate(revision.createdAt)}</TableCell>
                    <TableCell>{revision.createdByUserId ?? "-"}</TableCell>
                    <TableCell>{revision.notes ?? "-"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          !isDraft ||
                          saving ||
                          latestRevision?.id === revision.id
                        }
                        onClick={() => {
                          startTransition(async () => {
                            const result = await revertDrawingRevisionAction(
                              customerId,
                              quoteId,
                              areaId,
                              revision.id,
                            );
                            if (!result.ok) {
                              setCanvasError(result.error);
                              return;
                            }
                            setRevisionsOpen(false);
                            setContextMenu(null);
                            router.refresh();
                          });
                        }}
                      >
                        Revert to Revision
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Modal>

      <Modal
        open={exitConfirmOpen}
        title="Unsaved Changes"
        onClose={() => setExitConfirmOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You have unsaved changes that will be lost if you continue.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setExitConfirmOpen(false);
                setIsDirty(false);
                resetTransientState();
              }}
            >
              Discard Changes & Continue
            </Button>
            <Button onClick={() => setExitConfirmOpen(false)}>
              Keep Editing
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={cornerEditor !== null}
        title={`Edit Corner - ${cornerEditor ? treatmentLabel(cornerEditor.treatment) : "None"}`}
        onClose={() => setCornerEditor(null)}
      >
        {cornerEditor ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#2f6b2c]">
                {cornerLabel(cornerEditor.corner)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    "radius",
                    "clip",
                    "bumpOut",
                    "notch",
                    "none",
                  ] as CornerTreatment[]
                ).map((treatment) => (
                  <Button
                    key={treatment}
                    type="button"
                    size="sm"
                    variant={
                      cornerEditor.treatment === treatment
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      setCornerEditor((prev) =>
                        prev ? { ...prev, treatment } : prev,
                      )
                    }
                  >
                    {treatmentLabel(treatment)}
                  </Button>
                ))}
              </div>
            </div>
            {cornerEditor.treatment !== "none" ? (
              <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor={`corner-value-${areaId}`}>
                    {cornerEditor.treatment === "radius" ? "Radius" : "Size"}
                  </Label>
                  <Input
                    id={`corner-value-${areaId}`}
                    type="number"
                    min="0.0625"
                    step="0.0625"
                    value={cornerEditor.value}
                    onChange={(event) =>
                      setCornerEditor((prev) =>
                        prev ? { ...prev, value: event.target.value } : prev,
                      )
                    }
                  />
                </div>
                <div className="rounded border border-[#c8dec3] bg-[#f3f8ef] p-3">
                  <p className="text-sm font-semibold text-[#2f6b2c]">
                    {treatmentLabel(cornerEditor.treatment)}
                  </p>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => saveCornerTreatment("stay")}
                disabled={!isDraft}
              >
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => saveCornerTreatment("next")}
                disabled={!isDraft}
              >
                Save & Next Corner
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={edgeEditor !== null}
        title="Edge Length"
        onClose={() => setEdgeEditor(null)}
        panelClassName="w-full max-w-[285px] overflow-hidden rounded-sm border border-[#5f9659] bg-[#f3f8ef] shadow-2xl"
        headerClassName="flex items-center justify-between bg-[#6aa464] px-3 py-3 text-white"
        bodyClassName="px-8 py-4"
        closeLabel="X"
      >
        {edgeEditor ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs">
              <Label
                htmlFor={`edge-length-${areaId}`}
                className="font-semibold text-[#1f3f1d]"
              >
                Length:
              </Label>
              <Input
                id={`edge-length-${areaId}`}
                type="number"
                min="0.0625"
                step="0.0625"
                value={edgeEditor.value}
                autoFocus
                className="h-7 w-28 border-[#5f9659] bg-white px-2 text-xs shadow-inner focus-visible:ring-[#5f9659]"
                onChange={(event) =>
                  setEdgeEditor((prev) =>
                    prev ? { ...prev, value: event.target.value } : prev,
                  )
                }
              />
              <span className="text-xs text-[#5f9659]">&quot;</span>
            </div>
            <div className="flex justify-center">
              {edgeLengthPreview ? (
                <EdgeLengthPreview model={edgeLengthPreview} />
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => saveEdgeLength("next")}
                disabled={isPending || !isDraft}
                className="h-8 border-[#5f9659] bg-[#f8fcf6] text-xs text-[#2f6b2c] hover:bg-white"
              >
                Save &amp; Next Edge
              </Button>
              <Button
                onClick={() => saveEdgeLength("stay")}
                disabled={isPending || !isDraft}
                className="h-8 bg-[#5f9659] text-xs text-white hover:bg-[#4f8549]"
              >
                Save
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={edgeTreatmentEditor !== null}
        title={
          edgeTreatmentEditor
            ? edgeTreatmentLabel(edgeTreatmentEditor.treatment)
            : "Edge Treatment"
        }
        onClose={() => setEdgeTreatmentEditor(null)}
      >
        {edgeTreatmentEditor ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#2f6b2c]">
                {edgeLabel(edgeTreatmentEditor.edge)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  {
                    treatment: "splash" as const,
                    label: '3" Splash',
                    splashHeightIn: "3",
                  },
                  {
                    treatment: "splash" as const,
                    label: '4" Splash',
                    splashHeightIn: "4",
                  },
                  {
                    treatment: "splash" as const,
                    label: '5" Splash',
                    splashHeightIn: "5",
                  },
                  { treatment: "mitered" as const, label: "Mitered Edge" },
                  { treatment: "waterfall" as const, label: "Waterfall" },
                  { treatment: "finished" as const, label: "Finished Edge" },
                  { treatment: "appliance" as const, label: "Appliance Edge" },
                  {
                    treatment: "unfinished" as const,
                    label: "Unfinished Edge",
                  },
                  {
                    treatment: "additionalFinished" as const,
                    label: "Additional Finished Edge",
                  },
                ].map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    size="sm"
                    variant={
                      edgeTreatmentEditor.treatment === option.treatment &&
                      (!("splashHeightIn" in option) ||
                        edgeTreatmentEditor.splashHeightIn ===
                          option.splashHeightIn)
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      setEdgeTreatmentEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              treatment: option.treatment,
                              splashHeightIn:
                                "splashHeightIn" in option
                                  ? option.splashHeightIn
                                  : prev.splashHeightIn,
                              label:
                                option.treatment === "additionalFinished"
                                  ? prev.label || "F1"
                                  : option.treatment === "splash"
                                    ? prev.label || ""
                                    : "",
                            }
                          : prev,
                      )
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            {edgeTreatmentEditor.treatment === "splash" ? (
              <div className="space-y-2">
                <Label htmlFor={`edge-splash-${areaId}`}>Splash Height</Label>
                <Input
                  id={`edge-splash-${areaId}`}
                  type="number"
                  min="0.0625"
                  step="0.0625"
                  value={edgeTreatmentEditor.splashHeightIn}
                  onChange={(event) =>
                    setEdgeTreatmentEditor((prev) =>
                      prev
                        ? { ...prev, splashHeightIn: event.target.value }
                        : prev,
                    )
                  }
                />
              </div>
            ) : null}
            {edgeTreatmentEditor.treatment === "additionalFinished" ? (
              <div className="space-y-2">
                <Label htmlFor={`edge-label-${areaId}`}>Marker Label</Label>
                <Input
                  id={`edge-label-${areaId}`}
                  value={edgeTreatmentEditor.label}
                  onChange={(event) =>
                    setEdgeTreatmentEditor((prev) =>
                      prev ? { ...prev, label: event.target.value } : prev,
                    )
                  }
                  maxLength={8}
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => saveEdgeTreatment("stay")}
                disabled={!isDraft}
              >
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => saveEdgeTreatment("next")}
                disabled={!isDraft}
              >
                Save & Next Edge
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={sinkCreateOpen}
        title="Add Sink"
        onClose={() => setSinkCreateOpen(false)}
      >
        <form action={createSinkFromCanvas} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`sink-model-${areaId}`}>Model</Label>
              <Input id={`sink-model-${areaId}`} name="model" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-quantity-${areaId}`}>Qty</Label>
              <Input
                id={`sink-quantity-${areaId}`}
                name="quantity"
                type="number"
                min="1"
                step="1"
                defaultValue="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-type-${areaId}`}>Sink Type</Label>
              <select
                id={`sink-type-${areaId}`}
                name="sinkType"
                defaultValue="undermount"
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {sinkTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-shape-${areaId}`}>Shape</Label>
              <select
                id={`sink-shape-${areaId}`}
                name="shape"
                defaultValue="rectangle"
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {sinkShapeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-length-${areaId}`}>Cutout Length In</Label>
              <Input
                id={`sink-length-${areaId}`}
                name="cutoutLengthIn"
                type="number"
                min="0.001"
                step="0.001"
                defaultValue="30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-width-${areaId}`}>Cutout Width In</Label>
              <Input
                id={`sink-width-${areaId}`}
                name="cutoutWidthIn"
                type="number"
                min="0.001"
                step="0.001"
                defaultValue="18"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-holes-${areaId}`}>Faucet Holes</Label>
              <Input
                id={`sink-holes-${areaId}`}
                name="faucetHoleCount"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-centerline-${areaId}`}>Centerline</Label>
              <select
                id={`sink-centerline-${areaId}`}
                name="centerline"
                defaultValue="none"
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {sinkCenterlineOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input type="hidden" name="sortOrder" value={String(sinks.length)} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              Add Sink
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
