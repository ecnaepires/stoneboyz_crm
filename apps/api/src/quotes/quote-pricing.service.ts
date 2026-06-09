import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type GeneratedPriceLine,
  type OverrideGeneratedPriceLineInput,
  type PriceCategory,
  type PriceListItem,
  type Quote,
  type QuoteArea,
  type QuoteMeasurementAreaTotals,
  type QuotePricingSelection,
  type UpsertQuotePricingSelectionInput
} from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { InvalidSlabStatusError, SlabsRepository } from '../inventory/slabs.repository.js';
import { PriceListItemsRepository } from '../price-lists/price-list-items.repository.js';
import { QuoteAreasRepository } from './quote-areas.repository.js';
import { QuotePricingRepository } from './quote-pricing.repository.js';
import { QuotePricingSelectionsRepository } from './quote-pricing-selections.repository.js';
import { QuotesRepository } from './quotes.repository.js';

const quantityForMeasurementBasis = (totals: QuoteMeasurementAreaTotals, basis: PriceListItem['measurementBasis']): number => {
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
};

const unitForChargeMethod = (chargeMethod: PriceListItem['chargeMethod']): string => {
  switch (chargeMethod) {
    case 'square_foot':
      return 'sqft';
    case 'linear_foot':
      return 'linft';
    case 'each':
      return 'ea';
  }
};

@Injectable()
export class QuotePricingService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly slabsRepository: SlabsRepository,
    private readonly quotesRepository: QuotesRepository,
    private readonly quoteAreasRepository: QuoteAreasRepository,
    private readonly priceListItemsRepository: PriceListItemsRepository,
    private readonly quotePricingRepository: QuotePricingRepository,
    private readonly quotePricingSelectionsRepository: QuotePricingSelectionsRepository
  ) {}

  async listPricingLines(customerId: string, quoteId: string, areaId: string): Promise<{ data: GeneratedPriceLine[] }> {
    await this.ensureAreaExists(customerId, quoteId, areaId);

    return { data: await this.quotePricingRepository.listByAreaId(areaId) };
  }

  async getPricingSelections(customerId: string, quoteId: string): Promise<QuotePricingSelection> {
    await this.ensureQuoteExists(customerId, quoteId);
    return this.quotePricingSelectionsRepository.get(quoteId);
  }

  async upsertPricingSelections(
    customerId: string,
    quoteId: string,
    input: UpsertQuotePricingSelectionInput
  ): Promise<QuotePricingSelection> {
    const quote = await this.ensureQuoteExists(customerId, quoteId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    for (const area of input.areas ?? []) {
      const quoteArea = await this.quoteAreasRepository.findById(quoteId, area.areaId);
      if (quoteArea === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote area not found' });
      }
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const currentSelection = await this.quotePricingSelectionsRepository.get(quoteId, client);
      const negotiatedSlabIds = new Set<string>();

      for (const area of input.areas ?? []) {
        const existingAreaSelection = currentSelection.areas.find((candidate) => candidate.areaId === area.areaId);
        const nextMaterialSource = Object.hasOwn(area, 'materialSource')
          ? (area.materialSource ?? 'external')
          : (existingAreaSelection?.materialSource ?? 'external');
        const nextMaterialSlabId =
          nextMaterialSource === 'inventory'
            ? Object.hasOwn(area, 'materialSlabId')
              ? (area.materialSlabId ?? null)
              : (existingAreaSelection?.materialSlabId ?? null)
            : null;
        const nextMaterialItemId = Object.hasOwn(area, 'materialItemId')
          ? (area.materialItemId ?? null)
          : (existingAreaSelection?.materialItemId ?? null);
        const previousMaterialSlabId = existingAreaSelection?.materialSlabId ?? null;

        if (nextMaterialSource === 'inventory' && (nextMaterialItemId === null || nextMaterialSlabId === null)) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Inventory material requires a material price item and candidate slab'
          });
        }

        if (previousMaterialSlabId !== null && previousMaterialSlabId !== nextMaterialSlabId) {
          const otherAreaStillUsesPreviousSlab = currentSelection.areas.some(
            (candidate) => candidate.areaId !== area.areaId && candidate.materialSlabId === previousMaterialSlabId
          );

          if (!otherAreaStillUsesPreviousSlab) {
            await this.slabsRepository.release(previousMaterialSlabId, client);
          }
        }

        if (nextMaterialSource === 'inventory' && nextMaterialSlabId !== null) {
          const quoteAlreadyUsesNextSlab = currentSelection.areas.some(
            (candidate) => candidate.materialSlabId === nextMaterialSlabId
          );

          if (quoteAlreadyUsesNextSlab || negotiatedSlabIds.has(nextMaterialSlabId)) {
            continue;
          }

          let slab;
          try {
            slab = await this.slabsRepository.negotiate(nextMaterialSlabId, client);
          } catch (error) {
            if (error instanceof InvalidSlabStatusError) {
              const currentSlab = await this.slabsRepository.findById(nextMaterialSlabId, client);
              const message =
                currentSlab?.status === 'negotiating'
                  ? 'This Slab is already being negotiated on another quote. Pick another inventory Slab or use external material.'
                  : 'This Slab is no longer available. Pick another inventory Slab or use external material.';

              throw new ConflictException({ code: 'SLAB_NOT_AVAILABLE', message });
            }

            throw error;
          }

          if (slab === null) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
          }

          negotiatedSlabIds.add(nextMaterialSlabId);
        }
      }

      const selection = await this.quotePricingSelectionsRepository.upsertWithClient(client, quoteId, input);
      await client.query('COMMIT');
      return selection;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async generatePricingLines(
    customerId: string,
    quoteId: string,
    areaId: string,
    _actorUserId: string
  ): Promise<{ data: GeneratedPriceLine[] }> {
    const { quote, area } = await this.ensureAreaExists(customerId, quoteId, areaId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    // Selections-only (2026-06-08 design): price lines come solely from the saved
    // per-area Quote Pricing Selection. No legacy price-list auto-fallback — an area
    // with no selections generates no lines, so the quote never shows prices the
    // salesperson did not pick.
    const selectedLines = await this.generateSelectedPricingLines(quoteId, areaId, area);
    return { data: await this.quotePricingRepository.upsertLines(areaId, selectedLines) };
  }

  private async generateSelectedPricingLines(
    quoteId: string,
    areaId: string,
    _area: QuoteArea
  ): Promise<Array<{
    category: PriceCategory;
    label: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    priceListItemId: string;
    sortOrder: number;
  }>> {
    const selection = await this.quotePricingSelectionsRepository.get(quoteId);
    const areaSelection = selection.areas.find((candidate) => candidate.areaId === areaId);
    const selectedIds = [
      areaSelection?.materialItemId,
      areaSelection?.fabricationItemId ?? selection.defaultFabricationItemId,
      areaSelection?.edgeItemId,
      areaSelection?.splashItemId,
      areaSelection?.sinkItemId,
      areaSelection?.faucetHoleItemId
    ].filter((value): value is string => value !== null && value !== undefined);

    if (selectedIds.length === 0) {
      return [];
    }

    const itemsById = await this.priceListItemsRepository.findManyByIds(selectedIds);
    const totals = await this.quoteAreasRepository.pricingMeasurementTotalsForArea(areaId);
    const orderedIds = [
      areaSelection?.materialItemId,
      areaSelection?.fabricationItemId ?? selection.defaultFabricationItemId,
      areaSelection?.edgeItemId,
      areaSelection?.splashItemId,
      areaSelection?.sinkItemId,
      areaSelection?.faucetHoleItemId
    ];

    return orderedIds.flatMap((itemId, sortOrder) => {
      if (itemId === null || itemId === undefined) return [];
      const item = itemsById.get(itemId);
      if (item === undefined) return [];

      const quantity = quantityForMeasurementBasis(totals, item.measurementBasis);
      if (quantity <= 0) return [];

      return [{
        category: item.category as PriceCategory,
        label: item.name,
        quantity,
        unit: unitForChargeMethod(item.chargeMethod),
        unitPriceCents: item.priceCents,
        priceListItemId: item.id,
        sortOrder
      }];
    });
  }

  async overridePricingLine(
    customerId: string,
    quoteId: string,
    areaId: string,
    lineId: string,
    input: OverrideGeneratedPriceLineInput
  ): Promise<GeneratedPriceLine> {
    const { quote } = await this.ensureAreaExists(customerId, quoteId, areaId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const line = await this.quotePricingRepository.updateOverride(areaId, lineId, input);

    if (line === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Generated price line not found' });
    }

    return line;
  }

  private async ensureAreaExists(
    customerId: string,
    quoteId: string,
    areaId: string
  ): Promise<{ quote: Quote; area: QuoteArea }> {
    const quote = await this.quotesRepository.findById(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    const area = await this.quoteAreasRepository.findById(quoteId, areaId);

    if (area === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote area not found' });
    }

    return { quote, area };
  }

  private async ensureQuoteExists(customerId: string, quoteId: string): Promise<Quote> {
    const quote = await this.quotesRepository.findById(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    return quote;
  }
}
