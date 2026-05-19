import { Inject, Injectable } from '@nestjs/common';
import type { CanvasLayout, DrawingRevision, SaveDrawingRevisionInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';

interface DrawingRevisionRow {
  id: string;
  quote_area_id: string;
  revision_number: number;
  layout: CanvasLayout | string;
  created_by_user_id: string | null;
  notes: string | null;
  created_at: Date;
}

const mapRow = (row: DrawingRevisionRow): DrawingRevision => ({
  id: row.id,
  quoteAreaId: row.quote_area_id,
  revisionNumber: row.revision_number,
  layout: typeof row.layout === 'string' ? JSON.parse(row.layout) : row.layout,
  createdByUserId: row.created_by_user_id,
  notes: row.notes,
  createdAt: row.created_at.toISOString()
});

@Injectable()
export class QuoteDrawingRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findLatestByAreaId(areaId: string): Promise<DrawingRevision | null> {
    const result = await this.pool.query<DrawingRevisionRow>(
      `SELECT * FROM drawing_revisions WHERE quote_area_id = $1 ORDER BY revision_number DESC LIMIT 1`,
      [areaId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapRow(row);
  }

  async findById(areaId: string, revisionId: string): Promise<DrawingRevision | null> {
    const result = await this.pool.query<DrawingRevisionRow>(
      `SELECT * FROM drawing_revisions WHERE quote_area_id = $1 AND id = $2 LIMIT 1`,
      [areaId, revisionId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapRow(row);
  }

  async findAllByAreaId(areaId: string): Promise<DrawingRevision[]> {
    const result = await this.pool.query<DrawingRevisionRow>(
      `SELECT * FROM drawing_revisions WHERE quote_area_id = $1 ORDER BY revision_number DESC`,
      [areaId]
    );
    return result.rows.map(mapRow);
  }

  async save(areaId: string, input: SaveDrawingRevisionInput): Promise<DrawingRevision> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const revResult = await client.query<{ next: number }>(
        `SELECT COALESCE(MAX(revision_number), 0) + 1 AS next FROM drawing_revisions WHERE quote_area_id = $1`,
        [areaId]
      );
      const nextRevision = revResult.rows[0]?.next ?? 1;

      const insertResult = await client.query<DrawingRevisionRow>(
        `INSERT INTO drawing_revisions (quote_area_id, revision_number, layout, created_by_user_id, notes)
         VALUES ($1, $2, $3::jsonb, $4, $5)
         RETURNING *`,
        [areaId, nextRevision, JSON.stringify(input.layout), input.actorUserId, input.notes ?? null]
      );

      await client.query('COMMIT');
      return mapRow(insertResult.rows[0] as DrawingRevisionRow);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
