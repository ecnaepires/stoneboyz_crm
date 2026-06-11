import { describe, expect, it } from "vitest";
import {
  EMPTY_AREA_SELECTION,
  displayedAreaTotal,
  estimateLines,
  isAreaSaved,
  selectionHasPickedItems,
  type AccordionGroup,
  type AccordionItem,
  type AreaSelection,
  type GeneratedLine,
  type MeasurementTotals,
} from "./pricing-accordion-calculations";

const totals: MeasurementTotals = {
  countertopSqFt: 19.48,
  backsplashSqFt: 0,
  combinedSqFt: 19.48,
  finishedEdgeLinFt: 0,
  splashSqFt: 0,
  sinkCutoutCount: 0,
  faucetHoleCount: 0,
};

const staleGeneratedLine: GeneratedLine = {
  id: "line_1",
  label: "Old generated material",
  quantity: 19.48,
  unit: "sqft",
  unitPriceCents: 5000,
  lineTotalCents: 97396,
  overridePriceCents: null,
  overrideReason: null,
};

const materialItem: AccordionItem = {
  id: "item_material",
  name: "Selected Material",
  priceCents: 5000,
  chargeMethod: "square_foot",
  measurementBasis: "countertop_sqft",
};

const itemsByGroup: Record<AccordionGroup, AccordionItem[]> = {
  material: [materialItem],
  edge: [],
  fabrication: [],
  splash: [],
  sink: [],
  faucet_hole: [],
};

const materialSelection: AreaSelection = {
  ...EMPTY_AREA_SELECTION,
  materialItemId: materialItem.id,
};

describe("pricing accordion calculations", () => {
  it("does not count stale generated lines when no pricing items are selected", () => {
    expect(selectionHasPickedItems(EMPTY_AREA_SELECTION)).toBe(false);
    expect(
      displayedAreaTotal({
        persistedSelection: EMPTY_AREA_SELECTION,
        currentSelection: EMPTY_AREA_SELECTION,
        lines: [staleGeneratedLine],
        liveTotalCents: 0,
      }),
    ).toBe(0);
    expect(
      isAreaSaved({
        persistedSelection: EMPTY_AREA_SELECTION,
        currentSelection: EMPTY_AREA_SELECTION,
        lines: [staleGeneratedLine],
      }),
    ).toBe(false);
  });

  it("uses the live estimate while changed selections have not been saved", () => {
    const estimate = estimateLines(materialSelection, totals, itemsByGroup);
    const liveTotal = estimate.reduce((sum, line) => sum + line.totalCents, 0);

    expect(liveTotal).toBe(97400);
    expect(
      displayedAreaTotal({
        persistedSelection: EMPTY_AREA_SELECTION,
        currentSelection: materialSelection,
        lines: [],
        liveTotalCents: liveTotal,
      }),
    ).toBe(liveTotal);
  });
});
