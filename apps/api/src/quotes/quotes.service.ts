import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ArchiveQuoteInput,
  CreateQuoteInput,
  CreateQuoteLineItemInput,
  ListQuotesInput,
  Quote,
  QuoteLineItem,
  QuoteWithLineItems,
  TransitionQuoteInput,
  UpdateQuoteInput,
  UpdateQuoteLineItemInput
} from '@stoneboyz/domain';
import type { DatabaseError } from 'pg';
import { EventBus } from '../events/event-bus.js';
import {
  buildQuoteCreatedPayload,
  buildQuoteLineItemPayload,
  buildQuoteLineItemUpdatedPayload,
  buildQuoteTransitionPayload,
  buildQuoteUpdatedPayload
} from './quote-events.js';
import { InvalidQuoteCursorError, QuotesRepository } from './quotes.repository.js';

const FOREIGN_KEY_VIOLATION_CODE = '23503';

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

const lineTotal = (lineItem: Pick<CreateQuoteLineItemInput, 'qty' | 'unitPriceCents' | 'laborPriceCents'>): number => {
  return Math.floor(lineItem.qty * (lineItem.unitPriceCents + (lineItem.laborPriceCents ?? 0)));
};

@Injectable()
export class QuotesService {
  constructor(
    private readonly quotesRepository: QuotesRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(customerId: string, input: ListQuotesInput): Promise<{ data: Quote[]; nextCursor: string | null; hasMore: boolean }> {
    await this.ensureCustomerExists(customerId);

    try {
      return await this.quotesRepository.list(customerId, {
        ...input,
        limit: input.limit ?? 25,
        includeArchived: input.includeArchived ?? false
      });
    } catch (error) {
      if (error instanceof InvalidQuoteCursorError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { cursor: ['Invalid cursor'] }
        });
      }

      throw error;
    }
  }

  async create(customerId: string, input: CreateQuoteInput): Promise<QuoteWithLineItems> {
    await this.ensureCustomerExists(customerId);
    this.ensureValidDiscount(input.discountCents ?? 0, (input.lineItems ?? []).reduce((sum, item) => sum + lineTotal(item), 0));

    try {
      const quote = await this.quotesRepository.create(customerId, input);
      const lineItems = await this.quotesRepository.listLineItems(quote.id);

      this.eventBus.emit('quote.created', buildQuoteCreatedPayload(customerId, quote.id, input.actorUserId));

      for (const lineItem of lineItems) {
        this.eventBus.emit(
          'quote.line_item_added',
          buildQuoteLineItemPayload(customerId, quote.id, lineItem.id, input.actorUserId)
        );
      }

      return { ...quote, lineItems };
    } catch (error) {
      if (isDatabaseError(error) && error.code === FOREIGN_KEY_VIOLATION_CODE) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      throw error;
    }
  }

  async getById(customerId: string, quoteId: string): Promise<QuoteWithLineItems> {
    await this.ensureCustomerExists(customerId);
    const quote = await this.ensureQuoteExists(customerId, quoteId);
    const lineItems = await this.quotesRepository.listLineItems(quoteId);

    return { ...quote, lineItems };
  }

  async update(customerId: string, quoteId: string, input: UpdateQuoteInput): Promise<Quote> {
    const current = await this.ensureQuoteExists(customerId, quoteId);

    if (current.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    this.ensureValidDiscount(input.discountCents ?? current.discountCents, current.subtotalCents);

    try {
      const quote = await this.quotesRepository.update(customerId, quoteId, input);

      if (quote === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
      }

      const changedFields = Object.keys(input).filter((key) => key !== 'actorUserId');
      this.eventBus.emit('quote.updated', buildQuoteUpdatedPayload(customerId, quoteId, input.actorUserId, changedFields));

      return quote;
    } catch (error) {
      if (isDatabaseError(error) && error.code === FOREIGN_KEY_VIOLATION_CODE) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      throw error;
    }
  }

  async send(customerId: string, quoteId: string, input: TransitionQuoteInput): Promise<Quote> {
    const current = await this.ensureQuoteExists(customerId, quoteId);

    if (current.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const quote = await this.quotesRepository.send(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    this.eventBus.emit('quote.sent', buildQuoteTransitionPayload(customerId, quoteId, input.actorUserId));

    return quote;
  }

  async accept(customerId: string, quoteId: string, input: TransitionQuoteInput): Promise<Quote> {
    const current = await this.ensureQuoteExists(customerId, quoteId);

    if (current.status !== 'sent') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in sent status' });
    }

    const quote = await this.quotesRepository.accept(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    this.eventBus.emit('quote.accepted', buildQuoteTransitionPayload(customerId, quoteId, input.actorUserId));

    return quote;
  }

  async reject(customerId: string, quoteId: string, input: TransitionQuoteInput): Promise<Quote> {
    const current = await this.ensureQuoteExists(customerId, quoteId);

    if (current.status !== 'sent') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in sent status' });
    }

    const quote = await this.quotesRepository.reject(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    this.eventBus.emit('quote.rejected', buildQuoteTransitionPayload(customerId, quoteId, input.actorUserId));

    return quote;
  }

  async archive(customerId: string, quoteId: string, input: ArchiveQuoteInput): Promise<Quote> {
    await this.ensureQuoteExists(customerId, quoteId);
    const quote = await this.quotesRepository.archive(customerId, quoteId, input.actorUserId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    this.eventBus.emit('quote.archived', buildQuoteTransitionPayload(customerId, quoteId, input.actorUserId));

    return quote;
  }

  async listLineItems(customerId: string, quoteId: string): Promise<{ data: QuoteLineItem[] }> {
    await this.ensureQuoteExists(customerId, quoteId);

    return { data: await this.quotesRepository.listLineItems(quoteId) };
  }

  async addLineItem(customerId: string, quoteId: string, input: CreateQuoteLineItemInput): Promise<QuoteLineItem> {
    const quote = await this.ensureQuoteExists(customerId, quoteId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const lineItem = await this.quotesRepository.addLineItem(quoteId, input);
    this.eventBus.emit('quote.line_item_added', buildQuoteLineItemPayload(customerId, quoteId, lineItem.id, input.actorUserId));

    return lineItem;
  }

  async updateLineItem(customerId: string, quoteId: string, lineItemId: string, input: UpdateQuoteLineItemInput): Promise<QuoteLineItem> {
    const quote = await this.ensureQuoteExists(customerId, quoteId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const lineItem = await this.quotesRepository.updateLineItem(quoteId, lineItemId, input);

    if (lineItem === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote line item not found' });
    }

    const changedFields = Object.keys(input).filter((key) => key !== 'actorUserId');
    this.eventBus.emit(
      'quote.line_item_updated',
      buildQuoteLineItemUpdatedPayload(customerId, quoteId, lineItemId, input.actorUserId, changedFields)
    );

    return lineItem;
  }

  async removeLineItem(customerId: string, quoteId: string, lineItemId: string, input: TransitionQuoteInput): Promise<QuoteLineItem> {
    const quote = await this.ensureQuoteExists(customerId, quoteId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const lineItem = await this.quotesRepository.removeLineItem(quoteId, lineItemId);

    if (lineItem === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote line item not found' });
    }

    this.eventBus.emit('quote.line_item_removed', buildQuoteLineItemPayload(customerId, quoteId, lineItemId, input.actorUserId));

    return lineItem;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.quotesRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }

  private async ensureQuoteExists(customerId: string, quoteId: string): Promise<Quote> {
    const quote = await this.quotesRepository.findById(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    return quote;
  }

  private ensureValidDiscount(discountCents: number, subtotalCents: number): void {
    if (discountCents > subtotalCents) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { discountCents: ['Discount must not exceed subtotal'] }
      });
    }
  }
}
