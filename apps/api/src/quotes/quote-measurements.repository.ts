import { Inject, Injectable } from "@nestjs/common";
import type {
  CounterPiece,
  CreateCounterPieceInput,
  CreateEdgeSegmentInput,
  CreateSinkCutoutInput,
  EdgeSegment,
  SinkCutout,
  UpdateCounterPieceInput,
  UpdateEdgeSegmentInput,
  UpdateSinkCutoutInput,
} from "@stoneboyz/domain";
import type { Pool, QueryResultRow } from "pg";
import { DATABASE_POOL } from "../database.provider.js";
import {
  mapCounterPieceRow,
  mapEdgeSegmentRow,
  mapSinkCutoutRow,
  type CounterPieceRow,
  type EdgeSegmentRow,
  type SinkCutoutRow,
} from "./quote-measurements.mapper.js";

const COUNTER_PIECE_UPDATE_COLUMNS = {
  sortOrder: "sort_order",
  name: "name",
  lengthIn: "length_in",
  widthIn: "width_in",
  quantity: "quantity",
} satisfies Record<
  Exclude<keyof UpdateCounterPieceInput, "actorUserId">,
  string
>;

const EDGE_SEGMENT_UPDATE_COLUMNS = {
  sortOrder: "sort_order",
  lengthIn: "length_in",
  treatment: "treatment",
  splashHeightIn: "splash_height_in",
} satisfies Record<
  Exclude<keyof UpdateEdgeSegmentInput, "actorUserId">,
  string
>;

const SINK_CUTOUT_UPDATE_COLUMNS = {
  sortOrder: "sort_order",
  quantity: "quantity",
  model: "model",
  sinkType: "sink_type",
  shape: "shape",
  cutoutLengthIn: "cutout_length_in",
  cutoutWidthIn: "cutout_width_in",
  faucetHoleCount: "faucet_hole_count",
  centerline: "centerline",
} satisfies Record<Exclude<keyof UpdateSinkCutoutInput, "actorUserId">, string>;

@Injectable()
export class QuoteMeasurementsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async listPieces(areaId: string): Promise<CounterPiece[]> {
    const result = await this.pool.query<CounterPieceRow>(
      `
        SELECT *
        FROM counter_pieces
        WHERE quote_area_id = $1
        ORDER BY sort_order ASC, created_at ASC, id ASC
      `,
      [areaId],
    );

    return result.rows.map(mapCounterPieceRow);
  }

  async createPiece(
    areaId: string,
    input: CreateCounterPieceInput,
  ): Promise<CounterPiece> {
    const result = await this.pool.query<CounterPieceRow>(
      `
        INSERT INTO counter_pieces (quote_area_id, sort_order, name, length_in, width_in, quantity, kind)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        areaId,
        input.sortOrder ?? 0,
        input.name ?? null,
        input.lengthIn,
        input.widthIn,
        input.quantity ?? 1,
        input.kind ?? "countertop",
      ],
    );

    return mapCounterPieceRow(result.rows[0] as CounterPieceRow);
  }

  async updatePiece(
    areaId: string,
    pieceId: string,
    input: UpdateCounterPieceInput,
  ): Promise<CounterPiece | null> {
    const result = await this.updateRow<
      CounterPieceRow,
      UpdateCounterPieceInput
    >("counter_pieces", COUNTER_PIECE_UPDATE_COLUMNS, areaId, pieceId, input);

    return result === null ? null : mapCounterPieceRow(result);
  }

  async removePiece(
    areaId: string,
    pieceId: string,
  ): Promise<CounterPiece | null> {
    const result = await this.removeRow<CounterPieceRow>(
      "counter_pieces",
      areaId,
      pieceId,
    );

    return result === null ? null : mapCounterPieceRow(result);
  }

  async listEdges(areaId: string): Promise<EdgeSegment[]> {
    const result = await this.pool.query<EdgeSegmentRow>(
      `
        SELECT *
        FROM edge_segments
        WHERE quote_area_id = $1
        ORDER BY sort_order ASC, created_at ASC, id ASC
      `,
      [areaId],
    );

    return result.rows.map(mapEdgeSegmentRow);
  }

  async createEdge(
    areaId: string,
    input: CreateEdgeSegmentInput,
  ): Promise<EdgeSegment> {
    const result = await this.pool.query<EdgeSegmentRow>(
      `
        INSERT INTO edge_segments (quote_area_id, sort_order, length_in, treatment, splash_height_in)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        areaId,
        input.sortOrder ?? 0,
        input.lengthIn,
        input.treatment,
        input.splashHeightIn ?? null,
      ],
    );

    return mapEdgeSegmentRow(result.rows[0] as EdgeSegmentRow);
  }

  async updateEdge(
    areaId: string,
    edgeId: string,
    input: UpdateEdgeSegmentInput,
  ): Promise<EdgeSegment | null> {
    const result = await this.updateRow<EdgeSegmentRow, UpdateEdgeSegmentInput>(
      "edge_segments",
      EDGE_SEGMENT_UPDATE_COLUMNS,
      areaId,
      edgeId,
      input,
    );

    return result === null ? null : mapEdgeSegmentRow(result);
  }

  async removeEdge(
    areaId: string,
    edgeId: string,
  ): Promise<EdgeSegment | null> {
    const result = await this.removeRow<EdgeSegmentRow>(
      "edge_segments",
      areaId,
      edgeId,
    );

    return result === null ? null : mapEdgeSegmentRow(result);
  }

  async listSinks(areaId: string): Promise<SinkCutout[]> {
    const result = await this.pool.query<SinkCutoutRow>(
      `
        SELECT *
        FROM sink_cutouts
        WHERE quote_area_id = $1
        ORDER BY sort_order ASC, created_at ASC, id ASC
      `,
      [areaId],
    );

    return result.rows.map(mapSinkCutoutRow);
  }

  async createSink(
    areaId: string,
    input: CreateSinkCutoutInput,
  ): Promise<SinkCutout> {
    const result = await this.pool.query<SinkCutoutRow>(
      `
        INSERT INTO sink_cutouts (
          quote_area_id,
          sort_order,
          quantity,
          model,
          sink_type,
          shape,
          cutout_length_in,
          cutout_width_in,
          faucet_hole_count,
          centerline
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        areaId,
        input.sortOrder ?? 0,
        input.quantity ?? 1,
        input.model ?? null,
        input.sinkType,
        input.shape,
        input.cutoutLengthIn,
        input.cutoutWidthIn,
        input.faucetHoleCount ?? 0,
        input.centerline ?? "none",
      ],
    );

    return mapSinkCutoutRow(result.rows[0] as SinkCutoutRow);
  }

  async updateSink(
    areaId: string,
    sinkId: string,
    input: UpdateSinkCutoutInput,
  ): Promise<SinkCutout | null> {
    const result = await this.updateRow<SinkCutoutRow, UpdateSinkCutoutInput>(
      "sink_cutouts",
      SINK_CUTOUT_UPDATE_COLUMNS,
      areaId,
      sinkId,
      input,
    );

    return result === null ? null : mapSinkCutoutRow(result);
  }

  async removeSink(areaId: string, sinkId: string): Promise<SinkCutout | null> {
    const result = await this.removeRow<SinkCutoutRow>(
      "sink_cutouts",
      areaId,
      sinkId,
    );

    return result === null ? null : mapSinkCutoutRow(result);
  }

  private async updateRow<
    TRow extends QueryResultRow,
    TInput extends { actorUserId: string },
  >(
    tableName: string,
    columns: Record<string, string>,
    areaId: string,
    rowId: string,
    input: TInput,
  ): Promise<TRow | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(columns)) {
      if (Object.hasOwn(input, fieldName)) {
        assignments.push(
          `${columnName} = ${addValue(input[fieldName as keyof TInput])}`,
        );
      }
    }

    assignments.push("updated_at = now()");
    const areaPlaceholder = addValue(areaId);
    const rowPlaceholder = addValue(rowId);

    const result = await this.pool.query<TRow>(
      `
        UPDATE ${tableName}
        SET ${assignments.join(", ")}
        WHERE quote_area_id = ${areaPlaceholder} AND id = ${rowPlaceholder}
        RETURNING *
      `,
      values,
    );
    const row = result.rows[0];

    return row === undefined ? null : row;
  }

  private async removeRow<TRow extends QueryResultRow>(
    tableName: string,
    areaId: string,
    rowId: string,
  ): Promise<TRow | null> {
    const result = await this.pool.query<TRow>(
      `
        DELETE FROM ${tableName}
        WHERE quote_area_id = $1 AND id = $2
        RETURNING *
      `,
      [areaId, rowId],
    );
    const row = result.rows[0];

    return row === undefined ? null : row;
  }
}
