import { Inject, Injectable } from '@nestjs/common';
import type { GeneratedPriceLine, GeneratedPriceLineInput, OverrideGeneratedPriceLineInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapGeneratedPriceLineRow, type GeneratedPriceLineRow } from './quote-pricing.mapper.js';

type UpsertGeneratedPriceLineInput = Pick<
  GeneratedPriceLineInput,
  'category' | 'label' | 'quantity' | 'unit' | 'unitPriceCents' | 'priceListItemId' | 'sortOrder'
>;

@Injectable()
export class QuotePricingRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async listByAreaId(areaId: string): Promise<GeneratedPriceLine[]> {
    const result = await this.pool.query<GeneratedPriceLineRow>(
      `
        SELECT *
        FROM generated_price_lines
        WHERE quote_area_id = $1
        ORDER BY sort_order ASC, created_at ASC
      `,
      [areaId]
    );

    return result.rows.map(mapGeneratedPriceLineRow);
  }

  async upsertLines(areaId: string, lines: UpsertGeneratedPriceLineInput[]): Promise<GeneratedPriceLine[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM generated_price_lines WHERE quote_area_id = $1', [areaId]);

      if (lines.length === 0) {
        await client.query('COMMIT');
        return [];
      }

      const values: unknown[] = [];
      const rowPlaceholders = lines.map((line) => {
        const start = values.length + 1;
        values.push(
          areaId,
          line.category,
          line.label,
          line.quantity,
          line.unit,
          line.unitPriceCents,
          line.priceListItemId,
          line.sortOrder
        );

        return `($${start}, $${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6}, $${start + 7})`;
      });

      const result = await client.query<GeneratedPriceLineRow>(
        `
          INSERT INTO generated_price_lines (
            quote_area_id,
            category,
            label,
            quantity,
            unit,
            unit_price_cents,
            price_list_item_id,
            sort_order
          )
          VALUES ${rowPlaceholders.join(', ')}
          RETURNING *
        `,
        values
      );
      await client.query('COMMIT');

      return result.rows.map(mapGeneratedPriceLineRow).sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
        return left.createdAt.localeCompare(right.createdAt);
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOverride(
    areaId: string,
    lineId: string,
    input: OverrideGeneratedPriceLineInput
  ): Promise<GeneratedPriceLine | null> {
    const result =
      input.overridePriceCents === null || input.overridePriceCents === undefined
        ? await this.pool.query<GeneratedPriceLineRow>(
            `
              UPDATE generated_price_lines
              SET
                override_price_cents = NULL,
                override_reason = NULL,
                override_by_user_id = NULL,
                override_at = NULL,
                updated_at = now()
              WHERE quote_area_id = $1 AND id = $2
              RETURNING *
            `,
            [areaId, lineId]
          )
        : await this.pool.query<GeneratedPriceLineRow>(
            `
              UPDATE generated_price_lines
              SET
                override_price_cents = $1,
                override_reason = $2,
                override_by_user_id = $3,
                override_at = now(),
                updated_at = now()
              WHERE quote_area_id = $4 AND id = $5
              RETURNING *
            `,
            [input.overridePriceCents, input.overrideReason ?? null, input.actorUserId, areaId, lineId]
          );

    const row = result.rows[0];

    return row === undefined ? null : mapGeneratedPriceLineRow(row);
  }
}
