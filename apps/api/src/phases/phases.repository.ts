import { Inject, Injectable } from '@nestjs/common';
import type { ArchivePhaseInput, CreatePhaseInput, Phase, UpdatePhaseInput } from '@stoneboyz/domain';
import type { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapPhaseRow, type PhaseRow } from './phase.mapper.js';

const ACTIVE_PHASE_ORDER = 'phase_number ASC, created_at ASC, id ASC';

@Injectable()
export class PhasesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(customerId: string, projectId: string, includeArchived = false): Promise<Phase[]> {
    const result = await this.pool.query<PhaseRow>(
      `
        SELECT *
        FROM phases
        WHERE customer_id = $1
          AND project_id = $2
          AND ${includeArchived ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'}
        ORDER BY ${ACTIVE_PHASE_ORDER}
      `,
      [customerId, projectId]
    );

    return result.rows.map(mapPhaseRow);
  }

  async findById(customerId: string, projectId: string, phaseId: string): Promise<Phase | null> {
    const result = await this.pool.query<PhaseRow>(
      `
        SELECT *
        FROM phases
        WHERE customer_id = $1
          AND project_id = $2
          AND id = $3
          AND deleted_at IS NULL
      `,
      [customerId, projectId, phaseId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapPhaseRow(row);
  }

  async findFirstByProjectId(projectId: string): Promise<Phase | null> {
    const result = await this.pool.query<PhaseRow>(
      `
        SELECT *
        FROM phases
        WHERE project_id = $1
          AND deleted_at IS NULL
        ORDER BY ${ACTIVE_PHASE_ORDER}
        LIMIT 1
      `,
      [projectId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapPhaseRow(row);
  }

  async create(customerId: string, projectId: string, input: CreatePhaseInput): Promise<Phase> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const phase = await this.createWithClient(client, customerId, projectId, input);
      await client.query('COMMIT');
      return phase;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createWithClient(
    client: PoolClient,
    customerId: string,
    projectId: string,
    input: CreatePhaseInput
  ): Promise<Phase> {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [projectId]);

    const result = await client.query<{ next_number: number }>(
      `
        SELECT COALESCE(MAX(phase_number), 0) + 1 AS next_number
        FROM phases
        WHERE project_id = $1
      `,
      [projectId]
    );

    const nextPhaseNumber = result.rows[0]?.next_number ?? 1;
    const phaseResult = await client.query<PhaseRow>(
      `
        INSERT INTO phases (
          customer_id,
          project_id,
          phase_number,
          name
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [customerId, projectId, nextPhaseNumber, input.name]
    );

    return mapPhaseRow(phaseResult.rows[0] as PhaseRow);
  }

  async update(customerId: string, projectId: string, phaseId: string, input: UpdatePhaseInput): Promise<Phase | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (Object.hasOwn(input, 'name')) {
      assignments.push(`name = ${addValue(input.name)}`);
    }

    assignments.push('updated_at = now()');
    const customerPlaceholder = addValue(customerId);
    const projectPlaceholder = addValue(projectId);
    const phasePlaceholder = addValue(phaseId);

    const result = await this.pool.query<PhaseRow>(
      `
        UPDATE phases
        SET ${assignments.join(', ')}
        WHERE customer_id = ${customerPlaceholder}
          AND project_id = ${projectPlaceholder}
          AND id = ${phasePlaceholder}
          AND deleted_at IS NULL
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    return row === undefined ? null : mapPhaseRow(row);
  }

  async archive(customerId: string, projectId: string, phaseId: string, input: ArchivePhaseInput): Promise<Phase | null> {
    const result = await this.pool.query<PhaseRow>(
      `
        UPDATE phases
        SET deleted_at = now(), deleted_by_user_id = $4, updated_at = now()
        WHERE customer_id = $1
          AND project_id = $2
          AND id = $3
          AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, projectId, phaseId, input.actorUserId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapPhaseRow(row);
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
}
