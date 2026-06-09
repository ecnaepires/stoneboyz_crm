import { Inject, Injectable } from '@nestjs/common';
import type { QuotePricingSelection, UpsertQuotePricingSelectionInput } from '@stoneboyz/domain';
import type { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';

type Queryable = Pick<Pool, 'query'> | PoolClient;

interface QuotePricingSelectionRow {
  quote_id: string;
  default_fabrication_item_id: string | null;
  sink_item_id: string | null;
  faucet_hole_item_id: string | null;
}

interface QuoteAreaPricingSelectionRow {
  quote_area_id: string;
  material_item_id: string | null;
  material_source: 'inventory' | 'external';
  material_slab_id: string | null;
  external_material_note: string | null;
  edge_item_id: string | null;
  splash_item_id: string | null;
  fabrication_item_id: string | null;
  sink_item_id: string | null;
  faucet_hole_item_id: string | null;
}

@Injectable()
export class QuotePricingSelectionsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async get(quoteId: string, client: Queryable = this.pool): Promise<QuotePricingSelection> {
    const [quoteSelectionResult, areaSelectionResult] = await Promise.all([
      client.query<QuotePricingSelectionRow>(
        `
          SELECT quote_id, default_fabrication_item_id, sink_item_id, faucet_hole_item_id
          FROM quote_pricing_selections
          WHERE quote_id = $1
        `,
        [quoteId]
      ),
      client.query<QuoteAreaPricingSelectionRow>(
        `
          SELECT
            qaps.quote_area_id,
            qaps.material_item_id,
            qaps.material_source,
            qaps.material_slab_id,
            qaps.external_material_note,
            qaps.edge_item_id,
            qaps.splash_item_id,
            qaps.fabrication_item_id,
            qaps.sink_item_id,
            qaps.faucet_hole_item_id
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
        materialSource: row.material_source,
        materialSlabId: row.material_slab_id,
        externalMaterialNote: row.external_material_note,
        edgeItemId: row.edge_item_id,
        splashItemId: row.splash_item_id,
        fabricationItemId: row.fabrication_item_id,
        sinkItemId: row.sink_item_id,
        faucetHoleItemId: row.faucet_hole_item_id
      }))
    };
  }

  async upsert(quoteId: string, input: UpsertQuotePricingSelectionInput): Promise<QuotePricingSelection> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await this.upsertWithClient(client, quoteId, input);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async upsertWithClient(client: PoolClient, quoteId: string, input: UpsertQuotePricingSelectionInput): Promise<QuotePricingSelection> {
    const current = await this.get(quoteId, client);
    const defaultFabricationItemId = Object.hasOwn(input, 'defaultFabricationItemId')
      ? (input.defaultFabricationItemId ?? null)
      : current.defaultFabricationItemId;
    const sinkItemId = Object.hasOwn(input, 'sinkItemId')
      ? (input.sinkItemId ?? null)
      : current.sinkItemId;
    const faucetHoleItemId = Object.hasOwn(input, 'faucetHoleItemId')
      ? (input.faucetHoleItemId ?? null)
      : current.faucetHoleItemId;

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
      const materialSource = Object.hasOwn(area, 'materialSource')
        ? (area.materialSource ?? 'external')
        : (existing?.materialSource ?? 'external');
      const materialSlabId =
        materialSource === 'inventory'
          ? Object.hasOwn(area, 'materialSlabId')
            ? (area.materialSlabId ?? null)
            : (existing?.materialSlabId ?? null)
          : null;
      await client.query(
        `
            INSERT INTO quote_area_pricing_selections (
              quote_area_id, material_item_id, material_source, material_slab_id, external_material_note, edge_item_id, splash_item_id, fabrication_item_id, sink_item_id, faucet_hole_item_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (quote_area_id) DO UPDATE
            SET
              material_item_id = EXCLUDED.material_item_id,
              material_source = EXCLUDED.material_source,
              material_slab_id = EXCLUDED.material_slab_id,
              external_material_note = EXCLUDED.external_material_note,
              edge_item_id = EXCLUDED.edge_item_id,
              splash_item_id = EXCLUDED.splash_item_id,
              fabrication_item_id = EXCLUDED.fabrication_item_id,
              sink_item_id = EXCLUDED.sink_item_id,
              faucet_hole_item_id = EXCLUDED.faucet_hole_item_id,
              updated_at = now()
        `,
        [
          area.areaId,
          Object.hasOwn(area, 'materialItemId')
            ? (area.materialItemId ?? null)
            : (existing?.materialItemId ?? null),
          materialSource,
          materialSlabId,
          Object.hasOwn(area, 'externalMaterialNote')
            ? (area.externalMaterialNote ?? null)
            : (existing?.externalMaterialNote ?? null),
          Object.hasOwn(area, 'edgeItemId')
            ? (area.edgeItemId ?? null)
            : (existing?.edgeItemId ?? null),
          Object.hasOwn(area, 'splashItemId')
            ? (area.splashItemId ?? null)
            : (existing?.splashItemId ?? null),
          Object.hasOwn(area, 'fabricationItemId')
            ? (area.fabricationItemId ?? null)
            : (existing?.fabricationItemId ?? null),
          Object.hasOwn(area, 'sinkItemId')
            ? (area.sinkItemId ?? null)
            : (existing?.sinkItemId ?? null),
          Object.hasOwn(area, 'faucetHoleItemId')
            ? (area.faucetHoleItemId ?? null)
            : (existing?.faucetHoleItemId ?? null)
        ]
      );
    }

    return this.get(quoteId, client);
  }
}
