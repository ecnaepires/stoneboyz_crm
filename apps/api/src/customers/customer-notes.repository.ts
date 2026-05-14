import { Inject, Injectable } from '@nestjs/common';
import type { CreateCustomerNoteInput, CustomerNote, UpdateCustomerNoteInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapCustomerNoteRow, type CustomerNoteRow } from './customer-note.mapper.js';

@Injectable()
export class CustomerNotesRepository {
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

  async list(customerId: string): Promise<CustomerNote[]> {
    const result = await this.pool.query<CustomerNoteRow>(
      `
        SELECT *
        FROM customer_notes
        WHERE customer_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC, id ASC
      `,
      [customerId]
    );

    return result.rows.map(mapCustomerNoteRow);
  }

  async findById(customerId: string, noteId: string): Promise<CustomerNote | null> {
    const result = await this.pool.query<CustomerNoteRow>(
      `
        SELECT *
        FROM customer_notes
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
      `,
      [customerId, noteId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerNoteRow(row);
  }

  async create(customerId: string, input: CreateCustomerNoteInput): Promise<CustomerNote> {
    const result = await this.pool.query<CustomerNoteRow>(
      `
        INSERT INTO customer_notes (customer_id, author_user_id, body)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [customerId, input.actorUserId, input.body]
    );

    return mapCustomerNoteRow(result.rows[0] as CustomerNoteRow);
  }

  async update(customerId: string, noteId: string, input: UpdateCustomerNoteInput): Promise<CustomerNote | null> {
    const result = await this.pool.query<CustomerNoteRow>(
      `
        UPDATE customer_notes
        SET body = $3, updated_at = now()
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, noteId, input.body]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerNoteRow(row);
  }

  async archive(customerId: string, noteId: string): Promise<CustomerNote | null> {
    const result = await this.pool.query<CustomerNoteRow>(
      `
        UPDATE customer_notes
        SET deleted_at = now(), updated_at = now()
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, noteId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerNoteRow(row);
  }
}
