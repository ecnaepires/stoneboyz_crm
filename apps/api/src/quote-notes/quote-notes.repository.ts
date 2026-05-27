import { Inject, Injectable } from '@nestjs/common';
import type { CreateQuoteNoteInput, QuoteNote, UpdateQuoteNoteInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapQuoteNoteRow, type QuoteNoteRow } from './quote-note.mapper.js';

@Injectable()
export class QuoteNotesRepository {
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

  async quoteExists(customerId: string, quoteId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM quotes
          WHERE id = $1
            AND customer_id = $2
            AND deleted_at IS NULL
        ) AS "exists"
      `,
      [quoteId, customerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async findByQuoteId(customerId: string, quoteId: string): Promise<QuoteNote[]> {
    const result = await this.pool.query<QuoteNoteRow>(
      `
        SELECT *
        FROM quote_notes
        WHERE customer_id = $1 AND quote_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC, id ASC
      `,
      [customerId, quoteId]
    );

    return result.rows.map(mapQuoteNoteRow);
  }

  async findById(customerId: string, quoteId: string, noteId: string): Promise<QuoteNote | null> {
    const result = await this.pool.query<QuoteNoteRow>(
      `
        SELECT *
        FROM quote_notes
        WHERE customer_id = $1 AND quote_id = $2 AND id = $3 AND deleted_at IS NULL
      `,
      [customerId, quoteId, noteId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapQuoteNoteRow(row);
  }

  async create(customerId: string, quoteId: string, input: CreateQuoteNoteInput): Promise<QuoteNote> {
    const result = await this.pool.query<QuoteNoteRow>(
      `
        INSERT INTO quote_notes (customer_id, quote_id, author_user_id, body, is_public)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [customerId, quoteId, input.actorUserId, input.body, input.isPublic ?? false]
    );

    return mapQuoteNoteRow(result.rows[0] as QuoteNoteRow);
  }

  async update(customerId: string, quoteId: string, noteId: string, input: UpdateQuoteNoteInput): Promise<QuoteNote | null> {
    const result = await this.pool.query<QuoteNoteRow>(
      `
        UPDATE quote_notes
        SET body = $4, edited_at = now(), updated_at = now()
        WHERE customer_id = $1 AND quote_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, quoteId, noteId, input.body]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapQuoteNoteRow(row);
  }

  async softDelete(customerId: string, quoteId: string, noteId: string): Promise<QuoteNote | null> {
    const result = await this.pool.query<QuoteNoteRow>(
      `
        UPDATE quote_notes
        SET deleted_at = now(), updated_at = now()
        WHERE customer_id = $1 AND quote_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, quoteId, noteId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapQuoteNoteRow(row);
  }
}
