import { Inject, Injectable } from '@nestjs/common';
import type { CreatePriceListItemInput, PriceListItem, UpdatePriceListItemInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapPriceListItemRow, type PriceListItemRow } from './price-list.mapper.js';

const UPDATE_COLUMNS = {
  catalogItemId: 'catalog_item_id',
  itemGroup: 'item_group',
  category: 'category',
  itemType: 'item_type',
  name: 'name',
  description: 'description',
  chargeMethod: 'charge_method',
  measurementBasis: 'measurement_basis',
  unit: 'unit',
  priceCents: 'price_cents',
  sortOrder: 'sort_order',
  taxable: 'taxable',
  allowDiscount: 'allow_discount',
  editableOnQuote: 'editable_on_quote',
  hideOnQuote: 'hide_on_quote'
} satisfies Record<Exclude<keyof UpdatePriceListItemInput, 'actorUserId'>, string>;

const normalizedCatalogName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

const itemGroupFor = (input: Pick<CreatePriceListItemInput, 'itemGroup' | 'category' | 'itemType'>): PriceListItem['itemGroup'] => {
  if (input.itemGroup !== undefined) return input.itemGroup;
  if (input.category === 'material') return 'material';
  if (input.category === 'fabrication') return 'fabrication';
  if (input.category === 'finished_edge') return 'edge';
  if (input.category === 'sink_cutout' || input.category === 'sink_item') return 'sink';
  if (input.category === 'faucet_hole') return 'faucet_hole';
  if (input.category === 'splash') return 'splash';
  if (input.itemType === 'edge') return 'edge';
  if (input.itemType === 'sink') return 'sink';
  return 'material';
};

const chargeMethodFor = (
  input: Pick<CreatePriceListItemInput, 'chargeMethod' | 'category' | 'unit'>
): PriceListItem['chargeMethod'] => {
  if (input.chargeMethod !== undefined) return input.chargeMethod;
  if (input.category === 'finished_edge' || input.unit === 'linft' || input.unit === 'lin_ft') return 'linear_foot';
  if (input.category === 'material' || input.category === 'fabrication' || input.category === 'splash' || input.unit === 'sqft' || input.unit === 'sq_ft') {
    return 'square_foot';
  }
  return 'each';
};

const measurementBasisFor = (
  input: Pick<CreatePriceListItemInput, 'measurementBasis' | 'category'>
): PriceListItem['measurementBasis'] => {
  if (input.measurementBasis !== undefined) return input.measurementBasis;
  if (input.category === 'material' || input.category === 'fabrication') return 'combined_sqft';
  if (input.category === 'finished_edge') return 'finished_edge_linft';
  if (input.category === 'splash') return 'splash_sqft';
  if (input.category === 'sink_cutout' || input.category === 'sink_item') return 'sink_count';
  if (input.category === 'faucet_hole') return 'faucet_hole_count';
  return 'each';
};

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
    const itemGroup = itemGroupFor(input);
    const chargeMethod = chargeMethodFor(input);
    const measurementBasis = measurementBasisFor(input);
    const catalogItemId = input.catalogItemId ?? await this.findOrCreateCatalogItem(itemGroup, input.name, chargeMethod, measurementBasis);
    const result = await this.pool.query<PriceListItemRow>(
      `
        INSERT INTO price_list_items (
          price_list_id, catalog_item_id, item_group, category, item_type, name, description,
          charge_method, measurement_basis, unit, price_cents,
          sort_order, taxable, allow_discount, editable_on_quote, hide_on_quote
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `,
      [
        priceListId,
        catalogItemId,
        itemGroup,
        input.category,
        input.itemType,
        input.name,
        input.description ?? null,
        chargeMethod,
        measurementBasis,
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

  private async findOrCreateCatalogItem(
    itemGroup: PriceListItem['itemGroup'],
    name: string,
    chargeMethod: PriceListItem['chargeMethod'],
    measurementBasis: PriceListItem['measurementBasis']
  ): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      `
        INSERT INTO item_catalog (
          item_group, name, normalized_name, default_charge_method, default_measurement_basis
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (item_group, normalized_name) DO UPDATE
        SET updated_at = now()
        RETURNING id
      `,
      [itemGroup, name, normalizedCatalogName(name), chargeMethod, measurementBasis]
    );
    return result.rows[0]!.id;
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
