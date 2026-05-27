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

export type CanvasPieceShape = CanvasLShapeLayout | CanvasZShapeLayout | CanvasChainShapeLayout;

export interface CanvasPieceLayout {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
  groupId?: string | null | undefined;
  shape?: CanvasPieceShape | null | undefined;
}

export interface CanvasSinkLayout {
  sinkId: string;
  pieceId: string | null;
  x: number;
  y: number;
  rotation: number;
}

export type CanvasCornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
export type CanvasCornerTreatment = 'none' | 'radius' | 'clip' | 'bumpOut' | 'notch';
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
  kind: 'cabinet' | 'wall';
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
