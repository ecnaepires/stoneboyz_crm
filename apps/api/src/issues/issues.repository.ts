import { Inject, Injectable } from '@nestjs/common';
import type { CreateIssueInput, Issue, ListIssuesInput, UpdateIssueInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapIssueRow, type IssueRow } from './issue.mapper.js';

interface NormalizedListIssuesInput extends Omit<ListIssuesInput, 'limit'> {
  limit: number;
}

interface IssueCursor {
  id: string;
  createdAt: string;
}

export class InvalidIssueCursorError extends Error {
  constructor() {
    super('Invalid issue cursor');
  }
}

const encodeCursor = (cursor: IssueCursor): string => {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
};

const decodeCursor = (cursor: string): IssueCursor => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<IssueCursor>;

    if (typeof parsed.id !== 'string' || typeof parsed.createdAt !== 'string') {
      throw new InvalidIssueCursorError();
    }

    return {
      id: parsed.id,
      createdAt: parsed.createdAt
    };
  } catch (error) {
    if (error instanceof InvalidIssueCursorError) {
      throw error;
    }

    throw new InvalidIssueCursorError();
  }
};

@Injectable()
export class IssuesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(
    customerId: string,
    input: NormalizedListIssuesInput
  ): Promise<{ data: Issue[]; hasMore: boolean; nextCursor: string | null }> {
    const values: unknown[] = [customerId, input.projectId];
    const where = ['customer_id = $1', 'project_id = $2'];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    where.push(input.includeArchived ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL');

    if (input.phaseId !== undefined) {
      where.push(`phase_id = ${addValue(input.phaseId)}`);
    }

    if (input.status !== undefined) {
      where.push(`status = ${addValue(input.status)}`);
    }

    if (input.cursor !== undefined) {
      const cursor = decodeCursor(input.cursor);
      where.push(
        `(created_at < ${addValue(cursor.createdAt)} OR (created_at = ${addValue(cursor.createdAt)} AND id > ${addValue(cursor.id)}))`
      );
    }

    const limitValue = addValue(input.limit + 1);
    const result = await this.pool.query<IssueRow>(
      `
        SELECT *
        FROM issues
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC, id ASC
        LIMIT ${limitValue}
      `,
      values
    );

    const rows = result.rows.slice(0, input.limit);

    return {
      data: rows.map(mapIssueRow),
      hasMore: result.rows.length > input.limit,
      nextCursor:
        result.rows.length > input.limit && rows.at(-1) !== undefined
            ? encodeCursor({
              id: rows.at(-1)!.id,
              createdAt: rows.at(-1)!.created_at.toISOString()
            })
          : null
    };
  }

  async findById(customerId: string, projectId: string, issueId: string): Promise<Issue | null> {
    const result = await this.pool.query<IssueRow>(
      `
        SELECT *
        FROM issues
        WHERE customer_id = $1
          AND project_id = $2
          AND id = $3
          AND deleted_at IS NULL
      `,
      [customerId, projectId, issueId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapIssueRow(row);
  }

  async create(customerId: string, projectId: string, input: CreateIssueInput): Promise<Issue> {
    const result = await this.pool.query<IssueRow>(
      `
        INSERT INTO issues (
          customer_id,
          project_id,
          phase_id,
          type,
          severity,
          description,
          reported_by_user_id,
          assignee_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        customerId,
        projectId,
        input.phaseId ?? null,
        input.type,
        input.severity ?? 'medium',
        input.description,
        input.reportedByUserId,
        input.assigneeUserId ?? null
      ]
    );

    return mapIssueRow(result.rows[0] as IssueRow);
  }

  async update(
    customerId: string,
    projectId: string,
    issueId: string,
    input: UpdateIssueInput
  ): Promise<Issue | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (Object.hasOwn(input, 'severity')) {
      assignments.push(`severity = ${addValue(input.severity)}`);
    }

    if (Object.hasOwn(input, 'description')) {
      assignments.push(`description = ${addValue(input.description)}`);
    }

    if (Object.hasOwn(input, 'status')) {
      const statusPlaceholder = addValue(input.status);
      assignments.push(`status = ${statusPlaceholder}`);
      assignments.push(
        `resolved_at = CASE WHEN ${statusPlaceholder} IN ('resolved', 'closed') THEN COALESCE(resolved_at, now()) ELSE NULL END`
      );
    }

    if (Object.hasOwn(input, 'assigneeUserId')) {
      assignments.push(`assignee_user_id = ${addValue(input.assigneeUserId)}`);
    }

    assignments.push('updated_at = now()');

    const customerPlaceholder = addValue(customerId);
    const projectPlaceholder = addValue(projectId);
    const issuePlaceholder = addValue(issueId);

    const result = await this.pool.query<IssueRow>(
      `
        UPDATE issues
        SET ${assignments.join(', ')}
        WHERE customer_id = ${customerPlaceholder}
          AND project_id = ${projectPlaceholder}
          AND id = ${issuePlaceholder}
          AND deleted_at IS NULL
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    return row === undefined ? null : mapIssueRow(row);
  }

  async archive(customerId: string, projectId: string, issueId: string, actorUserId: string): Promise<Issue | null> {
    const result = await this.pool.query<IssueRow>(
      `
        UPDATE issues
        SET deleted_at = now(), deleted_by_user_id = $4, updated_at = now()
        WHERE customer_id = $1
          AND project_id = $2
          AND id = $3
          AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, projectId, issueId, actorUserId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapIssueRow(row);
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

  async phaseExists(customerId: string, projectId: string, phaseId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM phases
          WHERE id = $1
            AND customer_id = $2
            AND project_id = $3
            AND deleted_at IS NULL
        ) AS "exists"
      `,
      [phaseId, customerId, projectId]
    );

    return result.rows[0]?.exists ?? false;
  }
}
