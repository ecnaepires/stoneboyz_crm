import type { QuoteMeasurementAreaTotals } from './quote-measurements.types.js';
import type { GeneratedPriceLineInput, PriceListItemInput, QuoteAreaContext } from './quote-pricing.types.js';
import { PRICE_CATEGORY_VALUES } from './quote-pricing.types.js';

function quantityForMeasurementBasis(totals: QuoteMeasurementAreaTotals, basis: NonNullable<PriceListItemInput['measurementBasis']>): number {
  switch (basis) {
    case 'countertop_sqft':
      return totals.countertopSqFt;
    case 'backsplash_sqft':
      return totals.backsplashSqFt;
    case 'combined_sqft':
      return totals.combinedSqFt;
    case 'finished_edge_linft':
      return totals.finishedEdgeLinFt;
    case 'splash_sqft':
      return totals.splashSqFt;
    case 'sink_count':
      return totals.sinkCutoutCount;
    case 'faucet_hole_count':
      return totals.faucetHoleCount;
    case 'each':
      return 1;
  }
}

function unitForChargeMethod(chargeMethod: NonNullable<PriceListItemInput['chargeMethod']>): string {
  switch (chargeMethod) {
    case 'square_foot':
      return 'sqft';
    case 'linear_foot':
      return 'linft';
    case 'each':
      return 'ea';
  }
}

export function generatePriceLines(
  totals: QuoteMeasurementAreaTotals,
  area: QuoteAreaContext,
  priceListItems: PriceListItemInput[]
): GeneratedPriceLineInput[] {
  const priceListItemsByCategory = new Map<string, PriceListItemInput>();

  for (const item of priceListItems) {
    const key = item.category.toLowerCase().trim();

    if (!priceListItemsByCategory.has(key)) {
      priceListItemsByCategory.set(key, item);
    }
  }

  return PRICE_CATEGORY_VALUES.flatMap((category, sortOrder): GeneratedPriceLineInput[] => {
    const priceListItem = priceListItemsByCategory.get(category);

    if (!priceListItem) {
      return [];
    }

    const configuredQuantity =
      priceListItem.measurementBasis === undefined ? undefined : quantityForMeasurementBasis(totals, priceListItem.measurementBasis);
    const configuredUnit =
      priceListItem.chargeMethod === undefined ? undefined : unitForChargeMethod(priceListItem.chargeMethod);

    const line = (() => {
      switch (category) {
        case 'material':
          return {
            label: area.material ?? 'Material',
            quantity: configuredQuantity ?? totals.combinedSqFt,
            unit: configuredUnit ?? 'sqft'
          };
        case 'fabrication':
          return {
            label: 'Fabrication',
            quantity: configuredQuantity ?? totals.combinedSqFt,
            unit: configuredUnit ?? 'sqft'
          };
        case 'finished_edge':
          return {
            label: 'Finished Edge',
            quantity: configuredQuantity ?? totals.finishedEdgeLinFt,
            unit: configuredUnit ?? 'linft'
          };
        case 'splash':
          return {
            label: 'Splash',
            quantity: configuredQuantity ?? totals.splashSqFt,
            unit: configuredUnit ?? 'sqft'
          };
        case 'sink_cutout':
          return {
            label: 'Sink Cutout',
            quantity: configuredQuantity ?? totals.sinkCutoutCount,
            unit: configuredUnit ?? 'ea'
          };
        case 'sink_item':
          return {
            label: 'Sink',
            quantity: configuredQuantity ?? totals.sinkCutoutCount,
            unit: configuredUnit ?? 'ea'
          };
        case 'faucet_hole':
          return {
            label: 'Faucet Hole',
            quantity: configuredQuantity ?? totals.faucetHoleCount,
            unit: configuredUnit ?? 'ea'
          };
      }
    })();

    if (line.quantity <= 0) {
      return [];
    }

    return [
      {
        category,
        label: line.label,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: priceListItem.unitPriceCents,
        lineTotalCents: Math.round(line.quantity * priceListItem.unitPriceCents),
        priceListItemId: priceListItem.id,
        sortOrder
      }
    ];
  }).sort((left, right) => left.sortOrder - right.sortOrder);
}
