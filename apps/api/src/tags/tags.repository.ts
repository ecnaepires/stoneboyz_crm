import { Inject, Injectable } from '@nestjs/common';
import type { CreateTagInput, Tag, UpdateTagInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapTagRow, type TagRow } from './tag.mapper.js';

@Injectable()
export class TagsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(includeArchived = false): Promise<Tag[]> {
    const result = await this.pool.query<TagRow>(
      `
        SELECT *
        FROM tags
        WHERE ${includeArchived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'}
        ORDER BY created_at DESC, id ASC
      `
    );

    return result.rows.map(mapTagRow);
  }

  async findById(tagId: string): Promise<Tag | null> {
    const result = await this.pool.query<TagRow>(
      `
        SELECT *
        FROM tags
        WHERE id = $1 AND archived_at IS NULL
      `,
      [tagId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapTagRow(row);
  }

  async create(input: CreateTagInput): Promise<Tag> {
    const result = await this.pool.query<TagRow>(
      `
        INSERT INTO tags (name, color)
        VALUES ($1, $2)
        RETURNING *
      `,
      [input.name, input.color ?? null]
    );

    return mapTagRow(result.rows[0] as TagRow);
  }

  async update(tagId: string, input: UpdateTagInput): Promise<Tag | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (Object.hasOwn(input, 'name')) {
      assignments.push(`name = ${addValue(input.name)}`);
    }

    if (Object.hasOwn(input, 'color')) {
      assignments.push(`color = ${addValue(input.color)}`);
    }

    assignments.push('updated_at = now()');
    const tagPlaceholder = addValue(tagId);

    const result = await this.pool.query<TagRow>(
      `
        UPDATE tags
        SET ${assignments.join(', ')}
        WHERE id = ${tagPlaceholder}
          AND archived_at IS NULL
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    return row === undefined ? null : mapTagRow(row);
  }

  async archive(tagId: string, _actorUserId: string): Promise<Tag | null> {
    const result = await this.pool.query<TagRow>(
      `
        UPDATE tags
        SET archived_at = now(), updated_at = now()
        WHERE id = $1
          AND archived_at IS NULL
        RETURNING *
      `,
      [tagId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapTagRow(row);
  }

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

  async listCustomerTags(customerId: string): Promise<Tag[]> {
    const result = await this.pool.query<TagRow>(
      `
        SELECT t.*
        FROM customer_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.customer_id = $1
          AND t.archived_at IS NULL
        ORDER BY t.name ASC, t.id ASC
      `,
      [customerId]
    );

    return result.rows.map(mapTagRow);
  }

  async listProjectTags(customerId: string, projectId: string): Promise<Tag[]> {
    const result = await this.pool.query<TagRow>(
      `
        SELECT t.*
        FROM project_tags pt
        JOIN projects p ON p.id = pt.project_id
        JOIN tags t ON t.id = pt.tag_id
        WHERE pt.project_id = $1
          AND p.customer_id = $2
          AND t.archived_at IS NULL
        ORDER BY t.name ASC, t.id ASC
      `,
      [projectId, customerId]
    );

    return result.rows.map(mapTagRow);
  }

  async assignCustomerTag(customerId: string, tagId: string): Promise<boolean> {
    const result = await this.pool.query(
      `
        INSERT INTO customer_tags (customer_id, tag_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      [customerId, tagId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async unassignCustomerTag(customerId: string, tagId: string): Promise<boolean> {
    const result = await this.pool.query(
      `
        DELETE FROM customer_tags
        WHERE customer_id = $1 AND tag_id = $2
      `,
      [customerId, tagId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async assignProjectTag(customerId: string, projectId: string, tagId: string): Promise<boolean> {
    const result = await this.pool.query(
      `
        INSERT INTO project_tags (project_id, tag_id)
        SELECT $2, $3
        WHERE EXISTS (
          SELECT 1
          FROM projects
          WHERE id = $2
            AND customer_id = $1
            AND archived_at IS NULL
        )
        ON CONFLICT DO NOTHING
      `,
      [customerId, projectId, tagId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async unassignProjectTag(customerId: string, projectId: string, tagId: string): Promise<boolean> {
    const result = await this.pool.query(
      `
        DELETE FROM project_tags pt
        USING projects p
        WHERE pt.project_id = p.id
          AND pt.project_id = $2
          AND pt.tag_id = $3
          AND p.customer_id = $1
          AND p.archived_at IS NULL
      `,
      [customerId, projectId, tagId]
    );

    return (result.rowCount ?? 0) > 0;
  }
}
