import { Inject, Injectable } from '@nestjs/common';
import type {
  AddOrderPaymentInput,
  ListOrdersInput,
  Order,
  OrderArea,
  OrderLineItem,
  OrderPayment,
  OrderPaymentStatus,
  RequestOrderDepositInput
} from '@stoneboyz/domain';
import type { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import {
  mapOrderAreaRow,
  mapOrderLineItemRow,
  mapOrderPaymentRow,
  mapOrderRow,
  type OrderAreaRow,
  type OrderLineItemRow,
  type OrderPaymentRow,
  type OrderRow
} from './order.mapper.js';

type Queryable = Pick<Pool, 'query'> | PoolClient;

interface OrderCursor {
  id: string;
  updatedAt: string;
}

const ORDER_SELECT = `
  o.*,
  COALESCE(SUM(op.amount_cents), 0)::integer AS total_paid_cents
`;

export class InvalidOrderCursorError extends Error {
  constructor() {
    super('Invalid order cursor');
  }
}

const encodeCursor = (cursor: OrderCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

const decodeCursor = (cursor: string): OrderCursor => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<OrderCursor>;

    if (typeof parsed.id !== 'string' || typeof parsed.updatedAt !== 'string') {
      throw new InvalidOrderCursorError();
    }

    return { id: parsed.id, updatedAt: parsed.updatedAt };
  } catch (error) {
    if (error instanceof InvalidOrderCursorError) throw error;
    throw new InvalidOrderCursorError();
  }
};

const paymentStatusFilter = (status: OrderPaymentStatus): string => {
  switch (status) {
    case 'paid':
      return 'HAVING COALESCE(SUM(op.amount_cents), 0) >= o.total_cents';
    case 'partially_paid':
      return 'HAVING COALESCE(SUM(op.amount_cents), 0) > 0 AND COALESCE(SUM(op.amount_cents), 0) < o.total_cents';
    case 'unpaid':
      return 'HAVING COALESCE(SUM(op.amount_cents), 0) = 0';
  }
};

@Injectable()
export class OrdersRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async customerExists(customerId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM customers WHERE id = $1 AND deleted_at IS NULL) AS "exists"`,
      [customerId]
    );
    return result.rows[0]?.exists ?? false;
  }

  async activeOrderExistsForQuote(quoteId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM orders WHERE quote_id = $1 AND deleted_at IS NULL) AS "exists"`,
      [quoteId]
    );
    return result.rows[0]?.exists ?? false;
  }

  async list(
    customerId: string,
    input: { cursor?: string; limit: number; paymentStatus?: OrderPaymentStatus; includeArchived: boolean }
  ): Promise<{ data: Order[]; hasMore: boolean; nextCursor: string | null }> {
    const values: unknown[] = [customerId];
    const where = ['o.customer_id = $1'];
    const addValue = (v: unknown): string => { values.push(v); return `$${values.length}`; };

    where.push(input.includeArchived ? 'o.deleted_at IS NOT NULL' : 'o.deleted_at IS NULL');

    if (input.cursor !== undefined) {
      const cursor = decodeCursor(input.cursor);
      where.push(
        `(o.updated_at < ${addValue(cursor.updatedAt)} OR (o.updated_at = ${addValue(cursor.updatedAt)} AND o.id > ${addValue(cursor.id)}))`
      );
    }

    const having = input.paymentStatus !== undefined ? paymentStatusFilter(input.paymentStatus) : '';
    const limitValue = addValue(input.limit + 1);

    const result = await this.pool.query<OrderRow>(
      `
        SELECT ${ORDER_SELECT}
        FROM orders o
        LEFT JOIN order_payments op ON op.order_id = o.id AND op.status = 'recorded'
        WHERE ${where.join(' AND ')}
        GROUP BY o.id
        ${having}
        ORDER BY o.updated_at DESC, o.id ASC
        LIMIT ${limitValue}
      `,
      values
    );

    const rows = result.rows.slice(0, input.limit);

    return {
      data: rows.map(mapOrderRow),
      hasMore: result.rows.length > input.limit,
      nextCursor:
        result.rows.length > input.limit && rows.at(-1) !== undefined
          ? encodeCursor({ id: rows.at(-1)!.id, updatedAt: rows.at(-1)!.updated_at.toISOString() })
          : null
    };
  }

  async create(client: PoolClient, customerId: string, quoteId: string, input: {
    orderNumber: string;
    title: string;
    saleDate: string;
    subtotalCents: number;
    discountCents: number;
    taxRateBps: number;
    totalCents: number;
    notes: string | null;
    termsAndConditions: string | null;
  }): Promise<Order> {
    const result = await client.query<OrderRow>(
      `
        INSERT INTO orders (
          quote_id, customer_id, order_number, title, sale_date,
          subtotal_cents, discount_cents, tax_rate_bps, total_cents,
          notes, terms_and_conditions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *, 0::integer AS total_paid_cents
      `,
      [
        quoteId, customerId, input.orderNumber, input.title, input.saleDate,
        input.subtotalCents, input.discountCents, input.taxRateBps, input.totalCents,
        input.notes, input.termsAndConditions
      ]
    );
    return mapOrderRow(result.rows[0] as OrderRow);
  }

  async findById(customerId: string, orderId: string): Promise<Order | null> {
    const result = await this.pool.query<OrderRow>(
      `
        SELECT ${ORDER_SELECT}
        FROM orders o
        LEFT JOIN order_payments op ON op.order_id = o.id AND op.status = 'recorded'
        WHERE o.customer_id = $1 AND o.id = $2 AND o.deleted_at IS NULL
        GROUP BY o.id
      `,
      [customerId, orderId]
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }

    const [areas, lineItems] = await Promise.all([this.listAreas(orderId), this.listLineItems(orderId)]);

    return {
      ...mapOrderRow(row),
      areas,
      lineItems
    };
  }

  async listAreas(orderId: string): Promise<OrderArea[]> {
    const result = await this.pool.query<OrderAreaRow>(
      `
        SELECT *
        FROM order_areas
        WHERE order_id = $1
        ORDER BY created_at ASC
      `,
      [orderId]
    );

    return result.rows.map(mapOrderAreaRow);
  }

  async listLineItems(orderId: string): Promise<OrderLineItem[]> {
    const result = await this.pool.query<OrderLineItemRow>(
      `
        SELECT *
        FROM order_line_items
        WHERE order_id = $1
        ORDER BY sort_order ASC, created_at ASC, id ASC
      `,
      [orderId]
    );

    return result.rows.map(mapOrderLineItemRow);
  }

  async copyQuoteAreasToOrder(client: PoolClient, orderId: string, quoteId: string): Promise<void> {
    await client.query(
      `
        INSERT INTO order_areas (
          order_id,
          sort_order,
          name,
          material,
          color,
          edge_profile,
          notes,
          created_at,
          updated_at
        )
        SELECT
          $1,
          sort_order,
          name,
          material,
          color,
          edge_profile,
          notes,
          created_at,
          updated_at
        FROM quote_areas
        WHERE quote_id = $2
      `,
      [orderId, quoteId]
    );
  }

  async copyQuoteLineItemsToOrder(client: PoolClient, orderId: string, quoteId: string): Promise<void> {
    await client.query(
      `
        INSERT INTO order_line_items (
          order_id,
          quote_area_id,
          slab_id,
          sort_order,
          stone_type,
          length_in,
          width_in,
          thickness_cm,
          edge_profile,
          qty,
          qty_unit,
          unit_price_cents,
          labor_price_cents,
          notes,
          created_at,
          updated_at
        )
        SELECT
          $1,
          quote_area_id,
          slab_id,
          sort_order,
          stone_type,
          length_in,
          width_in,
          thickness_cm,
          edge_profile,
          qty,
          qty_unit,
          unit_price_cents,
          labor_price_cents,
          notes,
          created_at,
          updated_at
        FROM quote_line_items
        WHERE quote_id = $2
      `,
      [orderId, quoteId]
    );
  }

  async listPayments(orderId: string): Promise<OrderPayment[]> {
    const result = await this.pool.query<OrderPaymentRow>(
      `
        SELECT * FROM order_payments
        WHERE order_id = $1
        ORDER BY payment_date DESC, created_at DESC
      `,
      [orderId]
    );
    return result.rows.map(mapOrderPaymentRow);
  }

  async addPayment(client: Queryable, orderId: string, input: AddOrderPaymentInput): Promise<OrderPayment> {
    const result = await client.query<OrderPaymentRow>(
      `
        INSERT INTO order_payments (order_id, payment_date, amount_cents, payment_method, reference_number, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [orderId, input.paymentDate, input.amountCents, input.paymentMethod, input.referenceNumber ?? null, input.notes ?? null]
    );
    return mapOrderPaymentRow(result.rows[0] as OrderPaymentRow);
  }

  async requestDeposit(
    client: Queryable,
    customerId: string,
    orderId: string,
    input: RequestOrderDepositInput
  ): Promise<Order | null> {
    const result = await client.query<OrderRow>(
      `
        UPDATE orders o
        SET deposit_required_cents = $3,
            deposit_requested_at = COALESCE(deposit_requested_at, now()),
            deposit_requested_by_user_id = COALESCE(deposit_requested_by_user_id, $4),
            updated_at = now()
        WHERE o.customer_id = $1
          AND o.id = $2
          AND o.deleted_at IS NULL
          AND $3 <= o.total_cents
        RETURNING
          o.*,
          (
            SELECT COALESCE(SUM(op.amount_cents), 0)::integer
            FROM order_payments op
            WHERE op.order_id = o.id
              AND op.status = 'recorded'
          ) AS total_paid_cents
      `,
      [customerId, orderId, input.depositRequiredCents, input.actorUserId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapOrderRow(row);
  }

  async advanceLinkedProjectToDeposit(client: Queryable, customerId: string, orderId: string): Promise<string[]> {
    const result = await client.query<{ id: string }>(
      `
        WITH linked_project AS (
          SELECT q.project_id
          FROM orders o
          JOIN quotes q ON q.id = o.quote_id
          WHERE o.customer_id = $1
            AND o.id = $2
            AND o.deleted_at IS NULL
            AND q.project_id IS NOT NULL
        )
        UPDATE projects p
        SET pipeline_stage = 'deposit',
            status = 'active',
            stage_entered_at = now(),
            updated_at = now()
        FROM linked_project lp
        WHERE p.id = lp.project_id
          AND p.archived_at IS NULL
          AND p.pipeline_stage = 'new'
        RETURNING p.id
      `,
      [customerId, orderId]
    );

    return result.rows.map((row) => row.id);
  }

  async syncDepositChecklistForOrder(client: Queryable, customerId: string, orderId: string): Promise<void> {
    await client.query(
      `
        WITH order_deposit AS (
          SELECT
            q.project_id,
            COALESCE(q.phase_id, first_phase.id) AS phase_id,
            o.deposit_required_cents,
            COALESCE(SUM(op.amount_cents), 0)::integer AS total_paid_cents
          FROM orders o
          JOIN quotes q ON q.id = o.quote_id
          LEFT JOIN LATERAL (
            SELECT p.id
            FROM phases p
            WHERE p.project_id = q.project_id
              AND p.deleted_at IS NULL
            ORDER BY p.phase_number ASC, p.created_at ASC, p.id ASC
            LIMIT 1
          ) first_phase ON q.phase_id IS NULL
          LEFT JOIN order_payments op ON op.order_id = o.id AND op.status = 'recorded'
          WHERE o.customer_id = $1
            AND o.id = $2
            AND o.deleted_at IS NULL
          GROUP BY q.project_id, q.phase_id, first_phase.id, o.deposit_required_cents
        )
        INSERT INTO job_checklists (customer_id, project_id, phase_id, deposit_received)
        SELECT
          $1,
          od.project_id,
          od.phase_id,
          (
              od.deposit_required_cents > 0
              AND od.total_paid_cents >= od.deposit_required_cents
          )
        FROM order_deposit od
        WHERE od.project_id IS NOT NULL
          AND od.phase_id IS NOT NULL
        ON CONFLICT (phase_id)
        DO UPDATE
        SET deposit_received = EXCLUDED.deposit_received,
            updated_at = now()
      `,
      [customerId, orderId]
    );
  }

  async voidPayment(
    client: Queryable,
    orderId: string,
    paymentId: string,
    actorUserId: string,
    voidReason?: string
  ): Promise<OrderPayment | null> {
    const result = await client.query<OrderPaymentRow>(
      `
        UPDATE order_payments
        SET status = 'void',
            voided_at = now(),
            voided_by_user_id = $3,
            void_reason = $4,
            updated_at = now()
        WHERE order_id = $1
          AND id = $2
          AND status = 'recorded'
        RETURNING *
      `,
      [orderId, paymentId, actorUserId, voidReason ?? null]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapOrderPaymentRow(row);
  }

  async archive(customerId: string, orderId: string, actorUserId: string): Promise<Order | null> {
    const result = await this.pool.query<OrderRow>(
      `
        UPDATE orders
        SET deleted_at = now(), deleted_by_user_id = $3, updated_at = now()
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
        RETURNING *,
          (
            SELECT COALESCE(SUM(op.amount_cents), 0)::integer
            FROM order_payments op
            WHERE op.order_id = orders.id
              AND op.status = 'recorded'
          ) AS total_paid_cents
      `,
      [customerId, orderId, actorUserId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapOrderRow(row);
  }

  async nextOrderNumber(client: PoolClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `O-${year}-`;
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [prefix]);
    const result = await client.query<{ next_number: number }>(
      `SELECT COALESCE(MAX(SUBSTRING(order_number FROM 8)::integer), 0) + 1 AS next_number FROM orders WHERE order_number LIKE $1`,
      [`${prefix}%`]
    );
    const nextNumber = result.rows[0]?.next_number ?? 1;
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }
}
