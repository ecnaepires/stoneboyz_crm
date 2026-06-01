import type { QuoteMeasurementAreaTotals } from './quote-measurements.types.js';
import type { GeneratedPriceLineInput, PriceListItemInput, QuoteAreaContext } from './quote-pricing.types.js';
import { PRICE_CATEGORY_VALUES } from './quote-pricing.types.js';

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

    const line = (() => {
      switch (category) {
        case 'material':
          return {
            label: area.material ?? 'Material',
            quantity: totals.combinedSqFt,
            unit: 'sqft'
          };
        case 'fabrication':
          return {
            label: 'Fabrication',
            quantity: totals.combinedSqFt,
            unit: 'sqft'
          };
        case 'finished_edge':
          return {
            label: 'Finished Edge',
            quantity: totals.finishedEdgeLinFt,
            unit: 'linft'
          };
        case 'splash':
          return {
            label: 'Splash',
            quantity: totals.splashSqFt,
            unit: 'sqft'
          };
        case 'sink_cutout':
          return {
            label: 'Sink Cutout',
            quantity: totals.sinkCutoutCount,
            unit: 'ea'
          };
        case 'sink_item':
          return {
            label: 'Sink',
            quantity: totals.sinkCutoutCount,
            unit: 'ea'
          };
        case 'faucet_hole':
          return {
            label: 'Faucet Hole',
            quantity: totals.faucetHoleCount,
            unit: 'ea'
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
