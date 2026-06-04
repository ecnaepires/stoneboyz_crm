import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  generatePriceLines,
  type GeneratedPriceLine,
  type OverrideGeneratedPriceLineInput,
  type PriceCategory,
  type PriceListItem,
  type PriceListItemInput,
  type Quote,
  type QuoteArea,
  type QuoteMeasurementAreaTotals,
  type QuotePricingSelection,
  type UpsertQuotePricingSelectionInput
} from '@stoneboyz/domain';
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

    return this.quotePricingSelectionsRepository.upsert(quoteId, input);
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

    if (quote.priceListId === null) {
      const selectedLines = await this.generateSelectedPricingLines(quoteId, areaId, area);
      return { data: await this.quotePricingRepository.upsertLines(areaId, selectedLines) };
    }

    const selectedLines = await this.generateSelectedPricingLines(quoteId, areaId, area);
    if (selectedLines.length > 0) {
      return { data: await this.quotePricingRepository.upsertLines(areaId, selectedLines) };
    }

    const priceListItems: PriceListItemInput[] = (await this.priceListItemsRepository.list(quote.priceListId)).map((item) => ({
      id: item.id,
      category: item.category,
      unitPriceCents: item.priceCents,
      chargeMethod: item.chargeMethod,
      measurementBasis: item.measurementBasis
    }));
    const measurementTotals = await this.quoteAreasRepository.pricingMeasurementTotalsForArea(areaId);
    const lines = generatePriceLines(measurementTotals, { material: area.material, color: area.color }, priceListItems);

    return { data: await this.quotePricingRepository.upsertLines(areaId, lines) };
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
      selection.sinkItemId,
      selection.faucetHoleItemId
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
      selection.sinkItemId,
      selection.faucetHoleItemId
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
    await this.ensureAreaExists(customerId, quoteId, areaId);
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
