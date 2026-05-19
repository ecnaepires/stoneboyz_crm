import { Inject, Injectable } from '@nestjs/common';
import type { CreatePriceListItemInput, PriceListItem, UpdatePriceListItemInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapPriceListItemRow, type PriceListItemRow } from './price-list.mapper.js';

const UPDATE_COLUMNS = {
  category: 'category',
  itemType: 'item_type',
  name: 'name',
  description: 'description',
  unit: 'unit',
  priceCents: 'price_cents',
  sortOrder: 'sort_order',
  taxable: 'taxable',
  allowDiscount: 'allow_discount',
  editableOnQuote: 'editable_on_quote',
  hideOnQuote: 'hide_on_quote'
} satisfies Record<Exclude<keyof UpdatePriceListItemInput, 'actorUserId'>, string>;

@Injectable()
export class PriceListItemsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(priceListId: string): Promise<PriceListItem[]> {
    const result = await this.pool.query<PriceListItemRow>(
      `
        SELECT *
        FROM price_list_items
        WHERE price_list_id = $1
        ORDER BY sort_order ASC, created_at ASC, id ASC
      `,
      [priceListId]
    );
    return result.rows.map(mapPriceListItemRow);
  }

  async create(priceListId: string, input: CreatePriceListItemInput): Promise<PriceListItem> {
    const result = await this.pool.query<PriceListItemRow>(
      `
        INSERT INTO price_list_items (
          price_list_id, category, item_type, name, description, unit, price_cents,
          sort_order, taxable, allow_discount, editable_on_quote, hide_on_quote
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
      [
        priceListId,
        input.category,
        input.itemType,
        input.name,
        input.description ?? null,
        input.unit,
        input.priceCents,
        input.sortOrder ?? 0,
        input.taxable ?? true,
        input.allowDiscount ?? true,
        input.editableOnQuote ?? true,
        input.hideOnQuote ?? false
      ]
    );
    return mapPriceListItemRow(result.rows[0] as PriceListItemRow);
  }

  async findById(priceListId: string, itemId: string): Promise<PriceListItem | null> {
    const result = await this.pool.query<PriceListItemRow>(
      `SELECT * FROM price_list_items WHERE price_list_id = $1 AND id = $2`,
      [priceListId, itemId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapPriceListItemRow(row);
  }

  async update(priceListId: string, itemId: string, input: UpdatePriceListItemInput): Promise<PriceListItem | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdatePriceListItemInput;
      if (Object.hasOwn(input, typedFieldName)) assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
    }

    assignments.push('updated_at = now()');
    const priceListValue = addValue(priceListId);
    const itemValue = addValue(itemId);
    const result = await this.pool.query<PriceListItemRow>(
      `
        UPDATE price_list_items
        SET ${assignments.join(', ')}
        WHERE price_list_id = ${priceListValue} AND id = ${itemValue}
        RETURNING *
      `,
      values
    );
    const row = result.rows[0];
    return row === undefined ? null : mapPriceListItemRow(row);
  }

  async delete(priceListId: string, itemId: string): Promise<PriceListItem | null> {
    const result = await this.pool.query<PriceListItemRow>(
      `DELETE FROM price_list_items WHERE price_list_id = $1 AND id = $2 RETURNING *`,
      [priceListId, itemId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapPriceListItemRow(row);
  }
}
