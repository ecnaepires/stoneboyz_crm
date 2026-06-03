import { Inject, Injectable } from '@nestjs/common';
import type { CreatePriceListInput, ListPriceListsInput, PriceList, UpdatePriceListInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapPriceListRow, type PriceListRow } from './price-list.mapper.js';

interface PriceListCursor {
  id: string;
  updatedAt: string;
}

interface NormalizedListPriceListsInput extends Omit<ListPriceListsInput, 'limit'> {
  limit: number;
}

const UPDATE_COLUMNS = {
  name: 'name',
  description: 'description',
  revision: 'revision',
  currencyCode: 'currency_code',
  defaultTaxRateBps: 'default_tax_rate_bps',
  defaultPaymentTerms: 'default_payment_terms',
  expirationDays: 'expiration_days'
} satisfies Record<Exclude<keyof UpdatePriceListInput, 'actorUserId'>, string>;

export class InvalidPriceListCursorError extends Error {
  constructor() {
    super('Invalid price list cursor');
  }
}

const encodeCursor = (cursor: PriceListCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

const decodeCursor = (cursor: string): PriceListCursor => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<PriceListCursor>;
    if (typeof parsed.id !== 'string' || typeof parsed.updatedAt !== 'string') throw new InvalidPriceListCursorError();
    return { id: parsed.id, updatedAt: parsed.updatedAt };
  } catch (error) {
    if (error instanceof InvalidPriceListCursorError) throw error;
    throw new InvalidPriceListCursorError();
  }
};

@Injectable()
export class PriceListsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(input: NormalizedListPriceListsInput): Promise<{ data: PriceList[]; hasMore: boolean; nextCursor: string | null }> {
    const values: unknown[] = [];
    const where = [input.includeArchived ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (input.status !== undefined) where.push(`status = ${addValue(input.status)}`);
    if (input.search !== undefined) where.push(`name ILIKE ${addValue(`%${input.search}%`)}`);
    if (input.cursor !== undefined) {
      const cursor = decodeCursor(input.cursor);
      where.push(
        `(updated_at < ${addValue(cursor.updatedAt)} OR (updated_at = ${addValue(cursor.updatedAt)} AND id > ${addValue(cursor.id)}))`
      );
    }

    const limitValue = addValue(input.limit + 1);
    const result = await this.pool.query<PriceListRow>(
      `
        SELECT *
        FROM price_lists
        WHERE ${where.join(' AND ')}
        ORDER BY updated_at DESC, id ASC
        LIMIT ${limitValue}
      `,
      values
    );
    const rows = result.rows.slice(0, input.limit);
    return {
      data: rows.map(mapPriceListRow),
      hasMore: result.rows.length > input.limit,
      nextCursor:
        result.rows.length > input.limit && rows.at(-1) !== undefined
          ? encodeCursor({ id: rows.at(-1)!.id, updatedAt: rows.at(-1)!.updated_at.toISOString() })
          : null
    };
  }

  async create(input: CreatePriceListInput): Promise<PriceList> {
    const result = await this.pool.query<PriceListRow>(
      `
        INSERT INTO price_lists (
          name, description, revision, currency_code, default_tax_rate_bps,
          default_payment_terms, expiration_days, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        input.name,
        input.description ?? null,
        input.revision ?? 1,
        input.currencyCode ?? 'USD',
        input.defaultTaxRateBps ?? 0,
        input.defaultPaymentTerms ?? null,
        input.expirationDays ?? null,
        input.actorUserId
      ]
    );
    return mapPriceListRow(result.rows[0] as PriceListRow);
  }

  async findById(priceListId: string, includeArchived = false): Promise<PriceList | null> {
    const result = await this.pool.query<PriceListRow>(
      `
        SELECT *
        FROM price_lists
        WHERE id = $1 ${includeArchived ? '' : 'AND deleted_at IS NULL'}
      `,
      [priceListId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapPriceListRow(row);
  }

  async update(priceListId: string, input: UpdatePriceListInput): Promise<PriceList | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdatePriceListInput;
      if (Object.hasOwn(input, typedFieldName)) assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
    }

    assignments.push('updated_at = now()');
    const idValue = addValue(priceListId);
    const result = await this.pool.query<PriceListRow>(
      `
        UPDATE price_lists
        SET ${assignments.join(', ')}
        WHERE id = ${idValue} AND deleted_at IS NULL
        RETURNING *
      `,
      values
    );
    const row = result.rows[0];
    return row === undefined ? null : mapPriceListRow(row);
  }

  async activate(priceListId: string): Promise<PriceList | null> {
    const result = await this.pool.query<PriceListRow>(
      `UPDATE price_lists SET status = 'active', updated_at = now() WHERE id = $1 AND deleted_at IS NULL AND status = 'draft' RETURNING *`,
      [priceListId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapPriceListRow(row);
  }

  async archive(priceListId: string, actorUserId: string): Promise<PriceList | null> {
    const result = await this.pool.query<PriceListRow>(
      `
        UPDATE price_lists
        SET status = 'archived', deleted_at = now(), deleted_by_user_id = $2, updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL AND status = 'draft'
        RETURNING *
      `,
      [priceListId, actorUserId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapPriceListRow(row);
  }
}
