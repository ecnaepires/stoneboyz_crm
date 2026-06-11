// packages/domain/src/drawing/v2/types.ts
export type Pt = { x: number; y: number }; // inches

export type CornerTreatmentV2 = {
  type: "radius" | "chamfer";
  valueIn: number;
  direction: "out" | "in"; // "in" only valid for radius (cove); validated in layout schema
};

export type VertexV2 = {
  vertexId: string;
  xIn: number;
  yIn: number;
  corner?: CornerTreatmentV2;
  bulge?: number; // arc on edge vertex -> next vertex; θ = 4·atan(b); + bows outward
};

export type OutlineV2 = { vertices: VertexV2[] }; // closed, >= 3, clockwise (screen coords)

export type ResolvedEdge =
  | { kind: "line"; from: Pt; to: Pt; sourceStartVertexId: string }
  | {
      kind: "arc";
      from: Pt;
      to: Pt;
      center: Pt;
      radiusIn: number;
      /** signed sweep in radians; positive = clockwise in screen coords */
      sweep: number;
      sourceStartVertexId: string;
    };

export type EdgeRecordV2 = {
  startVertexId: string;
  paintColor?: string;
  splash?: { heightIn: number; offsetIn: number };
};

export type CutoutV2 =
  | { id: string; shape: "circle"; centerIn: Pt; diameterIn: number }
  | { id: string; shape: "rect"; centerIn: Pt; wIn: number; hIn: number; rotationDeg: number };

export type PieceV2 = {
  pieceId: string;
  kind: "countertop" | "backsplash";
  label: string;
  positionIn: Pt;
  rotationDeg: 0 | 90 | 180 | 270;
  outline: OutlineV2;
  edges: EdgeRecordV2[];
  cutouts: CutoutV2[];
};

export type SinkV2 = {
  sinkId: string;
  pieceId: string;
  type: "sink" | "cooktop";
  centerIn: Pt;
  rotationDeg: 0 | 90 | 180 | 270;
  showCenterline: "left" | "right";
  faucetHoles: Array<{ id: string; dxIn: number; diameterIn: number }>;
};

export type AnnotationV2 =
  | { id: string; type: "wall" | "cabinet"; pieceId: string; fromIn: Pt; toIn: Pt; dash: true }
  | { id: string; type: "segment"; pieceId: string; fromIn: Pt; toIn: Pt }
  | { id: string; type: "centerline"; pieceId: string; fromIn: Pt; toIn: Pt }
  | { id: string; type: "seam"; pieceId: string; fromIn: Pt; toIn: Pt }
  | {
      id: string;
      type: "label";
      pieceId?: string;
      atIn: Pt;
      text: string;
      color: string;
      preset?: "cooktop" | "dishwasher" | "range" | "custom";
    };

export type LegendEntryV2 = { color: string; label: string; countsAsEdge?: boolean };

export type LayoutV2 = {
  schemaVersion: 2;
  pieces: PieceV2[];
  sinks: SinkV2[];
  annotations: AnnotationV2[];
  legend: LegendEntryV2[];
};

export const EPS = 1e-6;
export const MIN_EDGE_IN = 1 / 16;
export const DEFAULT_FAUCET_HOLE_DIAMETER_IN = 1.375;
