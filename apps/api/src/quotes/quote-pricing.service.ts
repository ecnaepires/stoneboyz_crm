import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  generatePriceLines,
  type GeneratedPriceLine,
  type OverrideGeneratedPriceLineInput,
  type PriceListItemInput,
  type Quote,
  type QuoteArea
} from '@stoneboyz/domain';
import { PriceListItemsRepository } from '../price-lists/price-list-items.repository.js';
import { QuoteAreasRepository } from './quote-areas.repository.js';
import { QuotePricingRepository } from './quote-pricing.repository.js';
import { QuotesRepository } from './quotes.repository.js';

@Injectable()
export class QuotePricingService {
  constructor(
    private readonly quotesRepository: QuotesRepository,
    private readonly quoteAreasRepository: QuoteAreasRepository,
    private readonly priceListItemsRepository: PriceListItemsRepository,
    private readonly quotePricingRepository: QuotePricingRepository
  ) {}

  async listPricingLines(customerId: string, quoteId: string, areaId: string): Promise<{ data: GeneratedPriceLine[] }> {
    await this.ensureAreaExists(customerId, quoteId, areaId);

    return { data: await this.quotePricingRepository.listByAreaId(areaId) };
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
      return { data: await this.quotePricingRepository.upsertLines(areaId, []) };
    }

    const priceListItems: PriceListItemInput[] = (await this.priceListItemsRepository.list(quote.priceListId)).map((item) => ({
      id: item.id,
      category: item.category,
      unitPriceCents: item.priceCents
    }));
    const measurementTotals = await this.quoteAreasRepository.pricingMeasurementTotalsForArea(areaId);
    const lines = generatePriceLines(measurementTotals, { material: area.material, color: area.color }, priceListItems);

    return { data: await this.quotePricingRepository.upsertLines(areaId, lines) };
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
}
