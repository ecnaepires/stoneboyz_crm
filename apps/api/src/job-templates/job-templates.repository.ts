import { Inject, Injectable } from '@nestjs/common';
import type { JobTemplate } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapJobTemplateRow, type JobTemplateRow } from './job-template.mapper.js';

@Injectable()
export class JobTemplatesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(): Promise<JobTemplate[]> {
    const result = await this.pool.query<JobTemplateRow>(
      `
        SELECT *
        FROM job_templates
        ORDER BY is_default DESC, name ASC, id ASC
      `
    );

    return result.rows.map(mapJobTemplateRow);
  }

  async findById(jobTemplateId: string): Promise<JobTemplate | null> {
    const result = await this.pool.query<JobTemplateRow>(
      `
        SELECT *
        FROM job_templates
        WHERE id = $1
      `,
      [jobTemplateId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobTemplateRow(row);
  }

  async findDefault(): Promise<JobTemplate | null> {
    const result = await this.pool.query<JobTemplateRow>(
      `
        SELECT *
        FROM job_templates
        WHERE is_default = true
        ORDER BY name ASC, id ASC
        LIMIT 1
      `
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobTemplateRow(row);
  }
}
