import { Inject, Injectable } from '@nestjs/common';
import type { ActivityNote, CreateActivityNoteInput, UpdateActivityNoteInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapActivityNoteRow, type ActivityNoteRow } from './activity-note.mapper.js';

@Injectable()
export class ActivityNotesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async customerExists(customerId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM customers
          WHERE id = $1 AND deleted_at IS NULL
        ) AS "exists"
      `,
      [customerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async eventExists(customerId: string, eventId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM scheduled_events
          WHERE id = $1
            AND customer_id = $2
            AND deleted_at IS NULL
        ) AS "exists"
      `,
      [eventId, customerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async findByEventId(customerId: string, eventId: string): Promise<ActivityNote[]> {
    const result = await this.pool.query<ActivityNoteRow>(
      `
        SELECT *
        FROM activity_notes
        WHERE customer_id = $1 AND event_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC, id ASC
      `,
      [customerId, eventId]
    );

    return result.rows.map(mapActivityNoteRow);
  }

  async findById(customerId: string, eventId: string, noteId: string): Promise<ActivityNote | null> {
    const result = await this.pool.query<ActivityNoteRow>(
      `
        SELECT *
        FROM activity_notes
        WHERE customer_id = $1 AND event_id = $2 AND id = $3 AND deleted_at IS NULL
      `,
      [customerId, eventId, noteId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapActivityNoteRow(row);
  }

  async create(customerId: string, eventId: string, input: CreateActivityNoteInput): Promise<ActivityNote> {
    const result = await this.pool.query<ActivityNoteRow>(
      `
        INSERT INTO activity_notes (customer_id, event_id, author_user_id, body)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [customerId, eventId, input.actorUserId, input.body]
    );

    return mapActivityNoteRow(result.rows[0] as ActivityNoteRow);
  }

  async update(customerId: string, eventId: string, noteId: string, input: UpdateActivityNoteInput): Promise<ActivityNote | null> {
    const result = await this.pool.query<ActivityNoteRow>(
      `
        UPDATE activity_notes
        SET body = $4, edited_at = now(), updated_at = now()
        WHERE customer_id = $1 AND event_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, eventId, noteId, input.body]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapActivityNoteRow(row);
  }

  async softDelete(customerId: string, eventId: string, noteId: string): Promise<ActivityNote | null> {
    const result = await this.pool.query<ActivityNoteRow>(
      `
        UPDATE activity_notes
        SET deleted_at = now(), updated_at = now()
        WHERE customer_id = $1 AND event_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, eventId, noteId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapActivityNoteRow(row);
  }
}
