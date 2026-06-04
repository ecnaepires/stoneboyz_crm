import { Inject, Injectable } from '@nestjs/common';
import type { QuotePricingSelection, UpsertQuotePricingSelectionInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';

interface QuotePricingSelectionRow {
  quote_id: string;
  default_fabrication_item_id: string | null;
  sink_item_id: string | null;
  faucet_hole_item_id: string | null;
}

interface QuoteAreaPricingSelectionRow {
  quote_area_id: string;
  material_item_id: string | null;
  edge_item_id: string | null;
  splash_item_id: string | null;
  fabrication_item_id: string | null;
}

@Injectable()
export class QuotePricingSelectionsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async get(quoteId: string): Promise<QuotePricingSelection> {
    const [quoteSelectionResult, areaSelectionResult] = await Promise.all([
      this.pool.query<QuotePricingSelectionRow>(
        `
          SELECT quote_id, default_fabrication_item_id, sink_item_id, faucet_hole_item_id
          FROM quote_pricing_selections
          WHERE quote_id = $1
        `,
        [quoteId]
      ),
      this.pool.query<QuoteAreaPricingSelectionRow>(
        `
          SELECT
            qaps.quote_area_id,
            qaps.material_item_id,
            qaps.edge_item_id,
            qaps.splash_item_id,
            qaps.fabrication_item_id
          FROM quote_area_pricing_selections qaps
          INNER JOIN quote_areas qa ON qa.id = qaps.quote_area_id
          WHERE qa.quote_id = $1
          ORDER BY qa.sort_order ASC, qa.created_at ASC, qa.id ASC
        `,
        [quoteId]
      )
    ]);

    const quoteSelection = quoteSelectionResult.rows[0];

    return {
      quoteId,
      defaultFabricationItemId: quoteSelection?.default_fabrication_item_id ?? null,
      sinkItemId: quoteSelection?.sink_item_id ?? null,
      faucetHoleItemId: quoteSelection?.faucet_hole_item_id ?? null,
      areas: areaSelectionResult.rows.map((row) => ({
        areaId: row.quote_area_id,
        materialItemId: row.material_item_id,
        edgeItemId: row.edge_item_id,
        splashItemId: row.splash_item_id,
        fabricationItemId: row.fabrication_item_id
      }))
    };
  }

  async upsert(quoteId: string, input: UpsertQuotePricingSelectionInput): Promise<QuotePricingSelection> {
    const current = await this.get(quoteId);
    const defaultFabricationItemId = Object.hasOwn(input, 'defaultFabricationItemId')
      ? input.defaultFabricationItemId ?? null
      : current.defaultFabricationItemId;
    const sinkItemId = Object.hasOwn(input, 'sinkItemId') ? input.sinkItemId ?? null : current.sinkItemId;
    const faucetHoleItemId = Object.hasOwn(input, 'faucetHoleItemId')
      ? input.faucetHoleItemId ?? null
      : current.faucetHoleItemId;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO quote_pricing_selections (
            quote_id, default_fabrication_item_id, sink_item_id, faucet_hole_item_id
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (quote_id) DO UPDATE
          SET
            default_fabrication_item_id = EXCLUDED.default_fabrication_item_id,
            sink_item_id = EXCLUDED.sink_item_id,
            faucet_hole_item_id = EXCLUDED.faucet_hole_item_id,
            updated_at = now()
        `,
        [quoteId, defaultFabricationItemId, sinkItemId, faucetHoleItemId]
      );

      for (const area of input.areas ?? []) {
        const existing = current.areas.find((candidate) => candidate.areaId === area.areaId);
        await client.query(
          `
            INSERT INTO quote_area_pricing_selections (
              quote_area_id, material_item_id, edge_item_id, splash_item_id, fabrication_item_id
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (quote_area_id) DO UPDATE
            SET
              material_item_id = EXCLUDED.material_item_id,
              edge_item_id = EXCLUDED.edge_item_id,
              splash_item_id = EXCLUDED.splash_item_id,
              fabrication_item_id = EXCLUDED.fabrication_item_id,
              updated_at = now()
          `,
          [
            area.areaId,
            Object.hasOwn(area, 'materialItemId') ? area.materialItemId ?? null : existing?.materialItemId ?? null,
            Object.hasOwn(area, 'edgeItemId') ? area.edgeItemId ?? null : existing?.edgeItemId ?? null,
            Object.hasOwn(area, 'splashItemId') ? area.splashItemId ?? null : existing?.splashItemId ?? null,
            Object.hasOwn(area, 'fabricationItemId') ? area.fabricationItemId ?? null : existing?.fabricationItemId ?? null
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return this.get(quoteId);
  }
}
