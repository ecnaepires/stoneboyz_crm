export type AccordionItem = {
  id: string;
  name: string;
  priceCents: number;
  chargeMethod: "square_foot" | "linear_foot" | "each";
  measurementBasis:
    | "countertop_sqft"
    | "backsplash_sqft"
    | "combined_sqft"
    | "finished_edge_linft"
    | "splash_sqft"
    | "sink_count"
    | "faucet_hole_count"
    | "each";
};

export type AccordionGroup =
  | "material"
  | "edge"
  | "fabrication"
  | "splash"
  | "sink"
  | "faucet_hole";

export type MeasurementTotals = {
  countertopSqFt: number;
  backsplashSqFt: number;
  combinedSqFt: number;
  finishedEdgeLinFt: number;
  splashSqFt: number;
  sinkCutoutCount: number;
  faucetHoleCount: number;
};

export type AreaSelection = {
  materialItemId: string | null;
  materialSource: "inventory" | "external";
  materialSlabId: string | null;
  externalMaterialNote: string | null;
  edgeItemId: string | null;
  fabricationItemId: string | null;
  splashItemId: string | null;
  sinkItemId: string | null;
  faucetHoleItemId: string | null;
};

export type GeneratedLine = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  lineTotalCents: number;
  overridePriceCents: number | null;
  overrideReason: string | null;
};

export type AccordionArea = {
  id: string;
  name: string;
  measurementTotals: MeasurementTotals;
  selection: AreaSelection;
  lines: GeneratedLine[];
};

export type EstimateLine = {
  label: string;
  qty: number;
  unit: string;
  rateCents: number;
  totalCents: number;
};

export const EMPTY_AREA_SELECTION: AreaSelection = {
  materialItemId: null,
  materialSource: "external",
  materialSlabId: null,
  externalMaterialNote: null,
  edgeItemId: null,
  fabricationItemId: null,
  splashItemId: null,
  sinkItemId: null,
  faucetHoleItemId: null,
};

export const GROUP_FIELDS: Array<{
  group: AccordionGroup;
  field: keyof AreaSelection;
  label: string;
}> = [
  { group: "material", field: "materialItemId", label: "Material" },
  { group: "edge", field: "edgeItemId", label: "Edge" },
  { group: "fabrication", field: "fabricationItemId", label: "Fabrication" },
  { group: "splash", field: "splashItemId", label: "Splash" },
  { group: "sink", field: "sinkItemId", label: "Sink" },
  { group: "faucet_hole", field: "faucetHoleItemId", label: "Faucet Holes" },
];

export function selectionHasPickedItems(selection: AreaSelection): boolean {
  return GROUP_FIELDS.some(({ field }) => selection[field] !== null);
}

export function selectionsMatch(left: AreaSelection, right: AreaSelection): boolean {
  return (
    GROUP_FIELDS.every(({ field }) => left[field] === right[field]) &&
    left.materialSource === right.materialSource &&
    left.materialSlabId === right.materialSlabId &&
    (left.externalMaterialNote ?? "") === (right.externalMaterialNote ?? "")
  );
}

export function quantityFor(
  basis: AccordionItem["measurementBasis"],
  totals: MeasurementTotals,
): number {
  switch (basis) {
    case "countertop_sqft":
      return totals.countertopSqFt;
    case "backsplash_sqft":
      return totals.backsplashSqFt;
    case "combined_sqft":
      return totals.combinedSqFt;
    case "finished_edge_linft":
      return totals.finishedEdgeLinFt;
    case "splash_sqft":
      return totals.splashSqFt;
    case "sink_count":
      return totals.sinkCutoutCount;
    case "faucet_hole_count":
      return totals.faucetHoleCount;
    case "each":
      return 1;
  }
}

export function estimateLines(
  picks: AreaSelection,
  totals: MeasurementTotals,
  itemsByGroup: Record<AccordionGroup, AccordionItem[]>,
): EstimateLine[] {
  const lines: EstimateLine[] = [];
  for (const { group, field } of GROUP_FIELDS) {
    const itemId = picks[field];
    if (!itemId) continue;
    const item = itemsByGroup[group].find((candidate) => candidate.id === itemId);
    if (!item || item.priceCents <= 0) continue;
    const qty = quantityFor(item.measurementBasis, totals);
    if (qty <= 0) continue;
    lines.push({
      label: item.name,
      qty,
      unit: item.chargeMethod,
      rateCents: item.priceCents,
      totalCents: Math.round(qty * item.priceCents),
    });
  }
  return lines;
}

export function savedLinesTotal(lines: GeneratedLine[]): number {
  return lines.reduce(
    (sum, line) => sum + (line.overridePriceCents ?? line.lineTotalCents),
    0,
  );
}

export function displayedAreaTotal(args: {
  persistedSelection: AreaSelection;
  currentSelection: AreaSelection;
  lines: GeneratedLine[];
  liveTotalCents: number;
}): number {
  if (!selectionHasPickedItems(args.currentSelection)) {
    return 0;
  }

  if (!selectionsMatch(args.persistedSelection, args.currentSelection)) {
    return args.liveTotalCents;
  }

  return args.lines.length > 0 ? savedLinesTotal(args.lines) : args.liveTotalCents;
}

export function isAreaSaved(args: {
  persistedSelection: AreaSelection;
  currentSelection: AreaSelection;
  lines: GeneratedLine[];
}): boolean {
  return (
    selectionHasPickedItems(args.persistedSelection) &&
    selectionsMatch(args.persistedSelection, args.currentSelection) &&
    args.lines.length > 0
  );
}
