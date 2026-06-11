import { edgeLengthsIn, outlineAreaSqIn } from "./measure-outline.js";
import type { LayoutV2 } from "./types.js";

export type LayoutMeasurements = {
  countertopSqFt: number;
  backsplashSqFt: number;
  combinedSqFt: number;
  edgeLinFt: number;
  perPiece: Array<{ pieceId: string; label: string; kind: "countertop" | "backsplash"; sqFt: number }>;
};

const round2 = (v: number) => Math.round(v * 100) / 100;

export function measureLayout(layout: LayoutV2): LayoutMeasurements {
  const edgeColors = new Set(layout.legend.filter((l) => l.countsAsEdge).map((l) => l.color.toLowerCase()));
  let countertopSqIn = 0;
  let backsplashSqIn = 0;
  let edgeLinIn = 0;
  const perPiece: LayoutMeasurements["perPiece"] = [];

  for (const piece of layout.pieces) {
    const areaSqIn = outlineAreaSqIn(piece.outline);
    if (piece.kind === "countertop") countertopSqIn += areaSqIn;
    else backsplashSqIn += areaSqIn;
    perPiece.push({ pieceId: piece.pieceId, label: piece.label, kind: piece.kind, sqFt: round2(areaSqIn / 144) });

    const lengths = new Map(edgeLengthsIn(piece.outline).map((e) => [e.sourceStartVertexId, e.lengthIn]));
    for (const rec of piece.edges) {
      const len = lengths.get(rec.startVertexId) ?? 0;
      if (rec.paintColor && edgeColors.has(rec.paintColor.toLowerCase())) edgeLinIn += len;
      if (rec.splash) backsplashSqIn += rec.splash.heightIn * len;
    }
  }

  return {
    countertopSqFt: round2(countertopSqIn / 144),
    backsplashSqFt: round2(backsplashSqIn / 144),
    combinedSqFt: round2((countertopSqIn + backsplashSqIn) / 144),
    edgeLinFt: round2(edgeLinIn / 12),
    perPiece,
  };
}
