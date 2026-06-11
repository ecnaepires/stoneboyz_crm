import { Inject, Injectable } from '@nestjs/common';
import {
  measurementTotalsFromLayout,
  type CanvasChainShapeLayout,
  type CanvasLayout,
  type CreateQuoteAreaInput,
  type QuoteArea,
  type QuoteMeasurementAreaTotals,
  type UpdateQuoteAreaInput
} from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapQuoteAreaRow, type QuoteAreaRow } from './quote-area.mapper.js';

const areaSubtotalSelect = (areaAlias: string): string => `
  COALESCE(
    (
      SELECT SUM(COALESCE(gpl.override_price_cents, gpl.line_total_cents))
      FROM generated_price_lines gpl
      WHERE gpl.quote_area_id = ${areaAlias}.id
    ),
    (
      SELECT SUM(FLOOR(qli.qty * (qli.unit_price_cents + qli.labor_price_cents)))
      FROM quote_line_items qli
      WHERE qli.quote_area_id = ${areaAlias}.id
    ),
    0
  )::integer AS subtotal_cents
`;

const AREA_SELECT = (areaAlias: string): string => `
  ${areaAlias}.*,
  ${areaSubtotalSelect(areaAlias)}
`;

const UPDATE_COLUMNS: Record<string, string> = {
  name: 'name',
  sortOrder: 'sort_order',
  material: 'material',
  color: 'color',
  edgeProfile: 'edge_profile',
  notes: 'notes'
};

type CounterPieceMeasurementRow = {
  quote_area_id: string;
  id: string;
  length_in: number | string;
  width_in: number | string;
  kind: string;
};

const RECTANGLE_SHAPE_SCALE = 3;

const rectangleChainShape = (lengthIn: number, widthIn: number): CanvasChainShapeLayout => {
  const halfLengthIn = lengthIn / 2;

  return {
    type: 'chain',
    segments: [
      {
        x: 0,
        y: 0,
        w: halfLengthIn * RECTANGLE_SHAPE_SCALE,
        h: widthIn * RECTANGLE_SHAPE_SCALE,
        lengthIn: halfLengthIn,
        widthIn,
        orientation: 'horizontal'
      },
      {
        x: halfLengthIn * RECTANGLE_SHAPE_SCALE,
        y: 0,
        w: halfLengthIn * RECTANGLE_SHAPE_SCALE,
        h: widthIn * RECTANGLE_SHAPE_SCALE,
        lengthIn: halfLengthIn,
        widthIn,
        orientation: 'horizontal'
      }
    ]
  };
};

const layoutWithCounterPieceDimensions = (
  layout: CanvasLayout,
  piecesById: Map<string, CounterPieceMeasurementRow>
): CanvasLayout => ({
  ...layout,
  pieces: layout.pieces.map((piece) => {
    const counterPiece = piecesById.get(piece.pieceId);
    if (counterPiece === undefined) {
      return piece;
    }

    return {
      ...piece,
      kind: piece.kind ?? (counterPiece.kind === 'backsplash' ? 'backsplash' : 'countertop'),
      shape: piece.shape ?? rectangleChainShape(Number(counterPiece.length_in), Number(counterPiece.width_in))
    };
  })
});

const parseCanvasLayout = (value: CanvasLayout | string): CanvasLayout | null => {
  const parsed = (() => {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  })();

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as { pieces?: unknown }).pieces)
  ) {
    return null;
  }

  // v2 layouts (schemaVersion: 2) use a different structure — skip for legacy totals
  if ((parsed as { schemaVersion?: unknown }).schemaVersion === 2) {
    return null;
  }

  return parsed as CanvasLayout;
};

@Injectable()
export class QuoteAreasRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async listByQuoteId(quoteId: string): Promise<QuoteArea[]> {
    const result = await this.pool.query<QuoteAreaRow>(
      `
        SELECT ${AREA_SELECT('qa')}
        FROM quote_areas qa
        WHERE qa.quote_id = $1
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
        SELECT ${AREA_SELECT('qa')}
        FROM quote_areas qa
        WHERE qa.quote_id = $1 AND qa.id = $2
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
        SELECT u.*, ${areaSubtotalSelect('u')}
        FROM updated u
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
    // Pricing reads the same layout-derived totals as the quote summary, so the
    // drawing stays the single source of truth (ADR 0003). No duplicated SQL.
    const totals = await this.measurementTotalsForAreas([{ id: areaId } as QuoteAreaRow]);
    return (
      totals.get(areaId) ?? {
        pieceCount: 0,
        countertopSqFt: 0,
        backsplashSqFt: 0,
        combinedSqFt: 0,
        finishedEdgeLinFt: 0,
        splashSqFt: 0,
        sinkCutoutCount: 0,
        faucetHoleCount: 0
      }
    );
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
    const counterPieces = await this.pool.query<CounterPieceMeasurementRow>(
      `SELECT quote_area_id, id, length_in, width_in, kind
         FROM counter_pieces
        WHERE quote_area_id = ANY($1::uuid[])`,
      [areaIds]
    );
    const counterPiecesByArea = new Map<string, Map<string, CounterPieceMeasurementRow>>();
    for (const piece of counterPieces.rows) {
      const areaPieces = counterPiecesByArea.get(piece.quote_area_id) ?? new Map<string, CounterPieceMeasurementRow>();
      areaPieces.set(piece.id, piece);
      counterPiecesByArea.set(piece.quote_area_id, areaPieces);
    }

    for (const row of layouts.rows) {
      const layout = parseCanvasLayout(row.layout);
      if (layout === null) {
        continue;
      }

      totals.set(
        row.quote_area_id,
        measurementTotalsFromLayout(layoutWithCounterPieceDimensions(layout, counterPiecesByArea.get(row.quote_area_id) ?? new Map()))
      );
    }

    return totals;
  }
}
