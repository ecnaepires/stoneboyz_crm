export type DrawingEdgeKey = "top" | "right" | "bottom" | "left";
export type DrawingCornerKey =
  | "topLeft"
  | "topRight"
  | "bottomRight"
  | "bottomLeft";
export type DrawingCornerTreatment = "none" | "radius" | "clip";
export type DrawingEdgeTreatment =
  | "finished"
  | "appliance"
  | "mitered"
  | "waterfall"
  | "splash"
  | "unfinished"
  | "additionalFinished";

export type DrawingLineDirection =
  | "right"
  | "downRight"
  | "down"
  | "downLeft"
  | "left"
  | "upLeft"
  | "up"
  | "upRight";

export type DrawingConstructionLineKind =
  | "segment"
  | "centerline"
  | "cabinet"
  | "wall";

export interface DrawingPiece {
  id: string;
  name: string | null;
  lengthIn: number;
  widthIn: number;
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

export type DrawingChainShapeSegment = ChainShapeSegment;

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

export interface CornerLayout {
  pieceId: string;
  vertexId: string;
  treatment: DrawingCornerTreatment;
  valueIn: number | null;
}

export interface EdgeLayout {
  pieceId: string;
  fromVertexId: string;
  toVertexId: string;
  treatment: DrawingEdgeTreatment;
  splashHeightIn: number | null;
  label: string | null;
}

export interface ReferenceLineLayout {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  kind: DrawingConstructionLineKind;
  color: string;
  dash?: boolean;
}

export interface DeletedLineLayout {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
}

export interface CanvasLayout {
  pieces: PieceLayout[];
  sinks: Array<{
    sinkId: string;
    pieceId: string | null;
    x: number;
    y: number;
    rotation: number;
  }>;
  corners: CornerLayout[];
  edges: EdgeLayout[];
  referenceLines: ReferenceLineLayout[];
  deletedLines: DeletedLineLayout[];
}

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

export type ShapeRect = DrawingShapeRect;
export type ShapeEdge = DrawingShapeEdge;

export interface DrawingReferenceLine {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  kind: DrawingConstructionLineKind;
  color: string;
  dash?: boolean;
}

export interface DrawingDeletedLine {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
}

export interface DrawingReferenceLineVisualSegment {
  id: string;
  sourceLineId: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  kind: DrawingConstructionLineKind;
  color: string;
  dash: boolean;
}

export interface DrawingReferenceLineVisualArc {
  id: string;
  pieceId: string;
  color: string;
  center: [number, number];
  radius: number;
  startAngle: number;
  endAngle: number;
  sourceLineIds: [string, string];
}

export interface DrawingReferenceLineVisualConnector {
  id: string;
  pieceId: string;
  color: string;
  from: [number, number];
  to: [number, number];
  sourceLineIds: [string, string];
}
