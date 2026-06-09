import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddOrderPaymentInput,
  ConvertQuoteToOrderInput,
  ListOrdersInput,
  Order,
  OrderPayment,
  OrderWithPayments,
  VoidOrderPaymentInput,
  RequestOrderDepositInput
} from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { DATABASE_POOL } from '../database.provider.js';
import { EventBus } from '../events/event-bus.js';
import { buildProjectStageChangedPayload } from '../projects/project-events.js';
import { QuotesRepository } from '../quotes/quotes.repository.js';
import { buildOrderPayload, buildOrderPaymentPayload } from './order-events.js';
import { InvalidOrderCursorError, OrdersRepository } from './orders.repository.js';

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
        notes: null,
        termsAndConditions: quote.termsAndConditions
      });
      await this.ordersRepository.copyQuoteAreasToOrder(client, order.id, quoteId);
      await this.ordersRepository.copyQuoteLineItemsToOrder(client, order.id, quoteId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const snapshotOrder = await this.ordersRepository.findById(customerId, order.id);
    const orderWithSnapshots = snapshotOrder ?? order;

    this.eventBus.emit('order.created', buildOrderPayload(customerId, order.id, input.actorUserId));

    return { ...orderWithSnapshots, payments: [] };
  }

  async getById(customerId: string, orderId: string): Promise<OrderWithPayments> {
    await this.ensureCustomerExists(customerId);
    const order = await this.ensureOrderExists(customerId, orderId);
    const payments = await this.ordersRepository.listPayments(orderId);

    return { ...order, payments };
  }

  async requestDeposit(customerId: string, orderId: string, input: RequestOrderDepositInput): Promise<OrderWithPayments> {
    const existingOrder = await this.ensureOrderExists(customerId, orderId);

    if (input.depositRequiredCents > existingOrder.totalCents) {
      throw new BadRequestException({
        code: 'DEPOSIT_EXCEEDS_ORDER_TOTAL',
        message: 'Deposit cannot be greater than the order total'
      });
    }

    const client = await this.pool.connect();
    let order: Order | null = null;
    let advancedProjectIds: string[] = [];

    try {
      await client.query('BEGIN');
      order = await this.ordersRepository.requestDeposit(client, customerId, orderId, input);

      if (order === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      advancedProjectIds = await this.ordersRepository.advanceLinkedProjectToDeposit(client, customerId, orderId);
      await this.ordersRepository.syncDepositChecklistForOrder(client, customerId, orderId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (order === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Order not found' });
    }

    this.eventBus.emit('order.deposit_requested', buildOrderPayload(customerId, orderId, input.actorUserId));
    for (const projectId of advancedProjectIds) {
      this.eventBus.emit(
        'project.stage_changed',
        buildProjectStageChangedPayload(projectId, input.actorUserId, 'new', 'deposit', 'auto')
      );
    }

    const payments = await this.ordersRepository.listPayments(orderId);
    return { ...order, payments };
  }

  async addPayment(customerId: string, orderId: string, input: AddOrderPaymentInput): Promise<OrderPayment> {
    const order = await this.ensureOrderExists(customerId, orderId);

    if (input.amountCents > order.balanceDueCents) {
      throw new ConflictException({
        code: 'PAYMENT_EXCEEDS_BALANCE',
        message: 'Payment cannot be greater than the order balance'
      });
    }

    const client = await this.pool.connect();
    let payment: OrderPayment | null = null;

    try {
      await client.query('BEGIN');
      payment = await this.ordersRepository.addPayment(client, orderId, input);
      await this.ordersRepository.syncDepositChecklistForOrder(client, customerId, orderId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (payment === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment not found' });
    }

    this.eventBus.emit('order.payment_added', buildOrderPaymentPayload(customerId, orderId, payment.id, input.actorUserId));

    return payment;
  }

  async voidPayment(customerId: string, orderId: string, paymentId: string, input: VoidOrderPaymentInput): Promise<OrderPayment> {
    await this.ensureOrderExists(customerId, orderId);

    const client = await this.pool.connect();
    let payment: OrderPayment | null = null;

    try {
      await client.query('BEGIN');
      payment = await this.ordersRepository.voidPayment(client, orderId, paymentId, input.actorUserId, input.voidReason);

      if (payment === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment not found' });
      }

      await this.ordersRepository.syncDepositChecklistForOrder(client, customerId, orderId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (payment === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment not found' });
    }

    this.eventBus.emit('order.payment_voided', buildOrderPaymentPayload(customerId, orderId, paymentId, input.actorUserId));

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
