import { Inject, Injectable } from '@nestjs/common';
import type { Assignee, CreateAssigneeInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapAssigneeRow, type AssigneeRow } from './assignee.mapper.js';

@Injectable()
export class AssigneesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(): Promise<Assignee[]> {
    const result = await this.pool.query<AssigneeRow>(
      `
        SELECT *
        FROM assignees
        WHERE archived_at IS NULL AND active = true
        ORDER BY name ASC, id ASC
      `
    );

    return result.rows.map(mapAssigneeRow);
  }

  async create(input: CreateAssigneeInput): Promise<Assignee> {
    const result = await this.pool.query<AssigneeRow>(
      `
        INSERT INTO assignees (name, assignee_type, notes)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [input.name, input.assigneeType, input.notes ?? null]
    );

    return mapAssigneeRow(result.rows[0] as AssigneeRow);
  }
}
