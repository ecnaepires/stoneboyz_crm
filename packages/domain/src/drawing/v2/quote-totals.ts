import type { QuoteMeasurementAreaTotals } from "../../quotes/quote-measurements.types.js";
import { edgeLengthsIn, outlineAreaSqIn } from "./measure-outline.js";
import type { LayoutV2 } from "./types.js";

const round2 = (v: number) => Math.round(v * 100) / 100;

/** v2 layout → the existing quote totals contract (header, MeasurementsCard, pricing). */
export function quoteAreaTotalsFromLayoutV2(layout: LayoutV2): QuoteMeasurementAreaTotals {
  const edgeColors = new Set(layout.legend.filter((l) => l.countsAsEdge).map((l) => l.color.toLowerCase()));
  let countertopSqIn = 0;
  let backsplashSqIn = 0;
  let splashSqIn = 0;
  let edgeLinIn = 0;

  for (const piece of layout.pieces) {
    const areaSqIn = outlineAreaSqIn(piece.outline);
    if (piece.kind === "countertop") countertopSqIn += areaSqIn;
    else backsplashSqIn += areaSqIn;

    const lengths = new Map(edgeLengthsIn(piece.outline).map((e) => [e.sourceStartVertexId, e.lengthIn]));
    for (const rec of piece.edges) {
      const len = lengths.get(rec.startVertexId) ?? 0;
      if (rec.paintColor && edgeColors.has(rec.paintColor.toLowerCase())) edgeLinIn += len;
      if (rec.splash) splashSqIn += rec.splash.heightIn * len;
    }
  }

  return {
    pieceCount: layout.pieces.length,
    countertopSqFt: round2(countertopSqIn / 144),
    backsplashSqFt: round2(backsplashSqIn / 144),
    combinedSqFt: round2((countertopSqIn + backsplashSqIn) / 144),
    finishedEdgeLinFt: round2(edgeLinIn / 12),
    splashSqFt: round2(splashSqIn / 144),
    sinkCutoutCount: layout.sinks.length,
    faucetHoleCount: layout.sinks.reduce((acc, s) => acc + s.faucetHoles.length, 0),
  };
}
