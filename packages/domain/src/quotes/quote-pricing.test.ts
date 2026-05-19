import { describe, expect, it } from 'vitest';
import { generatePriceLines } from './quote-pricing.js';
import type { PriceListItemInput } from './quote-pricing.types.js';

const kitchenTotals = {
  pieceCount: 2,
  countertopSqFt: 35.708,
  finishedEdgeLinFt: 14.333,
  splashSqFt: 2.778,
  sinkCutoutCount: 1,
  faucetHoleCount: 1
};

const emptyTotals = {
  pieceCount: 0,
  countertopSqFt: 0,
  finishedEdgeLinFt: 0,
  splashSqFt: 0,
  sinkCutoutCount: 0,
  faucetHoleCount: 0
};

describe('generatePriceLines', () => {
  it('generates the kitchen golden scenario lines in canonical order', () => {
    const priceListItems: PriceListItemInput[] = [
      { id: 'price-material', category: 'material', unitPriceCents: 2000 },
      { id: 'price-fabrication', category: 'fabrication', unitPriceCents: 1500 },
      { id: 'price-edge', category: 'finished_edge', unitPriceCents: 800 },
      { id: 'price-splash', category: 'splash', unitPriceCents: 1200 },
      { id: 'price-sink-cutout', category: 'sink_cutout', unitPriceCents: 15000 },
      { id: 'price-faucet-hole', category: 'faucet_hole', unitPriceCents: 5000 }
    ];

    const lines = generatePriceLines(kitchenTotals, { material: 'Quartz' }, priceListItems);

    expect(lines).toHaveLength(6);
    expect(lines.map((line) => line.sortOrder)).toEqual([0, 1, 2, 3, 4, 6]);
    expect(lines.map((line) => line.lineTotalCents)).toEqual([
      Math.round(35.708 * 2000),
      Math.round(35.708 * 1500),
      Math.round(14.333 * 800),
      Math.round(2.778 * 1200),
      Math.round(1 * 15000),
      Math.round(1 * 5000)
    ]);
  });

  it('returns no lines for an empty area', () => {
    const priceListItems: PriceListItemInput[] = [
      { id: 'price-material', category: 'material', unitPriceCents: 2000 },
      { id: 'price-fabrication', category: 'fabrication', unitPriceCents: 1500 }
    ];

    expect(generatePriceLines(emptyTotals, {}, priceListItems)).toEqual([]);
  });

  it('matches categories case-insensitively', () => {
    const lines = generatePriceLines(kitchenTotals, {}, [
      { id: 'price-material', category: 'Material', unitPriceCents: 2000 }
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      category: 'material',
      lineTotalCents: Math.round(35.708 * 2000),
      priceListItemId: 'price-material'
    });
  });

  it('skips lines with missing price list items', () => {
    const lines = generatePriceLines(kitchenTotals, {}, [
      { id: 'price-material', category: 'material', unitPriceCents: 2000 }
    ]);

    expect(lines.map((line) => line.category)).toEqual(['material']);
    expect(lines.find((line) => line.category === 'fabrication')).toBeUndefined();
  });

  it('returns no lines when there are no price list items', () => {
    expect(generatePriceLines(kitchenTotals, {}, [])).toEqual([]);
  });
});
