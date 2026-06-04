import { Inject, Injectable } from '@nestjs/common';
import {
  calculateMeasurementAreaTotals,
  measurementTotalsFromLayout,
  type CanvasLayout,
  type CounterPieceInput,
  type CreateQuoteAreaInput,
  type EdgeSegmentInput,
  type QuoteArea,
  type QuoteMeasurementAreaTotals,
  type SinkCutoutInput,
  type UpdateQuoteAreaInput
} from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapQuoteAreaRow, type QuoteAreaRow } from './quote-area.mapper.js';
import type { CounterPieceRow, EdgeSegmentRow, SinkCutoutRow } from './quote-measurements.mapper.js';

const AREA_SELECT = `
  qa.*,
  COALESCE(SUM(FLOOR(qli.qty * (qli.unit_price_cents + qli.labor_price_cents))), 0)::integer AS subtotal_cents
`;

const UPDATE_COLUMNS: Record<string, string> = {
  name: 'name',
  sortOrder: 'sort_order',
  material: 'material',
  color: 'color',
  edgeProfile: 'edge_profile',
  notes: 'notes'
};

@Injectable()
export class QuoteAreasRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async listByQuoteId(quoteId: string): Promise<QuoteArea[]> {
    const result = await this.pool.query<QuoteAreaRow>(
      `
        SELECT ${AREA_SELECT}
        FROM quote_areas qa
        LEFT JOIN quote_line_items qli ON qli.quote_area_id = qa.id
        WHERE qa.quote_id = $1
        GROUP BY qa.id
        ORDER BY qa.sort_order ASC, qa.created_at ASC
      `,
      [quoteId]
    );

    const totals = await this.measurementTotalsForAreas(result.rows);

    return result.rows.map((row) => mapQuoteAreaRow(row, totals.get(row.id)));
  }

  async findById(quoteId: string, areaId: string): Promise<QuoteArea | null> {
    const result = await this.pool.query<QuoteAreaRow>(
      `
        SELECT ${AREA_SELECT}
        FROM quote_areas qa
        LEFT JOIN quote_line_items qli ON qli.quote_area_id = qa.id
        WHERE qa.quote_id = $1 AND qa.id = $2
        GROUP BY qa.id
      `,
      [quoteId, areaId]
    );

    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    const totals = await this.measurementTotalsForAreas([row]);

    return mapQuoteAreaRow(row, totals.get(row.id));
  }

  async create(quoteId: string, input: CreateQuoteAreaInput): Promise<QuoteArea> {
    const result = await this.pool.query<QuoteAreaRow>(
      `
        INSERT INTO quote_areas (quote_id, sort_order, name, material, color, edge_profile, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *, 0::integer AS subtotal_cents
      `,
      [
        quoteId,
        input.sortOrder ?? 0,
        input.name,
        input.material ?? null,
        input.color ?? null,
        input.edgeProfile ?? null,
        input.notes ?? null
      ]
    );

    return mapQuoteAreaRow(result.rows[0] as QuoteAreaRow);
  }

  async update(quoteId: string, areaId: string, input: UpdateQuoteAreaInput): Promise<QuoteArea | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      if (Object.hasOwn(input, fieldName)) {
        assignments.push(`${columnName} = ${addValue(input[fieldName as keyof UpdateQuoteAreaInput])}`);
      }
    }

    assignments.push('updated_at = now()');

    const quotePlaceholder = addValue(quoteId);
    const areaPlaceholder = addValue(areaId);

    const result = await this.pool.query<QuoteAreaRow>(
      `
        WITH updated AS (
          UPDATE quote_areas
          SET ${assignments.join(', ')}
          WHERE quote_id = ${quotePlaceholder} AND id = ${areaPlaceholder}
          RETURNING *
        )
        SELECT u.*, COALESCE(SUM(FLOOR(qli.qty * (qli.unit_price_cents + qli.labor_price_cents))), 0)::integer AS subtotal_cents
        FROM updated u
        LEFT JOIN quote_line_items qli ON qli.quote_area_id = u.id
        GROUP BY u.id, u.quote_id, u.sort_order, u.name, u.material, u.color, u.edge_profile, u.notes, u.created_at, u.updated_at
      `,
      values
    );

    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    const totals = await this.measurementTotalsForAreas([row]);

    return mapQuoteAreaRow(row, totals.get(row.id));
  }

  async remove(quoteId: string, areaId: string): Promise<QuoteArea | null> {
    const result = await this.pool.query<QuoteAreaRow>(
      `
        DELETE FROM quote_areas
        WHERE quote_id = $1 AND id = $2
        RETURNING *, 0::integer AS subtotal_cents
      `,
      [quoteId, areaId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapQuoteAreaRow(row);
  }

  async hasLineItems(areaId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM quote_line_items WHERE quote_area_id = $1) AS "exists"`,
      [areaId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async pricingMeasurementTotalsForArea(areaId: string): Promise<QuoteMeasurementAreaTotals> {
    const result = await this.pool.query<{
      piece_count: string;
      countertop_sq_ft: string;
      backsplash_sq_ft: string;
      combined_sq_ft: string;
      finished_edge_lin_ft: string;
      splash_sq_ft: string;
      sink_cutout_count: string;
      faucet_hole_count: string;
    }>(
      `
        SELECT
          COALESCE((SELECT SUM(quantity) FROM counter_pieces WHERE quote_area_id = $1), 0) AS piece_count,
          COALESCE((SELECT SUM(length_in * width_in * quantity) / 144 FROM counter_pieces WHERE quote_area_id = $1 AND kind <> 'backsplash'), 0) AS countertop_sq_ft,
          COALESCE((SELECT SUM(length_in * width_in * quantity) / 144 FROM counter_pieces WHERE quote_area_id = $1 AND kind = 'backsplash'), 0) AS backsplash_sq_ft,
          COALESCE((SELECT SUM(length_in * width_in * quantity) / 144 FROM counter_pieces WHERE quote_area_id = $1), 0) AS combined_sq_ft,
          COALESCE((SELECT SUM(length_in) / 12 FROM edge_segments WHERE quote_area_id = $1 AND treatment = 'finished'), 0) AS finished_edge_lin_ft,
          COALESCE((SELECT SUM(length_in * splash_height_in) / 144 FROM edge_segments WHERE quote_area_id = $1 AND splash_height_in IS NOT NULL), 0) AS splash_sq_ft,
          COALESCE((SELECT SUM(quantity) FROM sink_cutouts WHERE quote_area_id = $1), 0) AS sink_cutout_count,
          COALESCE((SELECT SUM(quantity * faucet_hole_count) FROM sink_cutouts WHERE quote_area_id = $1), 0) AS faucet_hole_count
      `,
      [areaId]
    );
    const row = result.rows[0];

    return {
      pieceCount: Number(row?.piece_count ?? 0),
      countertopSqFt: Number(row?.countertop_sq_ft ?? 0),
      backsplashSqFt: Number(row?.backsplash_sq_ft ?? 0),
      combinedSqFt: Number(row?.combined_sq_ft ?? 0),
      finishedEdgeLinFt: Number(row?.finished_edge_lin_ft ?? 0),
      splashSqFt: Number(row?.splash_sq_ft ?? 0),
      sinkCutoutCount: Number(row?.sink_cutout_count ?? 0),
      faucetHoleCount: Number(row?.faucet_hole_count ?? 0)
    };
  }

  private async measurementTotalsForAreas(rows: QuoteAreaRow[]): Promise<Map<string, QuoteMeasurementAreaTotals>> {
    const totals = new Map<string, QuoteMeasurementAreaTotals>();
    const areaIds = rows.map((row) => row.id);
    if (areaIds.length === 0) {
      return totals;
    }

    const layouts = await this.pool.query<{ quote_area_id: string; layout: CanvasLayout | string }>(
      `SELECT DISTINCT ON (quote_area_id) quote_area_id, layout
         FROM drawing_revisions
        WHERE quote_area_id = ANY($1::uuid[])
        ORDER BY quote_area_id, revision_number DESC`,
      [areaIds]
    );

    for (const row of layouts.rows) {
      const layout = (typeof row.layout === 'string' ? JSON.parse(row.layout) : row.layout) as CanvasLayout;
      totals.set(row.quote_area_id, measurementTotalsFromLayout(layout));
    }

    return totals;
  }
}
