import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type {
  ArchiveQuoteInput,
  CreateQuoteInput,
  CreateQuoteLineItemInput,
  ListQuotesInput,
  Quote,
  QuoteLineItem,
  QuoteWithAreas,
  QuoteWithLineItems,
  TransitionQuoteInput,
  UpdateQuoteInput,
  UpdateQuoteLineItemInput
} from '@stoneboyz/domain';
import type { DatabaseError, Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { EventBus } from '../events/event-bus.js';
import { SlabsService } from '../inventory/slabs.service.js';
import {
  buildQuoteCreatedPayload,
  buildQuoteLineItemPayload,
  buildQuoteLineItemUpdatedPayload,
  buildQuoteTransitionPayload,
  buildQuoteUpdatedPayload
} from './quote-events.js';
import { QuoteAreasRepository } from './quote-areas.repository.js';
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
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly quotesRepository: QuotesRepository,
    private readonly quoteAreasRepository: QuoteAreasRepository,
    private readonly eventBus: EventBus,
    private readonly slabsService: SlabsService
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
      const hasSlabReservations = (input.lineItems ?? []).some((lineItem) => lineItem.slabId !== undefined);
      const quote = hasSlabReservations
        ? await this.createWithReservedLineItems(customerId, input)
        : await this.quotesRepository.create(customerId, input);
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

  async getById(customerId: string, quoteId: string): Promise<QuoteWithAreas> {
    await this.ensureCustomerExists(customerId);
    const quote = await this.ensureQuoteExists(customerId, quoteId);
    const [lineItems, areas] = await Promise.all([
      this.quotesRepository.listLineItems(quoteId),
      this.quoteAreasRepository.listByQuoteId(quoteId)
    ]);

    return { ...quote, lineItems, areas };
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

    const client = await this.pool.connect();
    let quote: Quote | null;

    try {
      await client.query('BEGIN');
      await this.slabsService.promoteNegotiatingManyForQuote(quoteId, input.actorUserId, client);
      quote = await this.quotesRepository.acceptWithClient(client, customerId, quoteId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

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

    const client = await this.pool.connect();
    let quote: Quote | null;

    try {
      await client.query('BEGIN');
      await this.slabsService.releaseNegotiatingManyForQuote(quoteId, input.actorUserId, client);
      await this.slabsService.releaseManyForQuote(quoteId, input.actorUserId, client);
      quote = await this.quotesRepository.rejectWithClient(client, customerId, quoteId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    this.eventBus.emit('quote.rejected', buildQuoteTransitionPayload(customerId, quoteId, input.actorUserId));

    return quote;
  }

  async expire(customerId: string, quoteId: string, input: TransitionQuoteInput): Promise<Quote> {
    const current = await this.ensureQuoteExists(customerId, quoteId);

    if (current.status !== 'sent') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in sent status' });
    }

    const client = await this.pool.connect();
    let quote: Quote | null;

    try {
      await client.query('BEGIN');
      await this.slabsService.releaseNegotiatingManyForQuote(quoteId, input.actorUserId, client);
      quote = await this.quotesRepository.expireWithClient(client, customerId, quoteId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    this.eventBus.emit('quote.expired', buildQuoteTransitionPayload(customerId, quoteId, input.actorUserId));

    return quote;
  }

  async archive(customerId: string, quoteId: string, input: ArchiveQuoteInput): Promise<Quote> {
    await this.ensureQuoteExists(customerId, quoteId);
    const client = await this.pool.connect();
    let quote: Quote | null;

    try {
      await client.query('BEGIN');
      await this.slabsService.releaseNegotiatingManyForQuote(quoteId, input.actorUserId, client);
      await this.slabsService.releaseManyForQuote(quoteId, input.actorUserId, client);
      quote = await this.quotesRepository.archiveWithClient(client, customerId, quoteId, input.actorUserId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

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

    let lineItem: QuoteLineItem;

    if (input.slabId !== undefined) {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');
        await this.slabsService.reserveForQuote(input.slabId, quoteId, input.actorUserId, client);
        lineItem = await this.quotesRepository.addLineItemWithClient(client, quoteId, input);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      lineItem = await this.quotesRepository.addLineItem(quoteId, input);
    }

    this.eventBus.emit('quote.line_item_added', buildQuoteLineItemPayload(customerId, quoteId, lineItem.id, input.actorUserId));

    return lineItem;
  }

  async updateLineItem(customerId: string, quoteId: string, lineItemId: string, input: UpdateQuoteLineItemInput): Promise<QuoteLineItem> {
    const quote = await this.ensureQuoteExists(customerId, quoteId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const currentLineItem = (await this.quotesRepository.listLineItems(quoteId)).find((item) => item.id === lineItemId);

    if (currentLineItem === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote line item not found' });
    }

    let lineItem: QuoteLineItem | null;

    if (Object.hasOwn(input, 'slabId') && input.slabId !== currentLineItem.slabId) {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        if (input.slabId !== null && input.slabId !== undefined) {
          await this.slabsService.reserveForQuote(input.slabId, quoteId, input.actorUserId, client);
        }

        lineItem = await this.quotesRepository.updateLineItemWithClient(client, quoteId, lineItemId, input);

        if (currentLineItem.slabId !== null) {
          await this.slabsService.releaseForQuote(currentLineItem.slabId, quoteId, input.actorUserId, client);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      lineItem = await this.quotesRepository.updateLineItem(quoteId, lineItemId, input);
    }

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

    const client = await this.pool.connect();
    let lineItem: QuoteLineItem | null;

    try {
      await client.query('BEGIN');
      lineItem = await this.quotesRepository.removeLineItemWithClient(client, quoteId, lineItemId);

      if (lineItem !== null && lineItem.slabId !== null) {
        await this.slabsService.releaseForQuote(lineItem.slabId, quoteId, input.actorUserId, client);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

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

  private async createWithReservedLineItems(customerId: string, input: CreateQuoteInput): Promise<Quote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const created = await this.quotesRepository.createHeaderWithClient(client, customerId, input);

      for (const lineItem of input.lineItems ?? []) {
        if (lineItem.slabId !== undefined) {
          await this.slabsService.reserveForQuote(lineItem.slabId, created.id, lineItem.actorUserId, client);
        }

        await this.quotesRepository.addLineItemWithClient(client, created.id, lineItem);
      }

      const quote = await this.quotesRepository.findByIdWithClient(client, customerId, created.id);
      await client.query('COMMIT');

      return quote as Quote;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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
