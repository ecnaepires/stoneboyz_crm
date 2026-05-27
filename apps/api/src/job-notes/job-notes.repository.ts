import { Inject, Injectable } from '@nestjs/common';
import type { CreateJobNoteInput, JobNote, UpdateJobNoteInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapJobNoteRow, type JobNoteRow } from './job-note.mapper.js';

@Injectable()
export class JobNotesRepository {
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

  async projectExists(customerId: string, projectId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM projects
          WHERE id = $1
            AND customer_id = $2
            AND archived_at IS NULL
        ) AS "exists"
      `,
      [projectId, customerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async findByProjectId(customerId: string, projectId: string): Promise<JobNote[]> {
    const result = await this.pool.query<JobNoteRow>(
      `
        SELECT *
        FROM job_notes
        WHERE customer_id = $1 AND project_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC, id ASC
      `,
      [customerId, projectId]
    );

    return result.rows.map(mapJobNoteRow);
  }

  async findById(customerId: string, projectId: string, noteId: string): Promise<JobNote | null> {
    const result = await this.pool.query<JobNoteRow>(
      `
        SELECT *
        FROM job_notes
        WHERE customer_id = $1 AND project_id = $2 AND id = $3 AND deleted_at IS NULL
      `,
      [customerId, projectId, noteId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobNoteRow(row);
  }

  async create(customerId: string, projectId: string, input: CreateJobNoteInput): Promise<JobNote> {
    const result = await this.pool.query<JobNoteRow>(
      `
        INSERT INTO job_notes (customer_id, project_id, author_user_id, body)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [customerId, projectId, input.actorUserId, input.body]
    );

    return mapJobNoteRow(result.rows[0] as JobNoteRow);
  }

  async update(customerId: string, projectId: string, noteId: string, input: UpdateJobNoteInput): Promise<JobNote | null> {
    const result = await this.pool.query<JobNoteRow>(
      `
        UPDATE job_notes
        SET body = $4, edited_at = now(), updated_at = now()
        WHERE customer_id = $1 AND project_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, projectId, noteId, input.body]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobNoteRow(row);
  }

  async softDelete(customerId: string, projectId: string, noteId: string): Promise<JobNote | null> {
    const result = await this.pool.query<JobNoteRow>(
      `
        UPDATE job_notes
        SET deleted_at = now(), updated_at = now()
        WHERE customer_id = $1 AND project_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, projectId, noteId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobNoteRow(row);
  }
}
