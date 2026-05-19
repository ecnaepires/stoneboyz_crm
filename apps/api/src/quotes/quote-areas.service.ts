import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateQuoteAreaInput, QuoteArea, UpdateQuoteAreaInput } from '@stoneboyz/domain';
import { EventBus } from '../events/event-bus.js';
import { buildQuoteAreaPayload, buildQuoteAreaUpdatedPayload } from './quote-area-events.js';
import { QuoteAreasRepository } from './quote-areas.repository.js';
import { QuotesRepository } from './quotes.repository.js';

@Injectable()
export class QuoteAreasService {
  constructor(
    private readonly quotesRepository: QuotesRepository,
    private readonly quoteAreasRepository: QuoteAreasRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(customerId: string, quoteId: string): Promise<{ data: QuoteArea[] }> {
    await this.ensureQuoteExists(customerId, quoteId);

    return { data: await this.quoteAreasRepository.listByQuoteId(quoteId) };
  }

  async create(customerId: string, quoteId: string, input: CreateQuoteAreaInput): Promise<QuoteArea> {
    const quote = await this.ensureQuoteExists(customerId, quoteId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const area = await this.quoteAreasRepository.create(quoteId, input);

    this.eventBus.emit('quote.area_added', buildQuoteAreaPayload(customerId, quoteId, area.id, input.actorUserId));

    return area;
  }

  async update(customerId: string, quoteId: string, areaId: string, input: UpdateQuoteAreaInput): Promise<QuoteArea> {
    const quote = await this.ensureQuoteExists(customerId, quoteId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const area = await this.quoteAreasRepository.update(quoteId, areaId, input);

    if (area === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote area not found' });
    }

    const changedFields = Object.keys(input).filter((key) => key !== 'actorUserId');
    this.eventBus.emit('quote.area_updated', buildQuoteAreaUpdatedPayload(customerId, quoteId, areaId, input.actorUserId, changedFields));

    return area;
  }

  async remove(customerId: string, quoteId: string, areaId: string, actorUserId: string): Promise<QuoteArea> {
    const quote = await this.ensureQuoteExists(customerId, quoteId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const hasLineItems = await this.quoteAreasRepository.hasLineItems(areaId);

    if (hasLineItems) {
      throw new ConflictException({ code: 'AREA_HAS_LINE_ITEMS', message: 'Cannot delete area with associated line items' });
    }

    const area = await this.quoteAreasRepository.remove(quoteId, areaId);

    if (area === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote area not found' });
    }

    this.eventBus.emit('quote.area_removed', buildQuoteAreaPayload(customerId, quoteId, areaId, actorUserId));

    return area;
  }

  private async ensureQuoteExists(customerId: string, quoteId: string) {
    const quote = await this.quotesRepository.findById(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    return quote;
  }
}
