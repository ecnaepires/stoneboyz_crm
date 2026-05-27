import { Inject, Injectable } from '@nestjs/common';
import type { JobChecklist, UpdateJobChecklistInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapJobChecklistRow, type JobChecklistRow } from './job-checklist.mapper.js';

@Injectable()
export class JobChecklistsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByPhaseId(customerId: string, projectId: string, phaseId: string): Promise<JobChecklist | null> {
    const result = await this.pool.query<JobChecklistRow>(
      `
        SELECT jc.*
        FROM job_checklists jc
        JOIN phases p
          ON p.id = jc.phase_id
         AND p.deleted_at IS NULL
        WHERE jc.customer_id = $1
          AND jc.project_id = $2
          AND jc.phase_id = $3
      `,
      [customerId, projectId, phaseId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobChecklistRow(row);
  }

  async update(
    customerId: string,
    projectId: string,
    phaseId: string,
    input: UpdateJobChecklistInput
  ): Promise<JobChecklist | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries({
      depositReceived: 'deposit_received',
      tearoutRequired: 'tearout_required',
      tearoutCompleted: 'tearout_completed',
      readyToTemplate: 'ready_to_template',
      approvedForInstall: 'approved_for_install'
    } as const)) {
      const typedFieldName = fieldName as keyof UpdateJobChecklistInput;

      if (Object.hasOwn(input, typedFieldName)) {
        assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
      }
    }

    assignments.push('updated_at = now()');

    const customerPlaceholder = addValue(customerId);
    const projectPlaceholder = addValue(projectId);
    const phasePlaceholder = addValue(phaseId);

    const result = await this.pool.query<JobChecklistRow>(
      `
        UPDATE job_checklists
        SET ${assignments.join(', ')}
        WHERE customer_id = ${customerPlaceholder}
          AND project_id = ${projectPlaceholder}
          AND phase_id = ${phasePlaceholder}
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobChecklistRow(row);
  }
}
