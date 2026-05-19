import { Inject, Injectable } from '@nestjs/common';
import type { CreateSlabInput, ListSlabsInput, Slab, UpdateSlabInput } from '@stoneboyz/domain';
import type { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapSlabRow, type SlabRow } from './slab.mapper.js';

type Queryable = Pick<Pool, 'query'> | PoolClient;

interface SlabCursor {
  id: string;
  updatedAt: string;
}

interface NormalizedListSlabsInput extends Omit<ListSlabsInput, 'limit'> {
  limit: number;
}

const UPDATE_COLUMNS = {
  stoneType: 'stone_type',
  finish: 'finish',
  qualityGrade: 'quality_grade',
  lengthIn: 'length_in',
  widthIn: 'width_in',
  thicknessCm: 'thickness_cm',
  lotNumber: 'lot_number',
  bundleNumber: 'bundle_number',
  warehouseLocation: 'warehouse_location',
  costCents: 'cost_cents',
  imageUrls: 'image_urls',
  notes: 'notes'
} satisfies Record<Exclude<keyof UpdateSlabInput, 'actorUserId'>, string>;

export class InvalidSlabCursorError extends Error {
  constructor() {
    super('Invalid slab cursor');
  }
}

export class InvalidSlabStatusError extends Error {
  constructor(message = 'Invalid slab status') {
    super(message);
  }
}

const encodeCursor = (cursor: SlabCursor): string => {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
};

const decodeCursor = (cursor: string): SlabCursor => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<SlabCursor>;

    if (typeof parsed.id !== 'string' || typeof parsed.updatedAt !== 'string') {
      throw new InvalidSlabCursorError();
    }

    return { id: parsed.id, updatedAt: parsed.updatedAt };
  } catch (error) {
    if (error instanceof InvalidSlabCursorError) {
      throw error;
    }

    throw new InvalidSlabCursorError();
  }
};

@Injectable()
export class SlabsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(input: NormalizedListSlabsInput): Promise<{ data: Slab[]; hasMore: boolean; nextCursor: string | null }> {
    const values: unknown[] = [];
    const where = ['deleted_at IS NULL'];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (input.status !== undefined) {
      where.push(`status = ${addValue(input.status)}`);
    }

    if (input.stoneType !== undefined) {
      where.push(`stone_type = ${addValue(input.stoneType)}`);
    }

    if (input.finish !== undefined) {
      where.push(`finish = ${addValue(input.finish)}`);
    }

    if (input.cursor !== undefined) {
      const cursor = decodeCursor(input.cursor);
      where.push(
        `(updated_at < ${addValue(cursor.updatedAt)} OR (updated_at = ${addValue(cursor.updatedAt)} AND id > ${addValue(cursor.id)}))`
      );
    }

    const limitValue = addValue(input.limit + 1);
    const result = await this.pool.query<SlabRow>(
      `
        SELECT *
        FROM slabs
        WHERE ${where.join(' AND ')}
        ORDER BY updated_at DESC, id ASC
        LIMIT ${limitValue}
      `,
      values
    );

    const rows = result.rows.slice(0, input.limit);

    return {
      data: rows.map(mapSlabRow),
      hasMore: result.rows.length > input.limit,
      nextCursor:
        result.rows.length > input.limit && rows.at(-1) !== undefined
          ? encodeCursor({ id: rows.at(-1)!.id, updatedAt: rows.at(-1)!.updated_at.toISOString() })
          : null
    };
  }

  async create(input: CreateSlabInput, parentSlabId: string | null = null, client: Queryable = this.pool): Promise<Slab> {
    const result = await client.query<SlabRow>(
      `
        INSERT INTO slabs (
          parent_slab_id,
          stone_type,
          finish,
          quality_grade,
          length_in,
          width_in,
          thickness_cm,
          lot_number,
          bundle_number,
          warehouse_location,
          cost_cents,
          image_urls,
          notes,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13, $14)
        RETURNING *
      `,
      [
        parentSlabId,
        input.stoneType,
        input.finish,
        input.qualityGrade,
        input.lengthIn,
        input.widthIn,
        input.thicknessCm,
        input.lotNumber ?? null,
        input.bundleNumber ?? null,
        input.warehouseLocation ?? null,
        input.costCents ?? 0,
        input.imageUrls ?? [],
        input.notes ?? null,
        parentSlabId === null ? 'available' : 'remnant'
      ]
    );

    return mapSlabRow(result.rows[0] as SlabRow);
  }

  async findById(slabId: string, client: Queryable = this.pool): Promise<Slab | null> {
    const result = await client.query<SlabRow>(
      `
        SELECT *
        FROM slabs
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [slabId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapSlabRow(row);
  }

  async update(slabId: string, input: UpdateSlabInput): Promise<Slab | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateSlabInput;

      if (Object.hasOwn(input, typedFieldName)) {
        const placeholder = addValue(input[typedFieldName]);
        assignments.push(`${columnName} = ${fieldName === 'imageUrls' ? `${placeholder}::text[]` : placeholder}`);
      }
    }

    assignments.push('updated_at = now()');
    const slabPlaceholder = addValue(slabId);

    const result = await this.pool.query<SlabRow>(
      `
        UPDATE slabs
        SET ${assignments.join(', ')}
        WHERE id = ${slabPlaceholder}
          AND deleted_at IS NULL
          AND status IN ('available', 'remnant')
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return mapSlabRow(row);
    }

    const current = await this.findById(slabId);
    if (current !== null) {
      throw new InvalidSlabStatusError();
    }

    return null;
  }

  async archive(slabId: string, actorUserId: string): Promise<Slab | null> {
    const result = await this.pool.query<SlabRow>(
      `
        UPDATE slabs
        SET deleted_at = now(), deleted_by_user_id = $2, updated_at = now()
        WHERE id = $1
          AND deleted_at IS NULL
          AND status IN ('available', 'remnant')
        RETURNING *
      `,
      [slabId, actorUserId]
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return mapSlabRow(row);
    }

    const current = await this.findById(slabId);
    if (current !== null) {
      throw new InvalidSlabStatusError();
    }

    return null;
  }

  async reserve(slabId: string, client: Queryable = this.pool): Promise<Slab | null> {
    const result = await client.query<SlabRow>(
      `
        UPDATE slabs
        SET status = 'reserved', updated_at = now()
        WHERE id = $1
          AND deleted_at IS NULL
          AND status IN ('available', 'remnant')
        RETURNING *
      `,
      [slabId]
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return mapSlabRow(row);
    }

    const current = await this.findById(slabId, client);
    if (current !== null) {
      throw new InvalidSlabStatusError('Slab is not available');
    }

    return null;
  }

  async release(slabId: string, client: Queryable = this.pool): Promise<Slab | null> {
    const result = await client.query<SlabRow>(
      `
        UPDATE slabs
        SET status = 'available', updated_at = now()
        WHERE id = $1
          AND deleted_at IS NULL
          AND status = 'reserved'
        RETURNING *
      `,
      [slabId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapSlabRow(row);
  }

  async cut(slabId: string, remnants: CreateSlabInput[], client: Queryable): Promise<{ slab: Slab | null; remnants: Slab[] }> {
    const result = await client.query<SlabRow>(
      `
        UPDATE slabs
        SET status = 'cut', updated_at = now()
        WHERE id = $1
          AND deleted_at IS NULL
          AND status IN ('available', 'reserved', 'remnant')
        RETURNING *
      `,
      [slabId]
    );

    const row = result.rows[0];

    if (row === undefined) {
      const current = await this.findById(slabId, client);
      if (current !== null) {
        throw new InvalidSlabStatusError('Slab is already cut');
      }

      return { slab: null, remnants: [] };
    }

    const createdRemnants: Slab[] = [];
    for (const remnant of remnants) {
      createdRemnants.push(await this.create(remnant, slabId, client));
    }

    return { slab: mapSlabRow(row), remnants: createdRemnants };
  }

  async addImageUrl(slabId: string, url: string): Promise<Slab | null> {
    const result = await this.pool.query<SlabRow>(
      `UPDATE slabs SET image_urls = array_append(image_urls, $2), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [slabId, url]
    );
    return result.rows[0] ? mapSlabRow(result.rows[0]) : null;
  }

  async removeImageUrl(slabId: string, url: string): Promise<Slab | null> {
    const result = await this.pool.query<SlabRow>(
      `UPDATE slabs SET image_urls = array_remove(image_urls, $2), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [slabId, url]
    );
    return result.rows[0] ? mapSlabRow(result.rows[0]) : null;
  }

  async releaseManyForQuote(quoteId: string, client: Queryable): Promise<string[]> {
    const result = await client.query<{ id: string }>(
      `
        UPDATE slabs s
        SET status = 'available', updated_at = now()
        FROM quote_line_items qli
        WHERE qli.quote_id = $1
          AND qli.slab_id = s.id
          AND s.deleted_at IS NULL
          AND s.status = 'reserved'
        RETURNING s.id
      `,
      [quoteId]
    );

    return result.rows.map((row) => row.id);
  }
}
