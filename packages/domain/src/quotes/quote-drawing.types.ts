export interface CanvasLShapeLayout {
  type: 'l';
  legX: number;
  legY: number;
  legWidthIn: number;
  legLengthIn: number;
}

export interface CanvasEdgeLayout {
  pieceId: string;
  edge: 'top' | 'right' | 'bottom' | 'left';
  treatment: CanvasEdgeTreatment;
  splashHeightIn: number | null;
  label: string | null;
  color?: string | undefined;
}

export interface CanvasPaintedEdgeLayout {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  color: string;
}

export interface CanvasZShapeLayout {
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

export interface CanvasChainShapeSegment {
  x: number;
  y: number;
  w: number;
  h: number;
  lengthIn: number;
  widthIn: number;
  orientation: 'horizontal' | 'vertical';
}

export interface CanvasChainShapeLayout {
  type: 'chain';
  segments: CanvasChainShapeSegment[];
}

// Canonical outline shape (ADR 0006): ordered vertices in inches. Added
// alongside chain/l/z so new drawings can persist as true polygons (including
// angled edges) while stored chain/l/z revisions keep loading via converters.
export interface CanvasPolygonShapeLayout {
  type: 'polygon';
  vertices: Array<{ x: number; y: number }>;
}

export type CanvasPieceShape =
  | CanvasLShapeLayout
  | CanvasZShapeLayout
  | CanvasChainShapeLayout
  | CanvasPolygonShapeLayout;

export interface CanvasPieceLayout {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
  kind?: 'countertop' | 'backsplash' | undefined;
  groupId?: string | null | undefined;
  shape?: CanvasPieceShape | null | undefined;
}

export interface CanvasSinkLayout {
  sinkId: string;
  pieceId: string | null;
  x: number;
  y: number;
  rotation: number;
  quantity?: number | undefined;
  faucetHoleCount?: number | undefined;
}

export type CanvasCornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
export type CanvasCornerTreatment = 'none' | 'radius' | 'clip';
export type CanvasEdgeTreatment =
  | 'finished'
  | 'appliance'
  | 'mitered'
  | 'waterfall'
  | 'splash'
  | 'unfinished'
  | 'additionalFinished';

export interface CanvasCornerLayout {
  pieceId: string;
  corner: CanvasCornerKey;
  treatment: CanvasCornerTreatment;
  valueIn: number | null;
}

export interface CanvasReferenceLineLayout {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  kind: 'cabinet' | 'wall' | 'centerline' | 'dimension' | 'segment';
  color: string;
  dash?: boolean | undefined;
}

export interface CanvasDeletedLineLayout {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
}

export interface CanvasLayout {
  pieces: CanvasPieceLayout[];
  sinks: CanvasSinkLayout[];
  corners: CanvasCornerLayout[];
  edges: CanvasEdgeLayout[];
  paintedEdges: CanvasPaintedEdgeLayout[];
  referenceLines: CanvasReferenceLineLayout[];
  deletedLines: CanvasDeletedLineLayout[];
}

export interface DrawingRevision {
  id: string;
  quoteAreaId: string;
  revisionNumber: number;
  layout: CanvasLayout;
  createdAt: string;
  createdByUserId: string | null;
  notes: string | null;
}

export interface SaveDrawingRevisionInput {
  actorUserId: string;
  layout: CanvasLayout;
  notes?: string | null;
}
