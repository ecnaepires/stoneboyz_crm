import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateQuoteInput,
  CreateQuoteLineItemInput,
  ListQuotesInput,
  Quote,
  QuoteLineItem,
  UpdateQuoteInput,
  UpdateQuoteLineItemInput
} from '@stoneboyz/domain';
import type { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapQuoteLineItemRow, mapQuoteRow, type QuoteLineItemRow, type QuoteRow } from './quote.mapper.js';

type Queryable = Pick<Pool, 'query'> | PoolClient;
interface QuoteListInput {
  cursor?: string | undefined;
  limit: number;
  status?: ListQuotesInput['status'] | undefined;
  projectId?: string | undefined;
  includeArchived: boolean;
}

interface QuoteCursor {
  id: string;
  updatedAt: string;
}

const quoteSubtotalSelect = (quoteAlias: string): string => `
  COALESCE(
    (
      SELECT SUM(COALESCE(gpl.override_price_cents, gpl.line_total_cents))
      FROM quote_areas qa
      INNER JOIN generated_price_lines gpl ON gpl.quote_area_id = qa.id
      WHERE qa.quote_id = ${quoteAlias}.id
    ),
    (
      SELECT SUM(FLOOR(qli.qty * (qli.unit_price_cents + qli.labor_price_cents)))
      FROM quote_line_items qli
      WHERE qli.quote_id = ${quoteAlias}.id
    ),
    0
  )::integer AS subtotal_cents
`;

const QUOTE_SELECT = (quoteAlias: string): string => `
  ${quoteAlias}.*,
  ${quoteSubtotalSelect(quoteAlias)}
`;

const UPDATE_COLUMNS = {
  title: 'title',
  projectId: 'project_id',
  phaseId: 'phase_id',
  priceListId: 'price_list_id',
  validUntil: 'valid_until',
  discountCents: 'discount_cents',
  taxRateBps: 'tax_rate_bps',
  termsAndConditions: 'terms_and_conditions'
} satisfies Record<Exclude<keyof UpdateQuoteInput, 'actorUserId'>, string>;

const LINE_ITEM_UPDATE_COLUMNS = {
  quoteAreaId: 'quote_area_id',
  slabId: 'slab_id',
  sortOrder: 'sort_order',
  stoneType: 'stone_type',
  lengthIn: 'length_in',
  widthIn: 'width_in',
  thicknessCm: 'thickness_cm',
  edgeProfile: 'edge_profile',
  qty: 'qty',
  qtyUnit: 'qty_unit',
  unitPriceCents: 'unit_price_cents',
  laborPriceCents: 'labor_price_cents',
  notes: 'notes'
} satisfies Record<Exclude<keyof UpdateQuoteLineItemInput, 'actorUserId'>, string>;

export class InvalidQuoteCursorError extends Error {
  constructor() {
    super('Invalid quote cursor');
  }
}

const encodeCursor = (cursor: QuoteCursor): string => {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
};

const decodeCursor = (cursor: string): QuoteCursor => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<QuoteCursor>;

    if (typeof parsed.id !== 'string' || typeof parsed.updatedAt !== 'string') {
      throw new InvalidQuoteCursorError();
    }

    return {
      id: parsed.id,
      updatedAt: parsed.updatedAt
    };
  } catch (error) {
    if (error instanceof InvalidQuoteCursorError) {
      throw error;
    }

    throw new InvalidQuoteCursorError();
  }
};

@Injectable()
export class QuotesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async customerExists(customerId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM customers
          WHERE id = $1 AND deleted_at IS NULL
        ) AS "exists"
      `,
      [customerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async list(customerId: string, input: QuoteListInput): Promise<{ data: Quote[]; hasMore: boolean; nextCursor: string | null }> {
    const values: unknown[] = [customerId];
    const where = ['q.customer_id = $1'];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    where.push(input.includeArchived ? 'q.deleted_at IS NOT NULL' : 'q.deleted_at IS NULL');

    if (input.status !== undefined) {
      where.push(`q.status = ${addValue(input.status)}`);
    }

    if (input.projectId !== undefined) {
      where.push(`q.project_id = ${addValue(input.projectId)}`);
    }

    if (input.cursor !== undefined) {
      const cursor = decodeCursor(input.cursor);
      where.push(
        `(q.updated_at < ${addValue(cursor.updatedAt)} OR (q.updated_at = ${addValue(cursor.updatedAt)} AND q.id > ${addValue(cursor.id)}))`
      );
    }

    const limitValue = addValue(input.limit + 1);
    const result = await this.pool.query<QuoteRow>(
      `
        SELECT ${QUOTE_SELECT('q')}
        FROM quotes q
        WHERE ${where.join(' AND ')}
        ORDER BY q.updated_at DESC, q.id ASC
        LIMIT ${limitValue}
      `,
      values
    );

    const rows = result.rows.slice(0, input.limit);

    return {
      data: rows.map(mapQuoteRow),
      hasMore: result.rows.length > input.limit,
      nextCursor:
        result.rows.length > input.limit && rows.at(-1) !== undefined
          ? encodeCursor({ id: rows.at(-1)!.id, updatedAt: rows.at(-1)!.updated_at.toISOString() })
          : null
    };
  }

  async create(customerId: string, input: CreateQuoteInput): Promise<Quote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const created = await this.createHeaderWithClient(client, customerId, input);
      const quoteId = created.id;

      for (const lineItem of input.lineItems ?? []) {
        await this.addLineItemWithClient(client, quoteId, lineItem);
      }

      const quote = await this.findByIdWithClient(client, customerId, quoteId);
      await client.query('COMMIT');

      return quote as Quote;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createHeaderWithClient(client: PoolClient, customerId: string, input: CreateQuoteInput): Promise<Quote> {
    const quoteNumber = await this.nextQuoteNumber(client);
    const priceListId = Object.hasOwn(input, 'priceListId')
      ? input.priceListId ?? null
      : await this.findCustomerPriceListId(client, customerId);
    const result = await client.query<QuoteRow>(
      `
        INSERT INTO quotes (
          customer_id,
          project_id,
          phase_id,
          price_list_id,
          quote_number,
          title,
          valid_until,
          discount_cents,
          tax_rate_bps,
          terms_and_conditions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *, 0::integer AS subtotal_cents
      `,
      [
        customerId,
        input.projectId ?? null,
        input.phaseId ?? null,
        priceListId,
        quoteNumber,
        input.title,
        input.validUntil ?? null,
        input.discountCents ?? 0,
        input.taxRateBps ?? 0,
        input.termsAndConditions ?? null
      ]
    );

    return mapQuoteRow(result.rows[0] as QuoteRow);
  }

  async findById(customerId: string, quoteId: string): Promise<Quote | null> {
    return this.findByIdWithClient(this.pool, customerId, quoteId);
  }

  async update(customerId: string, quoteId: string, input: UpdateQuoteInput): Promise<Quote | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateQuoteInput;

      if (Object.hasOwn(input, typedFieldName)) {
        assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
      }
    }

    assignments.push('updated_at = now()');

    const customerPlaceholder = addValue(customerId);
    const quotePlaceholder = addValue(quoteId);

    const result = await this.pool.query<QuoteRow>(
      `
        WITH updated_quote AS (
          UPDATE quotes
          SET ${assignments.join(', ')}
          WHERE customer_id = ${customerPlaceholder} AND id = ${quotePlaceholder} AND deleted_at IS NULL
          RETURNING *
        )
        SELECT uq.*, ${quoteSubtotalSelect('uq')}
        FROM updated_quote uq
      `,
      values
    );

    const row = result.rows[0];

    return row === undefined ? null : mapQuoteRow(row);
  }

  async send(customerId: string, quoteId: string): Promise<Quote | null> {
    return this.transition(customerId, quoteId, 'sent', 'sent_at');
  }

  async accept(customerId: string, quoteId: string): Promise<Quote | null> {
    return this.transition(customerId, quoteId, 'accepted', 'accepted_at');
  }

  async reject(customerId: string, quoteId: string): Promise<Quote | null> {
    return this.transition(customerId, quoteId, 'rejected', 'rejected_at');
  }

  async expire(customerId: string, quoteId: string): Promise<Quote | null> {
    return this.transition(customerId, quoteId, 'expired', null);
  }

  async rejectWithClient(client: PoolClient, customerId: string, quoteId: string): Promise<Quote | null> {
    return this.transitionWithClient(client, customerId, quoteId, 'rejected', 'rejected_at');
  }

  async acceptWithClient(client: PoolClient, customerId: string, quoteId: string): Promise<Quote | null> {
    return this.transitionWithClient(client, customerId, quoteId, 'accepted', 'accepted_at');
  }

  async expireWithClient(client: PoolClient, customerId: string, quoteId: string): Promise<Quote | null> {
    return this.transitionWithClient(client, customerId, quoteId, 'expired', null);
  }

  async archive(customerId: string, quoteId: string, actorUserId: string): Promise<Quote | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await client.query<QuoteRow>(
        `
          UPDATE quotes
          SET deleted_at = now(), deleted_by_user_id = $3, updated_at = now()
          WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
          RETURNING *, 0::integer AS subtotal_cents
        `,
        [customerId, quoteId, actorUserId]
      );
      await client.query('DELETE FROM quote_line_items WHERE quote_id = $1', [quoteId]);
      await client.query('COMMIT');

      const row = result.rows[0];
      return row === undefined ? null : mapQuoteRow(row);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async archiveWithClient(client: PoolClient, customerId: string, quoteId: string, actorUserId: string): Promise<Quote | null> {
    const result = await client.query<QuoteRow>(
      `
        UPDATE quotes
        SET deleted_at = now(), deleted_by_user_id = $3, updated_at = now()
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
        RETURNING *, 0::integer AS subtotal_cents
      `,
      [customerId, quoteId, actorUserId]
    );
    await client.query('DELETE FROM quote_line_items WHERE quote_id = $1', [quoteId]);

    const row = result.rows[0];
    return row === undefined ? null : mapQuoteRow(row);
  }

  async listLineItems(quoteId: string): Promise<QuoteLineItem[]> {
    const result = await this.pool.query<QuoteLineItemRow>(
      `
        SELECT *
        FROM quote_line_items
        WHERE quote_id = $1
        ORDER BY sort_order ASC, created_at ASC, id ASC
      `,
      [quoteId]
    );

    return result.rows.map(mapQuoteLineItemRow);
  }

  async addLineItem(quoteId: string, input: CreateQuoteLineItemInput): Promise<QuoteLineItem> {
    return this.addLineItemWithClient(this.pool, quoteId, input);
  }

  async addLineItemWithClient(client: Queryable, quoteId: string, input: CreateQuoteLineItemInput): Promise<QuoteLineItem> {
    const result = await client.query<QuoteLineItemRow>(
      `
        INSERT INTO quote_line_items (
          quote_id,
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
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `,
      [
        quoteId,
        input.quoteAreaId ?? null,
        input.slabId ?? null,
        input.sortOrder ?? 0,
        input.stoneType,
        input.lengthIn ?? null,
        input.widthIn ?? null,
        input.thicknessCm ?? null,
        input.edgeProfile ?? null,
        input.qty,
        input.qtyUnit,
        input.unitPriceCents,
        input.laborPriceCents ?? 0,
        input.notes ?? null
      ]
    );

    return mapQuoteLineItemRow(result.rows[0] as QuoteLineItemRow);
  }

  async updateLineItem(quoteId: string, lineItemId: string, input: UpdateQuoteLineItemInput): Promise<QuoteLineItem | null> {
    return this.updateLineItemWithClient(this.pool, quoteId, lineItemId, input);
  }

  async updateLineItemWithClient(
    client: Queryable,
    quoteId: string,
    lineItemId: string,
    input: UpdateQuoteLineItemInput
  ): Promise<QuoteLineItem | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(LINE_ITEM_UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateQuoteLineItemInput;

      if (Object.hasOwn(input, typedFieldName)) {
        assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
      }
    }

    assignments.push('updated_at = now()');
    const quotePlaceholder = addValue(quoteId);
    const lineItemPlaceholder = addValue(lineItemId);

    const result = await client.query<QuoteLineItemRow>(
      `
        UPDATE quote_line_items
        SET ${assignments.join(', ')}
        WHERE quote_id = ${quotePlaceholder} AND id = ${lineItemPlaceholder}
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    return row === undefined ? null : mapQuoteLineItemRow(row);
  }

  async removeLineItem(quoteId: string, lineItemId: string): Promise<QuoteLineItem | null> {
    return this.removeLineItemWithClient(this.pool, quoteId, lineItemId);
  }

  async removeLineItemWithClient(client: Queryable, quoteId: string, lineItemId: string): Promise<QuoteLineItem | null> {
    const result = await client.query<QuoteLineItemRow>(
      `
        DELETE FROM quote_line_items
        WHERE quote_id = $1 AND id = $2
        RETURNING *
      `,
      [quoteId, lineItemId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapQuoteLineItemRow(row);
  }

  async findByIdWithClient(client: Queryable, customerId: string, quoteId: string): Promise<Quote | null> {
    const result = await client.query<QuoteRow>(
      `
        SELECT ${QUOTE_SELECT('q')}
        FROM quotes q
        WHERE q.customer_id = $1 AND q.id = $2 AND q.deleted_at IS NULL
      `,
      [customerId, quoteId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapQuoteRow(row);
  }

  private async transition(customerId: string, quoteId: string, status: Quote['status'], timestampColumn: string | null): Promise<Quote | null> {
    return this.transitionWithClient(this.pool, customerId, quoteId, status, timestampColumn);
  }

  private async transitionWithClient(
    client: Queryable,
    customerId: string,
    quoteId: string,
    status: Quote['status'],
    timestampColumn: string | null
  ): Promise<Quote | null> {
    const timestampAssignment = timestampColumn === null ? '' : `, ${timestampColumn} = now()`;
    const result = await client.query<QuoteRow>(
      `
        WITH updated_quote AS (
          UPDATE quotes
          SET status = $3${timestampAssignment}, updated_at = now()
          WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
          RETURNING *
        )
        SELECT uq.*, ${quoteSubtotalSelect('uq')}
        FROM updated_quote uq
      `,
      [customerId, quoteId, status]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapQuoteRow(row);
  }

  private async nextQuoteNumber(client: PoolClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `Q-${year}-`;

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [prefix]);

    const result = await client.query<{ next_number: number }>(
      `
        SELECT COALESCE(MAX(SUBSTRING(quote_number FROM 8)::integer), 0) + 1 AS next_number
        FROM quotes
        WHERE quote_number LIKE $1
      `,
      [`${prefix}%`]
    );

    const nextNumber = result.rows[0]?.next_number ?? 1;

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

  private async findCustomerPriceListId(client: PoolClient, customerId: string): Promise<string | null> {
    const result = await client.query<{ price_list_id: string | null }>(
      `
        SELECT price_list_id
        FROM customers
        WHERE id = $1
      `,
      [customerId]
    );

    return result.rows[0]?.price_list_id ?? null;
  }
}
