'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type Konva from 'konva';
import { Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
} from '../_actions';

const SCALE = 3;
const PIECE_GAP = 40;
const CANVAS_W = 760;
const CANVAS_H = 560;
const STANDARD_DEPTH_IN = 25.5;
const SINK_COLOR = '#60a5fa';
const PIECE_FILL = '#d9ead7';
const PIECE_STROKE = '#6aa06a';
const SELECT_STROKE = '#2563eb';
const GUIDE_COLOR = '#f5a884';

type Tool = 'draw' | 'text' | 'pageBreak' | 'otherCounter' | 'pan' | 'select';
type EditorStep = 1 | 2 | 3 | 4 | 5 | 6;
type EdgeKey = 'top' | 'right' | 'bottom' | 'left';
type CornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
type CornerTreatment = 'none' | 'radius' | 'clip' | 'bumpOut' | 'notch';
type EdgeTreatment = 'finished' | 'appliance' | 'mitered' | 'waterfall' | 'splash' | 'unfinished' | 'additionalFinished';
type SinkType = 'undermount' | 'drop_in' | 'farm';
type SinkShape = 'rectangle' | 'oval' | 'double' | '60_40' | '40_60' | '70_30' | '30_70';
type SinkCenterline = 'none' | 'left' | 'right' | 'center';

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
  type: 'l';
  legX: number;
  legY: number;
  legWidthIn: number;
  legLengthIn: number;
}

export interface ZShapeLayout {
  type: 'z';
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
  orientation: 'horizontal' | 'vertical';
}

export interface ChainShapeLayout {
  type: 'chain';
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

export interface CanvasLayout {
  pieces: PieceLayout[];
  sinks: SinkLayout[];
  corners: CornerLayout[];
  edges: EdgeLayout[];
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
  category: 'material' | 'fabrication' | 'finished_edge' | 'splash' | 'sink_cutout' | 'sink_item' | 'faucet_hole';
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

const steps: Array<{ id: EditorStep; title: string; shortTitle: string }> = [
  { id: 1, title: 'Counter Dimensions', shortTitle: 'Counter Dimensions' },
  { id: 2, title: 'Curves & Bumpouts', shortTitle: 'Curves & Bumpouts' },
  { id: 3, title: 'Splash & Edge', shortTitle: 'Splash & Edge' },
  { id: 4, title: 'Sink & Cooktop', shortTitle: 'Sink & Cooktop' },
  { id: 5, title: 'Color & Edge', shortTitle: 'Color & Edge' },
  { id: 6, title: 'Price Details', shortTitle: 'Price Details' },
];

const sinkTypeOptions: SinkType[] = ['undermount', 'drop_in', 'farm'];
const sinkShapeOptions: SinkShape[] = ['rectangle', 'oval', 'double', '60_40', '40_60', '70_30', '30_70'];
const sinkCenterlineOptions: SinkCenterline[] = ['none', 'left', 'right', 'center'];

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

function mergeLayout(layout: CanvasLayout | null, pieces: DrawingPiece[], sinks: DrawingSink[]): CanvasLayout {
  const validPieceIds = new Set(pieces.map((piece) => piece.id));
  const validSinkIds = new Set(sinks.map((sink) => sink.id));
  const base = {
    pieces: (layout?.pieces ?? []).filter((piece) => validPieceIds.has(piece.pieceId)),
    sinks: (layout?.sinks ?? []).filter((sink) => validSinkIds.has(sink.sinkId) && (sink.pieceId === null || validPieceIds.has(sink.pieceId))),
    corners: (layout?.corners ?? []).filter((corner) => validPieceIds.has(corner.pieceId)),
    edges: (layout?.edges ?? []).filter((edge) => validPieceIds.has(edge.pieceId)),
  };
  const existing = new Set(base.pieces.map((p) => p.pieceId));
  const missing = pieces.filter((piece) => !existing.has(piece.id));

  if (missing.length === 0) {
    return base;
  }

  const auto = autoLayout(pieces);
  const additions = missing.map((piece) => auto.find((pos) => pos.pieceId === piece.id) ?? {
    pieceId: piece.id,
    x: 30,
    y: 30 + base.pieces.length * (STANDARD_DEPTH_IN * SCALE + PIECE_GAP),
    rotation: 0,
  });

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

  return whole === 0 ? `${numerator}/${denominator}"` : `${whole} ${numerator}/${denominator}"`;
}

function toolCursor(tool: Tool, isDraft: boolean) {
  if (!isDraft) return 'default';
  if (tool === 'draw') return 'crosshair';
  if (tool === 'pan') return 'grab';
  if (tool === 'text') return 'text';
  return 'default';
}

function isCreatedCounterPiece(value: unknown): value is CreatedCounterPiece {
  return typeof value === 'object' && value !== null && 'id' in value && typeof (value as { id?: unknown }).id === 'string';
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function edgeLabel(edge: EdgeKey) {
  if (edge === 'top') return 'Top Edge';
  if (edge === 'right') return 'Right Edge';
  if (edge === 'bottom') return 'Bottom Edge';
  return 'Left Edge';
}

function nextEdge(edge: EdgeKey): EdgeKey {
  const edgeOrder: EdgeKey[] = ['top', 'right', 'bottom', 'left'];
  const index = edgeOrder.indexOf(edge);
  return edgeOrder[(index + 1) % edgeOrder.length] ?? 'top';
}

function cornerLabel(corner: CornerKey) {
  if (corner === 'topLeft') return 'Top Left Corner';
  if (corner === 'topRight') return 'Top Right Corner';
  if (corner === 'bottomRight') return 'Bottom Right Corner';
  return 'Bottom Left Corner';
}

function nextCorner(corner: CornerKey): CornerKey {
  const cornerOrder: CornerKey[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
  const index = cornerOrder.indexOf(corner);
  return cornerOrder[(index + 1) % cornerOrder.length] ?? 'topLeft';
}

function treatmentLabel(treatment: CornerTreatment) {
  if (treatment === 'radius') return 'Radius';
  if (treatment === 'clip') return 'Clip';
  if (treatment === 'bumpOut') return 'Bump Out';
  if (treatment === 'notch') return 'Notch';
  return 'None';
}

function treatmentMarker(treatment: CornerTreatment) {
  if (treatment === 'none') return '-Std-';
  if (treatment === 'bumpOut') return 'Bump';
  return treatmentLabel(treatment);
}

function edgeTreatmentLabel(treatment: EdgeTreatment) {
  if (treatment === 'finished') return 'Finished Edge (Eased)';
  if (treatment === 'appliance') return 'Appliance Edge';
  if (treatment === 'mitered') return 'Mitered Edge';
  if (treatment === 'waterfall') return 'Waterfall';
  if (treatment === 'splash') return 'Splash';
  if (treatment === 'additionalFinished') return 'Additional Finished Edge';
  return 'Unfinished Edge';
}

function edgeMarker(edge: EdgeLayout | undefined) {
  if (!edge) return 'F';
  if (edge.treatment === 'unfinished') return 'U';
  if (edge.treatment === 'mitered') return 'M';
  if (edge.treatment === 'waterfall') return 'W';
  if (edge.treatment === 'appliance') return 'A';
  if (edge.treatment === 'additionalFinished') return edge.label ?? 'F1';
  if (edge.treatment === 'splash') {
    if (edge.splashHeightIn === 3) return 'S3';
    if (edge.splashHeightIn === 4) return 'S4';
    if (edge.splashHeightIn === 5) return 'S5';
    return edge.label ?? 'S';
  }
  return edge.label ?? 'F';
}

function edgeValue(piece: DrawingPiece, edge: EdgeKey) {
  return edge === 'top' || edge === 'bottom' ? piece.lengthIn : piece.widthIn;
}

function isLShape(shape: PieceShape | null | undefined): shape is LShapeLayout {
  return shape?.type === 'l';
}

function isZShape(shape: PieceShape | null | undefined): shape is ZShapeLayout {
  return shape?.type === 'z';
}

function isChainShape(shape: PieceShape | null | undefined): shape is ChainShapeLayout {
  return shape?.type === 'chain';
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
      return [0, 0, mainW, 0, mainW, legY + legH, legX, legY + legH, legX, mainH, 0, mainH];
    }
    if (!legAbove && legOnLeft) {
      return [0, 0, mainW, 0, mainW, mainH, legX + legW, mainH, legX + legW, legY + legH, 0, legY + legH];
    }
    if (legAbove && !legOnLeft) {
      return [0, 0, legX, 0, legX, legY, mainW, legY, mainW, mainH, 0, mainH];
    }
    return [0, legY, legX + legW, legY, legX + legW, 0, mainW, 0, mainW, mainH, 0, mainH];
  })();

  return { mainW, mainH, legW, legH, legX, legY, outline };
}

interface ShapeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function pointKey(x: number, y: number) {
  return `${Number(x.toFixed(4))},${Number(y.toFixed(4))}`;
}

function rectUnionOutline(rects: ShapeRect[]) {
  const xs = Array.from(new Set(rects.flatMap((rect) => [rect.x, rect.x + rect.w]))).sort((a, b) => a - b);
  const ys = Array.from(new Set(rects.flatMap((rect) => [rect.y, rect.y + rect.h]))).sort((a, b) => a - b);
  const covered = new Set<string>();

  for (let xIndex = 0; xIndex < xs.length - 1; xIndex += 1) {
    for (let yIndex = 0; yIndex < ys.length - 1; yIndex += 1) {
      const x1 = xs[xIndex] ?? 0;
      const x2 = xs[xIndex + 1] ?? x1;
      const y1 = ys[yIndex] ?? 0;
      const y2 = ys[yIndex + 1] ?? y1;
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      const isCovered = rects.some((rect) => (
        centerX >= rect.x && centerX <= rect.x + rect.w && centerY >= rect.y && centerY <= rect.y + rect.h
      ));

      if (isCovered) {
        covered.add(`${xIndex},${yIndex}`);
      }
    }
  }

  const edges: Array<[[number, number], [number, number]]> = [];
  covered.forEach((key) => {
    const [xIndex = 0, yIndex = 0] = key.split(',').map(Number);
    const x1 = xs[xIndex] ?? 0;
    const x2 = xs[xIndex + 1] ?? x1;
    const y1 = ys[yIndex] ?? 0;
    const y2 = ys[yIndex + 1] ?? y1;

    if (!covered.has(`${xIndex},${yIndex - 1}`)) edges.push([[x1, y1], [x2, y1]]);
    if (!covered.has(`${xIndex + 1},${yIndex}`)) edges.push([[x2, y1], [x2, y2]]);
    if (!covered.has(`${xIndex},${yIndex + 1}`)) edges.push([[x2, y2], [x1, y2]]);
    if (!covered.has(`${xIndex - 1},${yIndex}`)) edges.push([[x1, y2], [x1, y1]]);
  });

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

  edges.forEach(([from, to]) => {
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

    const nextKey = (neighbors.get(currentKey) ?? []).find((candidate) => candidate !== previousKey);
    if (!nextKey) break;
    previousKey = currentKey;
    currentKey = nextKey;
    if (currentKey === start[0]) break;
  }

  const simplified = ordered.filter((point, index, all) => {
    const previous = all[(index - 1 + all.length) % all.length];
    const next = all[(index + 1) % all.length];
    if (!previous || !next) return true;
    return !((previous[0] === point[0] && point[0] === next[0]) || (previous[1] === point[1] && point[1] === next[1]));
  });

  return simplified.flatMap(([x, y]) => [x, y]);
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

  return { mainW, mainH, legW, legH, tailW, tailH, rects, outline: rectUnionOutline(rects) };
}

function chainShapeGeometry(shape: ChainShapeLayout) {
  const rects = shape.segments.map((segment) => ({
    x: segment.x,
    y: segment.y,
    w: segment.w,
    h: segment.h,
  }));

  return { rects, outline: rectUnionOutline(rects) };
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold text-[#2f6b2c]">{title}</h3>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
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
}: Props) {
  const router = useRouter();
  const [layout, setLayout] = useState<CanvasLayout>(() => mergeLayout(initialLayout, pieces, sinks));
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedSinkId, setSelectedSinkId] = useState<string | null>(null);
  const [sinkPaletteId, setSinkPaletteId] = useState<string | null>(null);
  const [sinkCreateOpen, setSinkCreateOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<EditorStep>(1);
  const [tool, setTool] = useState<Tool>('draw');
  const [roundSixteenth, setRoundSixteenth] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  const [textNotes, setTextNotes] = useState<TextNote[]>([]);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawPath, setDrawPath] = useState<Array<{ x: number; y: number }>>([]);
  const [drawPreview, setDrawPreview] = useState<DrawPreview | null>(null);
  const [panStart, setPanStart] = useState<{ pointer: { x: number; y: number }; pan: { x: number; y: number } } | null>(null);
  const [pieceOverrides, setPieceOverrides] = useState<Record<string, { lengthIn: number; widthIn: number }>>({});
  const [pendingTextAt, setPendingTextAt] = useState<{ x: number; y: number } | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [editDraft, setEditDraft] = useState<{ pieceId: string; name: string; lengthIn: string; widthIn: string } | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveNotes, setSaveNotes] = useState('');
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [areaDraft, setAreaDraft] = useState({
    name: area.name,
    sortOrder: String(area.sortOrder),
    material: area.material ?? '',
    color: area.color ?? '',
    edgeProfile: area.edgeProfile ?? '',
    notes: area.notes ?? '',
  });
  const [areaSaving, setAreaSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [sinkContextMenu, setSinkContextMenu] = useState<SinkContextMenuState | null>(null);
  const [edgeEditor, setEdgeEditor] = useState<EdgeLengthEditorState | null>(null);
  const [cornerEditor, setCornerEditor] = useState<CornerEditorState | null>(null);
  const [edgeTreatmentEditor, setEdgeTreatmentEditor] = useState<EdgeTreatmentEditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const stageRef = useRef<Konva.Stage | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    setLayout((currentLayout) => {
      const nextLayout = mergeLayout(initialLayout, pieces, sinks);
      const currentPieces = new Map(currentLayout.pieces.map((piece) => [piece.pieceId, piece]));

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
    setSaveNotes('');
    setIsDirty(false);
  }, [latestRevision?.id]);

  useEffect(() => {
    setAreaDraft({
      name: area.name,
      sortOrder: String(area.sortOrder),
      material: area.material ?? '',
      color: area.color ?? '',
      edgeProfile: area.edgeProfile ?? '',
      notes: area.notes ?? '',
    });
  }, [area.color, area.edgeProfile, area.id, area.material, area.name, area.notes, area.sortOrder]);

  useEffect(() => {
    if (!editDraft) return;
    const refreshedPiece = pieces.find((piece) => piece.id === editDraft.pieceId);
    if (!refreshedPiece) return;
    setEditDraft({
      pieceId: refreshedPiece.id,
      name: refreshedPiece.name ?? '',
      lengthIn: String(refreshedPiece.lengthIn),
      widthIn: String(refreshedPiece.widthIn),
    });
  }, [editDraft?.pieceId, pieces]); // eslint-disable-line react-hooks/exhaustive-deps

  const pieceMap = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);
  const sinkMap = useMemo(() => new Map(sinks.map((s) => [s.id, s])), [sinks]);
  const getRenderedPiece = useCallback((piece: DrawingPiece): DrawingPiece => {
    const override = pieceOverrides[piece.id];
    return override ? { ...piece, ...override } : piece;
  }, [pieceOverrides]);

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
    setCornerEditor(null);
    setEdgeTreatmentEditor(null);
    setEditDraft(null);
    setPendingTextAt(null);
    setTextDraft('');
    setDrawStart(null);
    setDrawPath([]);
    setDrawPreview(null);
    setPanStart(null);
    setTool('draw');
    setActiveStep(1);
    setHelpOpen(false);
    setSaveModalOpen(false);
    setRevisionsOpen(false);
  }, []);

  const screenToCanvas = useCallback((point: { x: number; y: number }) => ({
    x: (point.x - pan.x) / zoom,
    y: (point.y - pan.y) / zoom,
  }), [pan.x, pan.y, zoom]);

  const getPointer = useCallback(() => {
    const pointer = stageRef.current?.getStage().getPointerPosition();
    return pointer ? screenToCanvas(pointer) : null;
  }, [screenToCanvas]);

  const buildPreview = useCallback((start: { x: number; y: number }, current: { x: number; y: number }, path: Array<{ x: number; y: number }> = []): DrawPreview => {
    const trace = [...path, current];
    const depthPx = STANDARD_DEPTH_IN * SCALE;
    const chainVertices = [{ ...start }];
    let currentAxis: 'x' | 'y' = 'x';
    let currentVertex = start;
    let currentEnd = { ...start };
    const firstDirectionPoint = trace.find((point) => Math.abs(point.x - start.x) >= 10);
    let horizontalDirection = (firstDirectionPoint?.x ?? current.x) >= start.x ? 1 : -1;
    let verticalDirection = current.y >= start.y ? 1 : -1;

    for (const point of trace) {
      if (currentAxis === 'x') {
        const nextX = horizontalDirection > 0
          ? Math.max(currentEnd.x, point.x, currentVertex.x)
          : Math.min(currentEnd.x, point.x, currentVertex.x);
        currentEnd = { x: nextX, y: currentVertex.y };

        if (Math.abs(point.y - currentVertex.y) > depthPx + 8 && Math.abs(currentEnd.x - currentVertex.x) >= depthPx) {
          chainVertices.push(currentEnd);
          currentAxis = 'y';
          verticalDirection = point.y >= currentVertex.y ? 1 : -1;
          currentVertex = currentEnd;
          currentEnd = { x: currentVertex.x, y: point.y };
        }
        continue;
      }

      const nextY = verticalDirection > 0
        ? Math.max(currentEnd.y, point.y, currentVertex.y)
        : Math.min(currentEnd.y, point.y, currentVertex.y);
      currentEnd = { x: currentVertex.x, y: nextY };

      if (Math.abs(point.x - currentVertex.x) > depthPx + 8 && Math.abs(currentEnd.y - currentVertex.y) >= depthPx) {
        chainVertices.push(currentEnd);
        currentAxis = 'x';
        horizontalDirection = point.x >= currentVertex.x ? 1 : -1;
        currentVertex = currentEnd;
        currentEnd = { x: point.x, y: currentVertex.y };
      }
    }

    const lastChainVertex = chainVertices[chainVertices.length - 1] ?? start;
    if (Math.hypot(currentEnd.x - lastChainVertex.x, currentEnd.y - lastChainVertex.y) >= SCALE) {
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
        const y = index === 0 ? from.y : (previousVertex && from.y > previousVertex.y ? from.y - depthPx : from.y);
        const w = Math.max(Math.abs(dx), SCALE);
        chainSegments.push({
          x: Math.min(from.x, to.x),
          y,
          w,
          h: depthPx,
          lengthIn: roundToSixteenth(w / SCALE, roundSixteenth),
          widthIn: STANDARD_DEPTH_IN,
          orientation: 'horizontal' as const,
        });
        return;
      }

      const previous = chainVertices[index - 1] ?? start;
      const previousDx = from.x - previous.x;
      const x = previousDx >= 0 ? from.x - depthPx : from.x;
      const h = Math.max(Math.abs(dy) - depthPx, 0);
      if (h < SCALE) return;
      chainSegments.push({
        x,
        y: dy >= 0 ? from.y + depthPx : to.y,
        w: depthPx,
        h,
        lengthIn: STANDARD_DEPTH_IN,
        widthIn: roundToSixteenth(h / SCALE, roundSixteenth),
        orientation: 'vertical' as const,
      });
    });

    if (chainSegments.length >= 2) {
      const minX = Math.min(...chainSegments.map((segment) => segment.x));
      const minY = Math.min(...chainSegments.map((segment) => segment.y));
      const maxX = Math.max(...chainSegments.map((segment) => segment.x + segment.w));
      const maxY = Math.max(...chainSegments.map((segment) => segment.y + segment.h));
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

    const firstHorizontalIndex = trace.findIndex((point) => Math.abs(point.x - start.x) >= 10);
    const firstHorizontalPoint = firstHorizontalIndex >= 0 ? trace[firstHorizontalIndex] : undefined;
    const fallbackHorizontalDirection = (firstHorizontalPoint?.x ?? current.x) >= start.x ? 1 : -1;
    const h = depthPx;
    const firstVerticalIndex = trace.findIndex((point, index) => (
      index >= Math.max(firstHorizontalIndex, 0) && Math.abs(point.y - start.y) > h + 8
    ));
    const turnTrace = firstVerticalIndex >= 0 ? trace.slice(0, firstVerticalIndex + 1) : trace;
    const turnX = fallbackHorizontalDirection > 0
      ? Math.max(...turnTrace.map((point) => point.x), start.x)
      : Math.min(...turnTrace.map((point) => point.x), start.x);
    const lengthPx = Math.max(Math.abs(turnX - start.x), SCALE);
    const lengthIn = Math.max(roundToSixteenth(lengthPx / SCALE, roundSixteenth), 1);
    const widthIn = STANDARD_DEPTH_IN;
    const w = lengthIn * SCALE;
    const verticalOverflow = Math.abs(current.y - start.y) - h;
    const legLengthIn = Math.max(roundToSixteenth(verticalOverflow / SCALE, roundSixteenth), 0);
    const legDirection = current.y >= start.y ? 1 : -1;
    const legX = fallbackHorizontalDirection < 0 ? start.x - w : start.x + w - h;
    const legY = legDirection > 0 ? start.y + h : start.y - legLengthIn * SCALE;
    const tailProgressPx = fallbackHorizontalDirection > 0
      ? Math.max(current.x - turnX, 0)
      : Math.max(turnX - current.x, 0);
    const tailLengthIn = Math.max(roundToSixteenth(tailProgressPx / SCALE, roundSixteenth), 0);
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
      ...(legLengthIn >= 4 ? {
        leg: {
          x: legX,
          y: legY,
          w: h,
          h: legLengthIn * SCALE,
          lengthIn: STANDARD_DEPTH_IN,
          widthIn: legLengthIn,
        },
      } : {}),
      ...(legLengthIn >= 4 && tailLengthIn >= 4 ? {
        tail: {
          x: tailX,
          y: tailY,
          w: tailW,
          h,
          lengthIn: tailLengthIn,
          widthIn: STANDARD_DEPTH_IN,
        },
      } : {}),
    };
  }, [roundSixteenth]);

  const buildPieceFormData = useCallback((name: string, lengthIn: number, widthIn: number, sortOrder: number) => {
    const formData = new FormData();
    formData.set('sortOrder', String(sortOrder));
    formData.set('name', name);
    formData.set('lengthIn', String(lengthIn));
    formData.set('widthIn', String(widthIn));
    formData.set('quantity', '1');
    return formData;
  }, []);

  const selectPiece = useCallback((piece: DrawingPiece) => {
    setSelectedPieceId(piece.id);
    setSelectedSinkId(null);
    setEditDraft({
      pieceId: piece.id,
      name: piece.name ?? '',
      lengthIn: String(piece.lengthIn),
      widthIn: String(piece.widthIn),
    });
    setTool('select');
    setContextMenu(null);
  }, []);

  const openEdgeEditor = useCallback((piece: DrawingPiece, edge: EdgeKey) => {
    const renderedPiece = getRenderedPiece(piece);
    setSelectedPieceId(piece.id);
    setContextMenu(null);
    setCornerEditor(null);
    setTool('select');
    setEdgeEditor({
      pieceId: piece.id,
      edge,
      value: String(edgeValue(renderedPiece, edge)),
    });
  }, [getRenderedPiece]);

  const openCornerEditor = useCallback((pieceId: string, corner: CornerKey) => {
    const existing = layoutRef.current.corners.find((item) => item.pieceId === pieceId && item.corner === corner);
    setSelectedPieceId(pieceId);
    setContextMenu(null);
    setEdgeEditor(null);
    setEdgeTreatmentEditor(null);
    setTool('select');
    setCornerEditor({
      pieceId,
      corner,
      treatment: existing?.treatment ?? 'none',
      value: existing?.valueIn !== null && existing?.valueIn !== undefined ? String(existing.valueIn) : '',
    });
  }, []);

  const openEdgeTreatmentEditor = useCallback((pieceId: string, edge: EdgeKey) => {
    const existing = layoutRef.current.edges.find((item) => item.pieceId === pieceId && item.edge === edge);
    setSelectedPieceId(pieceId);
    setContextMenu(null);
    setEdgeEditor(null);
    setCornerEditor(null);
    setTool('select');
    setEdgeTreatmentEditor({
      pieceId,
      edge,
      treatment: existing?.treatment ?? 'finished',
      splashHeightIn: existing?.splashHeightIn !== null && existing?.splashHeightIn !== undefined ? String(existing.splashHeightIn) : '',
      label: existing?.label ?? '',
    });
  }, []);

  const placeSinkOnPiece = useCallback((pieceId: string, sinkId: string) => {
    const piece = pieces.find((item) => item.id === pieceId);
    const sink = sinks.find((item) => item.id === sinkId);
    const pieceLayout = layoutRef.current.pieces.find((item) => item.pieceId === pieceId);
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
  }, [markDirty, pieces, sinks]);

  const removeSinkFromCounter = useCallback((sinkId: string) => {
    setLayout((prev) => ({
      ...prev,
      sinks: prev.sinks.map((sink) => sink.sinkId === sinkId ? { ...sink, pieceId: null, x: 0, y: 0 } : sink),
    }));
    setSelectedSinkId(null);
    setSinkContextMenu(null);
    markDirty();
  }, [markDirty]);

  const deleteSinkFromCanvas = useCallback((sinkId: string) => {
    startTransition(async () => {
      await deleteSinkCutoutAction(customerId, quoteId, areaId, sinkId);
      setLayout((prev) => ({
        ...prev,
        sinks: prev.sinks.filter((sink) => sink.sinkId !== sinkId),
      }));
      setSelectedSinkId(null);
      setSinkContextMenu(null);
      router.refresh();
    });
  }, [areaId, customerId, quoteId, router]);

  const handleSinkDragEnd = useCallback((sinkId: string, x: number, y: number) => {
    setLayout((prev) => ({
      ...prev,
      sinks: prev.sinks.map((sink) => sink.sinkId === sinkId ? { ...sink, x, y } : sink),
    }));
    markDirty();
  }, [markDirty]);

  const createSinkFromCanvas = useCallback((formData: FormData) => {
    startTransition(async () => {
      await createSinkCutoutAction(customerId, quoteId, areaId, formData);
      setSinkCreateOpen(false);
      router.refresh();
    });
  }, [areaId, customerId, quoteId, router]);

  const persistDrawing = useCallback(async (mode: 'continue' | 'save') => {
    setSaving(true);
    try {
      await saveDrawingAction(customerId, quoteId, areaId, layoutRef.current, saveNotes.trim() || null);
      setSaveModalOpen(false);
      setSaveNotes('');
      if (mode === 'save') {
        resetTransientState();
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [areaId, customerId, quoteId, resetTransientState, router, saveNotes]);

  const addCounterPiece = useCallback((preview: DrawPreview) => {
    startTransition(async () => {
      const nextPieceIndex = Math.max(pieces.length, layoutRef.current.pieces.length);
      const first = await createCounterPieceForCanvasAction(
        customerId,
        quoteId,
        areaId,
        buildPieceFormData(`Counter ${nextPieceIndex + 1}`, preview.lengthIn, preview.widthIn, nextPieceIndex)
      );

      if (!isCreatedCounterPiece(first)) {
        return;
      }

      const createdLayouts: PieceLayout[] = [
        {
          pieceId: first.id,
          x: preview.x,
          y: preview.y,
          rotation: 0,
          ...(preview.segments && preview.segments.length > 1 ? {
            shape: {
              type: 'chain' as const,
              segments: preview.segments.map((segment) => ({
                ...segment,
                x: segment.x - preview.x,
                y: segment.y - preview.y,
              })),
            },
          } : preview.leg && preview.tail ? {
            shape: {
              type: 'z' as const,
              legX: preview.leg.x - preview.x,
              legY: preview.leg.y - preview.y,
              legWidthIn: preview.leg.lengthIn,
              legLengthIn: preview.leg.widthIn,
              tailX: preview.tail.x - preview.x,
              tailY: preview.tail.y - preview.y,
              tailLengthIn: preview.tail.lengthIn,
              tailWidthIn: preview.tail.widthIn,
            },
          } : preview.leg ? {
            shape: {
              type: 'l' as const,
              legX: preview.leg.x - preview.x,
              legY: preview.leg.y - preview.y,
              legWidthIn: preview.leg.lengthIn,
              legLengthIn: preview.leg.widthIn,
            },
          } : {}),
        },
      ];

      const nextLayout = {
        ...layoutRef.current,
        pieces: [...layoutRef.current.pieces, ...createdLayouts],
      };
      setLayout(nextLayout);
      await saveDrawingAction(customerId, quoteId, areaId, nextLayout, null);
      setIsDirty(false);
      router.refresh();
    });
  }, [areaId, buildPieceFormData, customerId, pieces.length, quoteId, router]);

  const handleDragEnd = useCallback((pieceId: string, x: number, y: number) => {
    setLayout((prev) => ({
      ...prev,
      pieces: prev.pieces.map((p) => p.pieceId === pieceId ? { ...p, x, y } : p),
    }));
    markDirty();
  }, [markDirty]);

  const handleGroupDragEnd = useCallback((groupId: string, originX: number, originY: number, x: number, y: number) => {
    const dx = x - originX;
    const dy = y - originY;
    setLayout((prev) => ({
      ...prev,
      pieces: prev.pieces.map((piece) => piece.groupId === groupId
        ? { ...piece, x: piece.x + dx, y: piece.y + dy }
        : piece),
    }));
    markDirty();
  }, [markDirty]);

  const savePieceEdit = useCallback(() => {
    if (!editDraft) return;
    const formData = new FormData();
    formData.set('name', editDraft.name);
    formData.set('lengthIn', editDraft.lengthIn);
    formData.set('widthIn', editDraft.widthIn);
    formData.set('quantity', '1');
    formData.set('sortOrder', String(Math.max(pieces.findIndex((piece) => piece.id === editDraft.pieceId), 0)));

    startTransition(async () => {
      await updateCounterPieceAction(customerId, quoteId, areaId, editDraft.pieceId, formData);
      markDirty();
      router.refresh();
    });
  }, [areaId, customerId, editDraft, markDirty, pieces, quoteId, router]);

  const saveAreaDetails = useCallback(() => {
    if (!areaDraft.name.trim()) return;

    const formData = new FormData();
    formData.set('name', areaDraft.name.trim());
    formData.set('sortOrder', areaDraft.sortOrder.trim() || '0');
    if (areaDraft.material.trim()) formData.set('material', areaDraft.material.trim());
    if (areaDraft.color.trim()) formData.set('color', areaDraft.color.trim());
    if (areaDraft.edgeProfile.trim()) formData.set('edgeProfile', areaDraft.edgeProfile.trim());
    if (areaDraft.notes.trim()) formData.set('notes', areaDraft.notes.trim());

    setAreaSaving(true);
    startTransition(async () => {
      try {
        await updateAreaAction(customerId, quoteId, areaId, formData);
        router.refresh();
      } finally {
        setAreaSaving(false);
      }
    });
  }, [areaDraft, areaId, customerId, quoteId, router, startTransition]);

  const savePieceDimensions = useCallback((piece: DrawingPiece, lengthIn: number, widthIn: number) => {
    const formData = new FormData();
    formData.set('name', piece.name ?? '');
    formData.set('lengthIn', String(lengthIn));
    formData.set('widthIn', String(widthIn));
    formData.set('quantity', '1');
    formData.set('sortOrder', String(Math.max(pieces.findIndex((candidate) => candidate.id === piece.id), 0)));

    startTransition(async () => {
      await updateCounterPieceAction(customerId, quoteId, areaId, piece.id, formData);
      markDirty();
      router.refresh();
    });
  }, [areaId, customerId, markDirty, pieces, quoteId, router]);

  const saveEdgeLength = useCallback((mode: 'stay' | 'next') => {
    if (!edgeEditor) return;
    const basePiece = pieces.find((piece) => piece.id === edgeEditor.pieceId);
    if (!basePiece) return;

    const renderedPiece = getRenderedPiece(basePiece);
    const numericValue = Number(edgeEditor.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return;

    const lengthIn = edgeEditor.edge === 'top' || edgeEditor.edge === 'bottom'
      ? numericValue
      : renderedPiece.lengthIn;
    const widthIn = edgeEditor.edge === 'left' || edgeEditor.edge === 'right'
      ? numericValue
      : renderedPiece.widthIn;

    const formData = new FormData();
    formData.set('name', basePiece.name ?? '');
    formData.set('lengthIn', String(lengthIn));
    formData.set('widthIn', String(widthIn));
    formData.set('quantity', '1');
    formData.set('sortOrder', String(Math.max(pieces.findIndex((candidate) => candidate.id === basePiece.id), 0)));

    startTransition(async () => {
      await updateCounterPieceAction(customerId, quoteId, areaId, basePiece.id, formData);
      setPieceOverrides((prev) => ({
        ...prev,
        [basePiece.id]: { lengthIn, widthIn },
      }));
      setEditDraft((prev) => prev && prev.pieceId === basePiece.id ? {
        ...prev,
        lengthIn: String(lengthIn),
        widthIn: String(widthIn),
      } : prev);
      markDirty();

      if (mode === 'next') {
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
    });
  }, [areaId, customerId, edgeEditor, getRenderedPiece, markDirty, pieces, quoteId, router]);

  const saveCornerTreatment = useCallback((mode: 'stay' | 'next') => {
    if (!cornerEditor) return;
    const parsedValue = cornerEditor.value.trim() ? Number(cornerEditor.value) : null;
    const valueIn = Number.isFinite(parsedValue) && parsedValue !== null && parsedValue > 0 ? parsedValue : null;

    setLayout((prev) => {
      const withoutCurrent = prev.corners.filter((item) => (
        item.pieceId !== cornerEditor.pieceId || item.corner !== cornerEditor.corner
      ));

      if (cornerEditor.treatment === 'none') {
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

    if (mode === 'next') {
      const next = nextCorner(cornerEditor.corner);
      const nextSaved = layoutRef.current.corners.find((item) => (
        item.pieceId === cornerEditor.pieceId && item.corner === next
      ));
      setCornerEditor({
        pieceId: cornerEditor.pieceId,
        corner: next,
        treatment: nextSaved?.treatment ?? 'none',
        value: nextSaved?.valueIn !== null && nextSaved?.valueIn !== undefined ? String(nextSaved.valueIn) : '',
      });
      return;
    }

    setCornerEditor(null);
  }, [cornerEditor, markDirty]);

  const saveEdgeTreatment = useCallback((mode: 'stay' | 'next') => {
    if (!edgeTreatmentEditor) return;

    const splashHeightIn = edgeTreatmentEditor.splashHeightIn.trim()
      ? Number(edgeTreatmentEditor.splashHeightIn)
      : null;
    const normalizedSplashHeight = Number.isFinite(splashHeightIn) && splashHeightIn !== null && splashHeightIn > 0
      ? splashHeightIn
      : null;

    const normalizedLabel = edgeTreatmentEditor.label.trim() || null;

    setLayout((prev) => {
      const withoutCurrent = prev.edges.filter((item) => (
        item.pieceId !== edgeTreatmentEditor.pieceId || item.edge !== edgeTreatmentEditor.edge
      ));

      return {
        ...prev,
        edges: [
          ...withoutCurrent,
          {
            pieceId: edgeTreatmentEditor.pieceId,
            edge: edgeTreatmentEditor.edge,
            treatment: edgeTreatmentEditor.treatment,
            splashHeightIn: edgeTreatmentEditor.treatment === 'splash' ? normalizedSplashHeight : null,
            label: edgeTreatmentEditor.treatment === 'additionalFinished' || edgeTreatmentEditor.treatment === 'splash'
              ? normalizedLabel
              : null,
          },
        ],
      };
    });
    markDirty();

    if (mode === 'next') {
      const next = nextEdge(edgeTreatmentEditor.edge);
      const nextSaved = layoutRef.current.edges.find((item) => (
        item.pieceId === edgeTreatmentEditor.pieceId && item.edge === next
      ));
      setEdgeTreatmentEditor({
        pieceId: edgeTreatmentEditor.pieceId,
        edge: next,
        treatment: nextSaved?.treatment ?? 'finished',
        splashHeightIn: nextSaved?.splashHeightIn !== null && nextSaved?.splashHeightIn !== undefined
          ? String(nextSaved.splashHeightIn)
          : '',
        label: nextSaved?.label ?? '',
      });
      return;
    }

    setEdgeTreatmentEditor(null);
  }, [edgeTreatmentEditor, markDirty]);

  const deletePiece = useCallback((pieceId: string) => {
    startTransition(async () => {
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
    });
  }, [areaId, customerId, markDirty, quoteId, router]);

  const rotatePiece = useCallback((pieceId: string, direction: 'left' | 'right') => {
    setLayout((prev) => ({
      ...prev,
      pieces: prev.pieces.map((piece) => piece.pieceId === pieceId
        ? { ...piece, rotation: piece.rotation + (direction === 'left' ? -90 : 90) }
        : piece),
    }));
    setContextMenu(null);
    setEdgeEditor(null);
    setCornerEditor(null);
    setEdgeTreatmentEditor(null);
    markDirty();
  }, [markDirty]);

  const duplicatePiece = useCallback((pieceId: string) => {
    const sourcePiece = pieces.find((piece) => piece.id === pieceId);
    const sourceLayout = layoutRef.current.pieces.find((piece) => piece.pieceId === pieceId);
    if (!sourcePiece || !sourceLayout) return;

    startTransition(async () => {
      const duplicated = await createCounterPieceForCanvasAction(
        customerId,
        quoteId,
        areaId,
        buildPieceFormData(
          sourcePiece.name ? `${sourcePiece.name} Copy` : `Counter ${pieces.length + 1}`,
          sourcePiece.lengthIn,
          sourcePiece.widthIn,
          pieces.length
        )
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
    });
  }, [areaId, buildPieceFormData, customerId, markDirty, pieces, quoteId, router]);

  const handleStageMouseDown = useCallback((e: { target: { getStage: () => unknown } }) => {
    if (!isDraft) return;
    const screenPointer = stageRef.current?.getStage().getPointerPosition();
    const pointer = getPointer();
    if (!pointer || !screenPointer) return;

    setContextMenu(null);
    setSinkContextMenu(null);

    if (tool === 'pan') {
      setPanStart({ pointer: screenPointer, pan });
      return;
    }

    if (tool === 'draw' && activeStep === 1) {
      setSelectedPieceId(null);
      setDrawStart(pointer);
      setDrawPath([pointer]);
      setDrawPreview(buildPreview(pointer, pointer, [pointer]));
      return;
    }

    if (tool === 'pageBreak') {
      setPageBreaks((prev) => [...prev, pointer.y]);
      setTool('draw');
      return;
    }

    if (tool === 'text') {
      setPendingTextAt(pointer);
      setTextDraft('');
      return;
    }

    if (e.target === stageRef.current?.getStage()) {
      setSelectedPieceId(null);
      setSelectedSinkId(null);
    }
  }, [activeStep, buildPreview, getPointer, isDraft, pan, tool]);

  const handleStageMouseMove = useCallback(() => {
    if (panStart && tool === 'pan') {
      const pointer = stageRef.current?.getStage().getPointerPosition();
      if (!pointer) return;
      setPan({
        x: panStart.pan.x + pointer.x - panStart.pointer.x,
        y: panStart.pan.y + pointer.y - panStart.pointer.y,
      });
      return;
    }

    if (!drawStart || tool !== 'draw') return;
    const pointer = getPointer();
    if (!pointer) return;
    setDrawPath((prev) => {
      const last = prev[prev.length - 1];
      const nextPath = !last || Math.hypot(pointer.x - last.x, pointer.y - last.y) >= 8
        ? [...prev, pointer]
        : prev;
      setDrawPreview(buildPreview(drawStart, pointer, nextPath));
      return nextPath;
    });
  }, [buildPreview, drawStart, getPointer, panStart, roundSixteenth, tool]);

  const handleStageMouseUp = useCallback(() => {
    if (panStart) {
      setPanStart(null);
      return;
    }

    if (!drawStart || !drawPreview) return;
    const shouldCreate = drawPreview.lengthIn >= 4;
    if (shouldCreate) addCounterPiece(drawPreview);
    setDrawStart(null);
    setDrawPath([]);
    setDrawPreview(null);
  }, [addCounterPiece, drawPreview, drawStart, panStart, pieceOverrides, pieces, savePieceDimensions]);

  const toolbarItems: Array<{ label: string; action: () => void; active?: boolean }> = [
    { label: tool === 'text' ? 'Cancel Adding Text' : 'Text', action: () => setTool((prev) => prev === 'text' ? 'draw' : 'text'), active: tool === 'text' },
    { label: 'Page Break', action: () => setTool('pageBreak'), active: tool === 'pageBreak' },
    { label: 'Other Counter', action: () => setTool('otherCounter'), active: tool === 'otherCounter' },
    { label: 'Round To Nearest 1/16"', action: () => setRoundSixteenth((prev) => !prev), active: roundSixteenth },
    { label: 'Zoom In', action: () => setZoom((prev) => Math.min(prev + 0.15, 2.25)) },
    { label: 'Zoom Out', action: () => setZoom((prev) => Math.max(prev - 0.15, 0.45)) },
    { label: 'Reset Zoom', action: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
    { label: 'Pan', action: () => setTool((prev) => prev === 'pan' ? 'draw' : 'pan'), active: tool === 'pan' },
  ];
  const activeStepTitle = steps.find((step) => step.id === activeStep)?.title ?? 'Drawing';
  const selectedPiece = selectedPieceId ? pieceMap.get(selectedPieceId) ?? null : null;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-[#f7faf4] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setHelpOpen(true)}>Help</Button>
            <Button size="sm" variant="outline" disabled>Undo</Button>
            <Button size="sm" variant="outline" disabled>Redo</Button>
            <Button size="sm" variant="outline" onClick={() => setRevisionsOpen(true)}>Revisions</Button>
            <Button size="sm" onClick={() => setSaveModalOpen(true)} disabled={!isDraft || saving}>
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
            {latestRevision ? `Revision ${latestRevision.revisionNumber} saved ${formatDate(latestRevision.createdAt)}` : 'No saved revisions yet'}
            {isDirty ? ' • Unsaved changes' : ''}
          </div>
        </div>

        <div className="flex items-stretch bg-[#6ba464] text-white">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={`flex min-h-14 flex-1 items-center justify-center gap-3 border-r border-white/35 px-3 text-left transition ${
                activeStep === step.id ? 'bg-[#2f6b2c]' : 'hover:bg-[#5b9655]'
              }`}
              onClick={() => setActiveStep(step.id)}
            >
              <span className="font-serif text-3xl leading-none">{step.id}</span>
              <span className="text-sm font-semibold leading-tight">{step.shortTitle}</span>
            </button>
          ))}
        </div>

        <div className="flex">
          <div className="min-w-0 flex-1 bg-white">
            {activeStep >= 5 ? (
              <div className="min-h-[560px] p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-[#2f6b2c]">{activeStepTitle}</h4>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Moraware keeps area work and pricing inside the editor. Step 5 starts the area setup, Step 6 finishes pricing.
                    </p>
                  </div>
                  <div className="rounded-md border border-[#c8dec3] bg-white px-3 py-2 text-xs text-muted-foreground">
                    Editing area: <span className="font-semibold text-foreground">{areaDraft.name || area.name}</span>
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
                            onChange={(event) => setAreaDraft((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`area-sort-${areaId}`}>Sort</Label>
                          <Input
                            id={`area-sort-${areaId}`}
                            type="number"
                            value={areaDraft.sortOrder}
                            onChange={(event) => setAreaDraft((prev) => ({ ...prev, sortOrder: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`area-material-${areaId}`}>Material</Label>
                          <Input
                            id={`area-material-${areaId}`}
                            value={areaDraft.material}
                            onChange={(event) => setAreaDraft((prev) => ({ ...prev, material: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`area-color-${areaId}`}>Color</Label>
                          <Input
                            id={`area-color-${areaId}`}
                            value={areaDraft.color}
                            onChange={(event) => setAreaDraft((prev) => ({ ...prev, color: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`area-edge-${areaId}`}>Edge Profile</Label>
                          <Input
                            id={`area-edge-${areaId}`}
                            value={areaDraft.edgeProfile}
                            onChange={(event) => setAreaDraft((prev) => ({ ...prev, edgeProfile: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`area-notes-${areaId}`}>Notes</Label>
                          <Input
                            id={`area-notes-${areaId}`}
                            value={areaDraft.notes}
                            onChange={(event) => setAreaDraft((prev) => ({ ...prev, notes: event.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button onClick={() => void saveAreaDetails()} disabled={areaSaving || !isDraft}>
                          {areaSaving ? 'Saving...' : 'Save Area'}
                        </Button>
                        <Button variant="outline" onClick={() => setActiveStep(6)} disabled={!isDraft}>
                          Next: Price Details
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#c8dec3] bg-[#f3f8ef] p-4">
                      <p className="text-sm font-semibold text-[#2f6b2c]">Slabs & Layout</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        This is the Moraware Step 5 home for area ordering, slab planning, and alternate color options.
                      </p>
                      <div className="mt-4 rounded-md border border-dashed border-[#b9d3b3] bg-white p-3 text-sm text-muted-foreground">
                        Next slice: surface slab rows and color-option reordering here, then bring the quote pricing table into Step 6.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-lg border border-[#c8dec3] bg-white p-4">
                      <p className="text-sm font-semibold text-[#2f6b2c]">Price Details</p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Price List</dt>
                          <dd>{hasPriceList ? 'Assigned' : 'None'}</dd>
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
                        <form action={generatePricingAction.bind(null, customerId, quoteId, areaId)}>
                          <Button type="submit" size="sm" disabled={!isDraft || !hasPriceList}>
                            Generate Pricing
                          </Button>
                        </form>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Step 6 keeps pricing in the editor and surfaces the generated lines by area.
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#c8dec3] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#2f6b2c]">Generated Lines</p>
                        <span className="text-xs text-muted-foreground">
                          {pricingLines.length} line{pricingLines.length === 1 ? '' : 's'}
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
                                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                                  No generated pricing lines yet.
                                </TableCell>
                              </TableRow>
                            ) : pricingLines.map((line) => (
                              <TableRow key={line.id}>
                                <TableCell>{line.category.replaceAll('_', ' ')}</TableCell>
                                <TableCell>{line.label}</TableCell>
                                <TableCell>{line.quantity.toFixed(3)}</TableCell>
                                <TableCell>{line.unit}</TableCell>
                                <TableCell>${((line.overridePriceCents ?? line.lineTotalCents) / 100).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Stage
                  ref={stageRef}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  style={{ cursor: toolCursor(tool, isDraft) }}
                  onMouseDown={handleStageMouseDown}
                  onMouseMove={handleStageMouseMove}
                  onMouseUp={handleStageMouseUp}
                >
                  <Layer>
                    <Group x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}>
                      <Rect width={CANVAS_W / zoom} height={CANVAS_H / zoom} fill="#ffffff" />

                      {pieces.length === 0 && !drawPreview ? (
                        <Text
                          x={32}
                          y={34}
                          width={420}
                          text={isDraft ? 'Drag with the pencil to draw the first counter piece. Depth locks to 25 1/2".' : 'No drawing has been created yet.'}
                          fontSize={14}
                          fill="#6b7280"
                        />
                      ) : null}

                      {pageBreaks.map((y, index) => (
                        <Group key={`${y}-${index}`}>
                          <Line points={[20, y, CANVAS_W - 40, y]} stroke="#9ca3af" dash={[12, 8]} strokeWidth={1} />
                          <Text x={28} y={y + 8} text="Page Break" fontSize={12} fill="#6b7280" />
                        </Group>
                      ))}

                      {layout.pieces.map((pos) => {
                        const basePiece = pieceMap.get(pos.pieceId);
                        if (!basePiece) return null;
                        if (pos.groupId) {
                          const groupItems = layout.pieces.filter((item) => item.groupId === pos.groupId && pieceMap.has(item.pieceId));
                          if (groupItems[0]?.pieceId !== pos.pieceId) return null;

                          const originX = Math.min(...groupItems.map((item) => item.x));
                          const originY = Math.min(...groupItems.map((item) => item.y));
                          const isGroupSelected = groupItems.some((item) => selectedPieceId === item.pieceId || editDraft?.pieceId === item.pieceId);

                          return (
                            <Group
                              key={pos.groupId}
                              x={originX}
                              y={originY}
                              draggable={isDraft && tool !== 'pan'}
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
                                const pointer = stageRef.current?.getStage().getPointerPosition();
                                setSelectedPieceId(basePiece.id);
                                if (pointer) setContextMenu({ pieceId: basePiece.id, x: pointer.x + 12, y: pointer.y + 12 });
                              }}
                              onDragEnd={(event) => handleGroupDragEnd(pos.groupId as string, originX, originY, event.target.x(), event.target.y())}
                            >
                              {groupItems.map((groupPos, index) => {
                                const groupPiece = pieceMap.get(groupPos.pieceId);
                                if (!groupPiece) return null;
                                const renderedGroupPiece = getRenderedPiece(groupPiece);
                                const groupW = renderedGroupPiece.lengthIn * SCALE;
                                const groupH = renderedGroupPiece.widthIn * SCALE;
                                const localX = groupPos.x - originX;
                                const localY = groupPos.y - originY;

                                return (
                                  <Group key={groupPos.pieceId} x={localX} y={localY} rotation={groupPos.rotation}>
                                    <Rect
                                      width={groupW}
                                      height={groupH}
                                      fill={PIECE_FILL}
                                      stroke={isGroupSelected ? SELECT_STROKE : PIECE_STROKE}
                                      strokeWidth={isGroupSelected ? 2 : 1}
                                      cornerRadius={2}
                                    />
                                    <Text
                                      text={index === 0 ? (groupPiece.name ?? 'L Counter') : ''}
                                      x={6}
                                      y={6}
                                      fontSize={11}
                                      fill="#2f6b2c"
                                      fontStyle="bold"
                                    />
                                    <Text
                                      text={formatInches(renderedGroupPiece.lengthIn)}
                                      x={groupW / 2 - 24}
                                      y={index === 0 ? -24 : groupH + 8}
                                      fontSize={11}
                                      fill="#4b5563"
                                    />
                                    <Text
                                      text={formatInches(renderedGroupPiece.widthIn)}
                                      x={groupW + 6}
                                      y={groupH / 2 - 6}
                                      fontSize={11}
                                      fill="#4b5563"
                                    />
                                  </Group>
                                );
                              })}
                              {isGroupSelected ? (
                                <Text text="90 deg" x={8} y={8} fontSize={10} fill="#6b7280" />
                              ) : null}
                            </Group>
                          );
                        }
                        const piece = getRenderedPiece(basePiece);
                        const w = piece.lengthIn * SCALE;
                        const h = piece.widthIn * SCALE;
                        const lShape = isLShape(pos.shape) ? lShapeGeometry(piece, pos.shape) : null;
                        const zShape = isZShape(pos.shape) ? zShapeGeometry(piece, pos.shape) : null;
                        const chainShape = isChainShape(pos.shape) ? chainShapeGeometry(pos.shape) : null;
                        const isSelected = selectedPieceId === pos.pieceId || editDraft?.pieceId === pos.pieceId;
                        const pieceSinks = layout.sinks.filter((s) => s.pieceId === pos.pieceId && sinkMap.get(s.sinkId) !== undefined);
                        const cornerTreatments = new Map(
                          layout.corners
                            .filter((corner) => corner.pieceId === pos.pieceId)
                            .map((corner) => [corner.corner, corner] as const)
                        );
                        const edgeTreatments = new Map(
                          layout.edges
                            .filter((edge) => edge.pieceId === pos.pieceId)
                            .map((edge) => [edge.edge, edge] as const)
                        );

                        return (
                          <Group
                            key={pos.pieceId}
                            x={pos.x}
                            y={pos.y}
                            rotation={pos.rotation}
                            draggable={isDraft && tool !== 'pan'}
                            onMouseDown={(event) => {
                              event.cancelBubble = true;
                              if (activeStep === 4 && sinkPaletteId) {
                                placeSinkOnPiece(basePiece.id, sinkPaletteId);
                              }
                            }}
                            onClick={(event) => {
                              event.cancelBubble = true;
                              if (activeStep === 4 && sinkPaletteId) {
                                placeSinkOnPiece(basePiece.id, sinkPaletteId);
                                return;
                              }
                              selectPiece(basePiece);
                            }}
                            onContextMenu={(event) => {
                              event.cancelBubble = true;
                              event.evt.preventDefault();
                              const pointer = stageRef.current?.getStage().getPointerPosition();
                              setSelectedPieceId(basePiece.id);
                              if (pointer) setContextMenu({ pieceId: basePiece.id, x: pointer.x + 12, y: pointer.y + 12 });
                            }}
                            onDragEnd={(event) => handleDragEnd(pos.pieceId, event.target.x(), event.target.y())}
                          >
                            {chainShape ? (
                              <Line
                                points={chainShape.outline}
                                closed
                                fill={PIECE_FILL}
                                stroke={isSelected ? SELECT_STROKE : PIECE_STROKE}
                                strokeWidth={isSelected ? 2 : 1}
                              />
                            ) : zShape ? (
                              <Line
                                points={zShape.outline}
                                closed
                                fill={PIECE_FILL}
                                stroke={isSelected ? SELECT_STROKE : PIECE_STROKE}
                                strokeWidth={isSelected ? 2 : 1}
                              />
                            ) : lShape ? (
                              <Line
                                points={lShape.outline}
                                closed
                                fill={PIECE_FILL}
                                stroke={isSelected ? SELECT_STROKE : PIECE_STROKE}
                                strokeWidth={isSelected ? 2 : 1}
                              />
                            ) : (
                              <Rect
                                width={w}
                                height={h}
                                fill={PIECE_FILL}
                                stroke={isSelected ? SELECT_STROKE : PIECE_STROKE}
                                strokeWidth={isSelected ? 2 : 1}
                                cornerRadius={2}
                              />
                            )}
                            {!chainShape ? (
                              <>
                                <Line points={[0, -10, w, -10]} stroke="#d1d5db" strokeWidth={1} />
                                <Line points={[0, -15, 0, -5]} stroke="#d1d5db" strokeWidth={1} />
                                <Line points={[w, -15, w, -5]} stroke="#d1d5db" strokeWidth={1} />
                                <Line points={[-10, 0, -10, h]} stroke="#d1d5db" strokeWidth={1} />
                                <Line points={[-15, 0, -5, 0]} stroke="#d1d5db" strokeWidth={1} />
                                <Line points={[-15, h, -5, h]} stroke="#d1d5db" strokeWidth={1} />
                                <Text
                                  text={formatInches(piece.lengthIn)}
                                  x={w / 2 - 24}
                                  y={-24}
                                  fontSize={11}
                                  fill="#4b5563"
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    openEdgeEditor(basePiece, 'top');
                                  }}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                  }}
                                />
                                <Text
                                  text={formatInches(piece.lengthIn)}
                                  x={w / 2 - 24}
                                  y={h + 8}
                                  fontSize={11}
                                  fill="#4b5563"
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    openEdgeEditor(basePiece, 'bottom');
                                  }}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                  }}
                                />
                                <Text
                                  text={formatInches(piece.widthIn)}
                                  x={-48}
                                  y={h / 2 - 6}
                                  fontSize={11}
                                  fill="#4b5563"
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    openEdgeEditor(basePiece, 'left');
                                  }}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                  }}
                                />
                                <Text
                                  text={formatInches(piece.widthIn)}
                                  x={w + 6}
                                  y={h / 2 - 6}
                                  fontSize={11}
                                  fill="#4b5563"
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    openEdgeEditor(basePiece, 'right');
                                  }}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                  }}
                                />
                              </>
                            ) : null}
                            {lShape && isLShape(pos.shape) ? (
                              <>
                                <Text
                                  text={formatInches(pos.shape.legLengthIn)}
                                  x={lShape.legX <= 0 ? lShape.legX - 52 : lShape.legX + lShape.legW + 6}
                                  y={lShape.legY + lShape.legH / 2 - 6}
                                  fontSize={11}
                                  fill="#4b5563"
                                />
                                <Text
                                  text={formatInches(pos.shape.legWidthIn)}
                                  x={lShape.legX + lShape.legW / 2 - 18}
                                  y={lShape.legY < 0 ? lShape.legY - 18 : lShape.legY + lShape.legH + 8}
                                  fontSize={11}
                                  fill="#4b5563"
                                />
                              </>
                            ) : null}
                            {zShape && isZShape(pos.shape) ? (
                              <>
                                <Text
                                  text={formatInches(pos.shape.legLengthIn)}
                                  x={pos.shape.legX <= 0 ? pos.shape.legX - 52 : pos.shape.legX + zShape.legW + 6}
                                  y={pos.shape.legY + zShape.legH / 2 - 6}
                                  fontSize={11}
                                  fill="#4b5563"
                                />
                                <Text
                                  text={formatInches(pos.shape.tailLengthIn)}
                                  x={pos.shape.tailX + zShape.tailW / 2 - 24}
                                  y={pos.shape.tailY < 0 ? pos.shape.tailY - 18 : pos.shape.tailY + zShape.tailH + 8}
                                  fontSize={11}
                                  fill="#4b5563"
                                />
                              </>
                            ) : null}
                            {chainShape && isChainShape(pos.shape) ? (
                              <>
                                {pos.shape.segments.map((segment, index) => (
                                  <Text
                                    key={`${segment.orientation}-${index}`}
                                    text={formatInches(segment.orientation === 'horizontal' ? segment.lengthIn : segment.widthIn)}
                                    x={segment.x + segment.w / 2 - 24}
                                    y={segment.y + (segment.orientation === 'horizontal' ? segment.h + 8 : segment.h / 2 - 6)}
                                    fontSize={11}
                                    fill="#4b5563"
                                  />
                                ))}
                              </>
                            ) : null}
                            {isSelected ? (
                              <>
                                <Text text="90 deg" x={6} y={h - 18} fontSize={10} fill="#6b7280" />
                                <Text text="90 deg" x={w - 42} y={h - 18} fontSize={10} fill="#6b7280" />
                                <Text text="90 deg" x={6} y={24} fontSize={10} fill="#6b7280" />
                                <Text text="90 deg" x={w - 42} y={24} fontSize={10} fill="#6b7280" />
                                {lShape ? (
                                  <Text
                                    text="90 deg"
                                    x={lShape.legX <= 0 ? lShape.legX + lShape.legW + 4 : lShape.legX - 42}
                                    y={lShape.legY < 0 ? 6 : h + 6}
                                    fontSize={10}
                                    fill="#6b7280"
                                  />
                                ) : null}
                                {zShape && isZShape(pos.shape) ? (
                                  <Text
                                    text="90 deg"
                                    x={pos.shape.tailX + 6}
                                    y={pos.shape.tailY + 6}
                                    fontSize={10}
                                    fill="#6b7280"
                                  />
                                ) : null}
                              </>
                            ) : null}
                            <Text
                              text={piece.name ?? 'Counter'}
                              x={6}
                              y={6}
                              fontSize={11}
                              fill="#2f6b2c"
                              fontStyle="bold"
                            />
                            {activeStep === 2 ? (
                              <>
                                {([
                                  { corner: 'topLeft' as const, x: 6, y: 6 },
                                  { corner: 'topRight' as const, x: w - 44, y: 6 },
                                  { corner: 'bottomRight' as const, x: w - 44, y: h - 18 },
                                  { corner: 'bottomLeft' as const, x: 6, y: h - 18 },
                                ]).map((marker) => {
                                  const treatment = cornerTreatments.get(marker.corner)?.treatment ?? 'none';

                                  return (
                                    <Text
                                      key={marker.corner}
                                      text={treatmentMarker(treatment)}
                                      x={marker.x}
                                      y={marker.y}
                                      fontSize={10}
                                      fill={treatment === 'none' ? '#2f6b2c' : '#b45309'}
                                      fontStyle="bold"
                                      onClick={(event) => {
                                        event.cancelBubble = true;
                                        openCornerEditor(basePiece.id, marker.corner);
                                      }}
                                      onMouseDown={(event) => {
                                        event.cancelBubble = true;
                                      }}
                                    />
                                  );
                                })}
                              </>
                            ) : null}
                            {activeStep === 3 ? (
                              <>
                                {([
                                  { edge: 'top' as const, x: w / 2 - 14, y: 6 },
                                  { edge: 'right' as const, x: w - 18, y: h / 2 - 6 },
                                  { edge: 'bottom' as const, x: w / 2 - 14, y: h - 18 },
                                  { edge: 'left' as const, x: 6, y: h / 2 - 6 },
                                ]).map((marker) => {
                                  const treatment = edgeTreatments.get(marker.edge);

                                  return (
                                    <Text
                                      key={marker.edge}
                                      text={edgeMarker(treatment)}
                                      x={marker.x}
                                      y={marker.y}
                                      fontSize={10}
                                      fill={treatment?.treatment === 'unfinished' ? '#6b7280' : '#2f6b2c'}
                                      fontStyle="bold"
                                      onClick={(event) => {
                                        event.cancelBubble = true;
                                        openEdgeTreatmentEditor(basePiece.id, marker.edge);
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
                              const sx = sinkPos.x !== 0 ? sinkPos.x : (w - sw) / 2;
                              const sy = sinkPos.y !== 0 ? sinkPos.y : (h - sh) / 2;
                              const sinkSelected = selectedSinkId === sinkPos.sinkId;
                              return (
                                <Group
                                  key={sinkPos.sinkId}
                                  x={sx}
                                  y={sy}
                                  draggable={isDraft && activeStep === 4}
                                  onMouseDown={(event) => {
                                    event.cancelBubble = true;
                                    const pointer = stageRef.current?.getStage().getPointerPosition();
                                    setSelectedSinkId(sinkPos.sinkId);
                                    setSelectedPieceId(pos.pieceId);
                                    setSinkPaletteId(null);
                                    setContextMenu(null);
                                    if (pointer) {
                                      setSinkContextMenu({ sinkId: sinkPos.sinkId, x: pointer.x + 12, y: pointer.y + 12 });
                                    }
                                  }}
                                  onClick={(event) => {
                                    event.cancelBubble = true;
                                    const pointer = stageRef.current?.getStage().getPointerPosition();
                                    setSelectedSinkId(sinkPos.sinkId);
                                    setSelectedPieceId(pos.pieceId);
                                    setSinkPaletteId(null);
                                    setContextMenu(null);
                                    if (pointer) {
                                      setSinkContextMenu({ sinkId: sinkPos.sinkId, x: pointer.x + 12, y: pointer.y + 12 });
                                    }
                                  }}
                                  onDragEnd={(event) => handleSinkDragEnd(sinkPos.sinkId, event.target.x(), event.target.y())}
                                >
                                  <Rect
                                    width={sw}
                                    height={sh}
                                    fill={SINK_COLOR}
                                    opacity={0.6}
                                    cornerRadius={3}
                                    stroke={sinkSelected ? SELECT_STROKE : '#1e3a8a'}
                                    strokeWidth={sinkSelected ? 2 : 1}
                                  />
                                  <Text text={sink.model ?? 'Sink'} x={3} y={sh / 2 - 5} fontSize={9} fill="#1e3a8a" />
                                </Group>
                              );
                            })}
                          </Group>
                        );
                      })}

                      {drawPreview ? (
                        <Group x={drawPreview.x} y={drawPreview.y}>
                          {drawPreview.segments && drawPreview.segments.length > 0 ? (
                            <Line
                              points={rectUnionOutline(drawPreview.segments.map((segment) => ({
                                x: segment.x - drawPreview.x,
                                y: segment.y - drawPreview.y,
                                w: segment.w,
                                h: segment.h,
                              })))}
                              closed
                              fill={PIECE_FILL}
                              opacity={0.8}
                              stroke={GUIDE_COLOR}
                              strokeWidth={2}
                            />
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
                          <Line points={[0, -10, drawPreview.w, -10]} stroke="#d1d5db" strokeWidth={1} />
                          <Line points={[-10, 0, -10, drawPreview.h]} stroke="#d1d5db" strokeWidth={1} />
                          <Text text={formatInches(drawPreview.lengthIn)} x={drawPreview.w / 2 - 28} y={-24} fontSize={12} fill="#4b5563" />
                          <Text text={formatInches(drawPreview.widthIn)} x={-50} y={drawPreview.h / 2 - 6} fontSize={12} fill="#4b5563" />
                          {!drawPreview.segments && drawPreview.leg ? (
                            <Group x={drawPreview.leg.x - drawPreview.x} y={drawPreview.leg.y - drawPreview.y}>
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
                            <Group x={drawPreview.tail.x - drawPreview.x} y={drawPreview.tail.y - drawPreview.y}>
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
                              text={formatInches(segment.orientation === 'horizontal' ? segment.lengthIn : segment.widthIn)}
                              x={segment.x - drawPreview.x + segment.w / 2 - 28}
                              y={segment.y - drawPreview.y + (segment.orientation === 'horizontal' ? segment.h + 8 : segment.h / 2 - 6)}
                              fontSize={12}
                              fill="#4b5563"
                            />
                          ))}
                        </Group>
                      ) : null}

                      {textNotes.map((note) => (
                        <Text key={note.id} x={note.x} y={note.y} text={note.text} fontSize={14} fill="#374151" />
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
                      onClick={() => rotatePiece(contextMenu.pieceId, 'left')}
                    >
                      Rotate Counter Left
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f3f8ef]"
                      onClick={() => rotatePiece(contextMenu.pieceId, 'right')}
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

                {sinkContextMenu && selectedSinkId && activeStep === 4 && isDraft ? (
                  <div
                    className="absolute z-20 min-w-44 rounded-md border border-[#c8dec3] bg-white p-2 shadow-xl"
                    style={{ left: sinkContextMenu.x, top: sinkContextMenu.y }}
                  >
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f3f8ef]"
                      onClick={() => removeSinkFromCounter(sinkContextMenu.sinkId)}
                    >
                      Remove From Counter
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() => deleteSinkFromCanvas(sinkContextMenu.sinkId)}
                    >
                      Delete Sink
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <aside className="w-40 space-y-2 border-l bg-[#f5f5f5] p-2">
            {toolbarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`w-full rounded px-3 py-3 text-left text-sm font-semibold text-white transition ${
                  item.active ? 'bg-[#2f6b2c]' : 'bg-[#5a9852] hover:bg-[#4f8849]'
                }`}
                onClick={item.action}
                disabled={!isDraft && ['Text', 'Page Break', 'Other Counter'].includes(item.label)}
              >
                {item.label}
              </button>
            ))}
          </aside>
        </div>
      </div>

      {tool === 'otherCounter' ? (
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="font-semibold text-[#2f6b2c]">Add Counter</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Moraware opens a modal here for counter name, size, splash, edge, curves, sinks, and cutouts. This panel marks the workflow hook for that same control.
          </p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => setTool('draw')}>Done</Button>
        </div>
      ) : null}

      {activeStep === 4 ? (
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSinkCreateOpen(true)}>
              Add Sink
            </Button>
            {sinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sink cutouts exist for this area yet.</p>
            ) : (
              sinks.map((sink) => {
                const placement = layout.sinks.find((item) => item.sinkId === sink.id);
                const placed = placement?.pieceId !== null && placement?.pieceId !== undefined;

                return (
                  <Button
                    key={sink.id}
                    size="sm"
                    variant={sinkPaletteId === sink.id ? 'default' : 'outline'}
                    onClick={() => {
                      setSinkPaletteId((prev) => prev === sink.id ? null : sink.id);
                      setSelectedSinkId(sink.id);
                      setSinkContextMenu(null);
                    }}
                  >
                    {sink.model ?? 'Sink'}{placed ? ' Placed' : ''}
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
                Change the size and depth for the selected piece, or use the on-piece menu for rotate, duplicate, and delete.
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
                setTool('draw');
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
                onChange={(event) => setEditDraft((prev) => prev ? { ...prev, name: event.target.value } : prev)}
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
                onChange={(event) => setEditDraft((prev) => prev ? { ...prev, lengthIn: event.target.value } : prev)}
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
                onChange={(event) => setEditDraft((prev) => prev ? { ...prev, widthIn: event.target.value } : prev)}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={savePieceEdit} disabled={isPending}>Save Piece</Button>
            <Button size="sm" variant="outline" onClick={() => deletePiece(editDraft.pieceId)} disabled={isPending}>Delete Piece</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditDraft((prev) => prev ? { ...prev, widthIn: String(STANDARD_DEPTH_IN) } : prev);
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
                    { id: crypto.randomUUID(), x: pendingTextAt.x, y: pendingTextAt.y, text: textDraft.trim() },
                  ]);
                }
                setPendingTextAt(null);
                setTextDraft('');
                setTool('draw');
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPendingTextAt(null)}>Cancel</Button>
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
          {isPending ? 'Updating drawing...' : 'Drag with the pencil to create a 25 1/2" deep counter. Use on-piece controls for rotate, duplicate, and delete.'}
        </p>
      </div>

      <Modal open={helpOpen} title="CounterGo Help" onClose={() => setHelpOpen(false)}>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Use the step tabs to move through the Moraware workflow in order.</p>
          <p>Drag with the pencil in Counter Dimensions to draw new counter pieces. Click a piece to manage it directly from the drawing.</p>
          <p>Revisions stores saved drawing states so you can revert to an earlier layout when needed.</p>
        </div>
      </Modal>

      <Modal open={saveModalOpen} title="Save Quote" onClose={() => setSaveModalOpen(false)}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`drawing-notes-${areaId}`}>Notes about this revision:</Label>
            <Input
              id={`drawing-notes-${areaId}`}
              value={saveNotes}
              onChange={(event) => setSaveNotes(event.target.value)}
              placeholder="Describe what changed in this revision."
              maxLength={500}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void persistDrawing('continue')} disabled={saving || !isDraft}>
              {saving ? 'Saving...' : 'Save & Continue'}
            </Button>
            <Button variant="outline" onClick={() => void persistDrawing('save')} disabled={saving || !isDraft}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={revisionsOpen} title="Revert to Quote Revision" onClose={() => setRevisionsOpen(false)}>
        <div className="space-y-4">
          {revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drawing revisions have been saved yet.</p>
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
                    <TableCell>{revision.createdByUserId ?? '-'}</TableCell>
                    <TableCell>{revision.notes ?? '-'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!isDraft || saving || latestRevision?.id === revision.id}
                        onClick={() => {
                          startTransition(async () => {
                            await revertDrawingRevisionAction(customerId, quoteId, areaId, revision.id);
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

      <Modal open={exitConfirmOpen} title="Unsaved Changes" onClose={() => setExitConfirmOpen(false)}>
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
            <Button onClick={() => setExitConfirmOpen(false)}>Keep Editing</Button>
          </div>
        </div>
      </Modal>

      <Modal open={cornerEditor !== null} title={`Edit Corner - ${cornerEditor ? treatmentLabel(cornerEditor.treatment) : 'None'}`} onClose={() => setCornerEditor(null)}>
        {cornerEditor ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#2f6b2c]">{cornerLabel(cornerEditor.corner)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['radius', 'clip', 'bumpOut', 'notch', 'none'] as CornerTreatment[]).map((treatment) => (
                  <Button
                    key={treatment}
                    type="button"
                    size="sm"
                    variant={cornerEditor.treatment === treatment ? 'default' : 'outline'}
                    onClick={() => setCornerEditor((prev) => prev ? { ...prev, treatment } : prev)}
                  >
                    {treatmentLabel(treatment)}
                  </Button>
                ))}
              </div>
            </div>
            {cornerEditor.treatment !== 'none' ? (
              <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor={`corner-value-${areaId}`}>
                    {cornerEditor.treatment === 'radius' ? 'Radius' : 'Size'}
                  </Label>
                  <Input
                    id={`corner-value-${areaId}`}
                    type="number"
                    min="0.0625"
                    step="0.0625"
                    value={cornerEditor.value}
                    onChange={(event) => setCornerEditor((prev) => prev ? { ...prev, value: event.target.value } : prev)}
                  />
                </div>
                <div className="rounded border border-[#c8dec3] bg-[#f3f8ef] p-3">
                  <p className="text-sm font-semibold text-[#2f6b2c]">{treatmentLabel(cornerEditor.treatment)}</p>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveCornerTreatment('stay')} disabled={!isDraft}>Save</Button>
              <Button variant="outline" onClick={() => saveCornerTreatment('next')} disabled={!isDraft}>
                Save & Next Corner
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={edgeEditor !== null} title="Edge Length" onClose={() => setEdgeEditor(null)}>
        {edgeEditor ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor={`edge-length-${areaId}`}>Length:</Label>
              <Input
                id={`edge-length-${areaId}`}
                type="number"
                min="0.0625"
                step="0.0625"
                value={edgeEditor.value}
                className="w-28"
                onChange={(event) => setEdgeEditor((prev) => prev ? { ...prev, value: event.target.value } : prev)}
              />
              <span className="text-sm text-muted-foreground">&quot;</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => saveEdgeLength('next')} disabled={isPending || !isDraft}>
                Save & Next Edge
              </Button>
              <Button onClick={() => saveEdgeLength('stay')} disabled={isPending || !isDraft}>Save</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={edgeTreatmentEditor !== null}
        title={edgeTreatmentEditor ? edgeTreatmentLabel(edgeTreatmentEditor.treatment) : 'Edge Treatment'}
        onClose={() => setEdgeTreatmentEditor(null)}
      >
        {edgeTreatmentEditor ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#2f6b2c]">{edgeLabel(edgeTreatmentEditor.edge)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  { treatment: 'splash' as const, label: '3" Splash', splashHeightIn: '3' },
                  { treatment: 'splash' as const, label: '4" Splash', splashHeightIn: '4' },
                  { treatment: 'splash' as const, label: '5" Splash', splashHeightIn: '5' },
                  { treatment: 'mitered' as const, label: 'Mitered Edge' },
                  { treatment: 'waterfall' as const, label: 'Waterfall' },
                  { treatment: 'finished' as const, label: 'Finished Edge' },
                  { treatment: 'appliance' as const, label: 'Appliance Edge' },
                  { treatment: 'unfinished' as const, label: 'Unfinished Edge' },
                  { treatment: 'additionalFinished' as const, label: 'Additional Finished Edge' },
                ]).map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    size="sm"
                    variant={edgeTreatmentEditor.treatment === option.treatment
                      && (!('splashHeightIn' in option) || edgeTreatmentEditor.splashHeightIn === option.splashHeightIn)
                      ? 'default'
                      : 'outline'}
                    onClick={() => setEdgeTreatmentEditor((prev) => prev ? {
                      ...prev,
                      treatment: option.treatment,
                      splashHeightIn: 'splashHeightIn' in option ? option.splashHeightIn : prev.splashHeightIn,
                      label: option.treatment === 'additionalFinished'
                        ? (prev.label || 'F1')
                        : option.treatment === 'splash'
                          ? (prev.label || '')
                          : '',
                    } : prev)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            {edgeTreatmentEditor.treatment === 'splash' ? (
              <div className="space-y-2">
                <Label htmlFor={`edge-splash-${areaId}`}>Splash Height</Label>
                <Input
                  id={`edge-splash-${areaId}`}
                  type="number"
                  min="0.0625"
                  step="0.0625"
                  value={edgeTreatmentEditor.splashHeightIn}
                  onChange={(event) => setEdgeTreatmentEditor((prev) => prev ? { ...prev, splashHeightIn: event.target.value } : prev)}
                />
              </div>
            ) : null}
            {edgeTreatmentEditor.treatment === 'additionalFinished' ? (
              <div className="space-y-2">
                <Label htmlFor={`edge-label-${areaId}`}>Marker Label</Label>
                <Input
                  id={`edge-label-${areaId}`}
                  value={edgeTreatmentEditor.label}
                  onChange={(event) => setEdgeTreatmentEditor((prev) => prev ? { ...prev, label: event.target.value } : prev)}
                  maxLength={8}
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveEdgeTreatment('stay')} disabled={!isDraft}>Save</Button>
              <Button variant="outline" onClick={() => saveEdgeTreatment('next')} disabled={!isDraft}>
                Save & Next Edge
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={sinkCreateOpen} title="Add Sink" onClose={() => setSinkCreateOpen(false)}>
        <form action={createSinkFromCanvas} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`sink-model-${areaId}`}>Model</Label>
              <Input id={`sink-model-${areaId}`} name="model" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-quantity-${areaId}`}>Qty</Label>
              <Input id={`sink-quantity-${areaId}`} name="quantity" type="number" min="1" step="1" defaultValue="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-type-${areaId}`}>Sink Type</Label>
              <select id={`sink-type-${areaId}`} name="sinkType" defaultValue="undermount" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
                {sinkTypeOptions.map((option) => (
                  <option key={option} value={option}>{option.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-shape-${areaId}`}>Shape</Label>
              <select id={`sink-shape-${areaId}`} name="shape" defaultValue="rectangle" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
                {sinkShapeOptions.map((option) => (
                  <option key={option} value={option}>{option.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-length-${areaId}`}>Cutout Length In</Label>
              <Input id={`sink-length-${areaId}`} name="cutoutLengthIn" type="number" min="0.001" step="0.001" defaultValue="30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-width-${areaId}`}>Cutout Width In</Label>
              <Input id={`sink-width-${areaId}`} name="cutoutWidthIn" type="number" min="0.001" step="0.001" defaultValue="18" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-holes-${areaId}`}>Faucet Holes</Label>
              <Input id={`sink-holes-${areaId}`} name="faucetHoleCount" type="number" min="0" step="1" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`sink-centerline-${areaId}`}>Centerline</Label>
              <select id={`sink-centerline-${areaId}`} name="centerline" defaultValue="none" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
                {sinkCenterlineOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <input type="hidden" name="sortOrder" value={String(sinks.length)} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>Add Sink</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
