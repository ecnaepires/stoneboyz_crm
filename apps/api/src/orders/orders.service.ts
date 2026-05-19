import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AddOrderPaymentInput, ConvertQuoteToOrderInput, ListOrdersInput, Order, OrderPayment, OrderWithPayments } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { DATABASE_POOL } from '../database.provider.js';
import { EventBus } from '../events/event-bus.js';
import { QuotesRepository } from '../quotes/quotes.repository.js';
import { buildOrderPayload, buildOrderPaymentPayload } from './order-events.js';
import { InvalidOrderCursorError, OrdersRepository } from './orders.repository.js';
import { BadRequestException } from '@nestjs/common';
import { computeTotalCents } from '../quotes/quote.mapper.js';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly ordersRepository: OrdersRepository,
    private readonly quotesRepository: QuotesRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(
    customerId: string,
    input: ListOrdersInput
  ): Promise<{ data: Order[]; nextCursor: string | null; hasMore: boolean }> {
    await this.ensureCustomerExists(customerId);

    try {
      return await this.ordersRepository.list(customerId, {
        ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
        limit: input.limit ?? 25,
        ...(input.paymentStatus !== undefined ? { paymentStatus: input.paymentStatus } : {}),
        includeArchived: input.includeArchived ?? false
      });
    } catch (error) {
      if (error instanceof InvalidOrderCursorError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { cursor: ['Invalid cursor'] }
        });
      }
      throw error;
    }
  }

  async convertQuoteToOrder(customerId: string, quoteId: string, input: ConvertQuoteToOrderInput): Promise<OrderWithPayments> {
    await this.ensureCustomerExists(customerId);

    const quote = await this.quotesRepository.findById(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    if (quote.status !== 'accepted') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote must be accepted before converting to order' });
    }

    const alreadyExists = await this.ordersRepository.activeOrderExistsForQuote(quoteId);

    if (alreadyExists) {
      throw new ConflictException({ code: 'ORDER_ALREADY_EXISTS', message: 'An active order already exists for this quote' });
    }

    const client = await this.pool.connect();
    let order: Order;

    try {
      await client.query('BEGIN');
      const orderNumber = await this.ordersRepository.nextOrderNumber(client);
      order = await this.ordersRepository.create(client, customerId, quoteId, {
        orderNumber,
        title: quote.title,
        saleDate: input.saleDate,
        subtotalCents: quote.subtotalCents,
        discountCents: quote.discountCents,
        taxRateBps: quote.taxRateBps,
        totalCents: quote.totalCents,
        notes: quote.notes,
        termsAndConditions: quote.termsAndConditions
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    this.eventBus.emit('order.created', buildOrderPayload(customerId, order.id, input.actorUserId));

    return { ...order, payments: [] };
  }

  async getById(customerId: string, orderId: string): Promise<OrderWithPayments> {
    await this.ensureCustomerExists(customerId);
    const order = await this.ensureOrderExists(customerId, orderId);
    const payments = await this.ordersRepository.listPayments(orderId);

    return { ...order, payments };
  }

  async addPayment(customerId: string, orderId: string, input: AddOrderPaymentInput): Promise<OrderPayment> {
    await this.ensureOrderExists(customerId, orderId);

    const payment = await this.ordersRepository.addPayment(this.pool, orderId, input);

    this.eventBus.emit('order.payment_added', buildOrderPaymentPayload(customerId, orderId, payment.id, input.actorUserId));

    return payment;
  }

  async removePayment(customerId: string, orderId: string, paymentId: string, actorUserId: string): Promise<OrderPayment> {
    await this.ensureOrderExists(customerId, orderId);

    const payment = await this.ordersRepository.removePayment(orderId, paymentId);

    if (payment === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment not found' });
    }

    this.eventBus.emit('order.payment_removed', buildOrderPaymentPayload(customerId, orderId, paymentId, actorUserId));

    return payment;
  }

  async archive(customerId: string, orderId: string, actorUserId: string): Promise<Order> {
    await this.ensureOrderExists(customerId, orderId);

    const order = await this.ordersRepository.archive(customerId, orderId, actorUserId);

    if (order === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Order not found' });
    }

    this.eventBus.emit('order.archived', buildOrderPayload(customerId, orderId, actorUserId));

    return order;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.ordersRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }

  private async ensureOrderExists(customerId: string, orderId: string): Promise<Order> {
    const order = await this.ordersRepository.findById(customerId, orderId);

    if (order === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Order not found' });
    }

    return order;
  }
}
