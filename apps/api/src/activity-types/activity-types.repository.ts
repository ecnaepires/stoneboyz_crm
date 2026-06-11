import { Inject, Injectable } from '@nestjs/common';
import type { ActivityType, CreateActivityTypeInput, UpdateActivityTypeInput } from '@stoneboyz/domain';
import type { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapActivityTypeRow, type ActivityTypeRow } from './activity-type.mapper.js';

const UPDATE_COLUMNS = {
  name: 'name',
  color: 'color',
  pipelineStage: 'pipeline_stage',
  countsSquareFootage: 'counts_square_footage',
  autoscheduleEligible: 'autoschedule_eligible',
  usesTemplateKind: 'uses_template_kind',
  defaultDurationMinutes: 'default_duration_minutes',
  sortOrder: 'sort_order',
} satisfies Record<Exclude<keyof UpdateActivityTypeInput, 'actorUserId'>, string>;

const UPDATE_COLUMNS_EXCEPT_SORT_ORDER = Object.fromEntries(
  Object.entries(UPDATE_COLUMNS).filter(([fieldName]) => fieldName !== 'sortOrder')
) as Omit<typeof UPDATE_COLUMNS, 'sortOrder'>;

@Injectable()
export class ActivityTypesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(shopId: string, includeArchived: boolean): Promise<ActivityType[]> {
    const result = await this.pool.query<ActivityTypeRow>(
      `
        SELECT *
        FROM activity_types
        WHERE shop_id = $1
          AND ($2::boolean OR archived_at IS NULL)
        ORDER BY sort_order ASC, name ASC, id ASC
      `,
      [shopId, includeArchived]
    );

    return result.rows.map(mapActivityTypeRow);
  }

  async findById(shopId: string, activityTypeId: string): Promise<ActivityType | null> {
    const result = await this.pool.query<ActivityTypeRow>(
      `
        SELECT *
        FROM activity_types
        WHERE shop_id = $1 AND id = $2
      `,
      [shopId, activityTypeId]
    );

    const row = result.rows[0];
    return row === undefined ? null : mapActivityTypeRow(row);
  }

  async findBySeedSlug(shopId: string, seedSlug: string): Promise<ActivityType | null> {
    const result = await this.pool.query<ActivityTypeRow>(
      `
        SELECT *
        FROM activity_types
        WHERE shop_id = $1 AND seed_slug = $2
      `,
      [shopId, seedSlug]
    );

    const row = result.rows[0];
    return row === undefined ? null : mapActivityTypeRow(row);
  }

  async create(shopId: string, input: CreateActivityTypeInput): Promise<ActivityType> {
    return this.withTransaction(async (client) => {
      const sortOrder = input.sortOrder ?? await this.nextSortOrder(client, shopId);
      if (input.sortOrder !== undefined) {
        await this.shiftSortOrdersForInsert(client, shopId, input.sortOrder);
      }

      const result = await client.query<ActivityTypeRow>(
        `
          INSERT INTO activity_types (
            shop_id,
            name,
            color,
            pipeline_stage,
            counts_square_footage,
            autoschedule_eligible,
            uses_template_kind,
            default_duration_minutes,
            sort_order
          )
          VALUES (
            $1, $2, $3, $4,
            COALESCE($5, false),
            COALESCE($6, false),
            COALESCE($7, false),
            COALESCE($8, 60),
            $9
          )
          RETURNING *
        `,
        [
          shopId,
          input.name,
          input.color,
          input.pipelineStage ?? null,
          input.countsSquareFootage,
          input.autoscheduleEligible,
          input.usesTemplateKind,
          input.defaultDurationMinutes,
          sortOrder,
        ]
      );

      return mapActivityTypeRow(result.rows[0] as ActivityTypeRow);
    });
  }

  async update(shopId: string, activityTypeId: string, input: UpdateActivityTypeInput): Promise<ActivityType | null> {
    if (Object.hasOwn(input, 'sortOrder')) {
      return this.updateWithSortOrder(shopId, activityTypeId, input);
    }

    const values: unknown[] = [];
    const assignments: string[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateActivityTypeInput;
      if (Object.hasOwn(input, typedFieldName)) {
        assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
      }
    }

    assignments.push('updated_at = now()');
    const shopPlaceholder = addValue(shopId);
    const idPlaceholder = addValue(activityTypeId);

    const result = await this.pool.query<ActivityTypeRow>(
      `
        UPDATE activity_types
        SET ${assignments.join(', ')}
        WHERE shop_id = ${shopPlaceholder}
          AND id = ${idPlaceholder}
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];
    return row === undefined ? null : mapActivityTypeRow(row);
  }

  private async updateWithSortOrder(
    shopId: string,
    activityTypeId: string,
    input: UpdateActivityTypeInput
  ): Promise<ActivityType | null> {
    return this.withTransaction(async (client) => {
      const existing = await client.query<{ sort_order: number }>(
        `
          SELECT sort_order
          FROM activity_types
          WHERE shop_id = $1 AND id = $2
          FOR UPDATE
        `,
        [shopId, activityTypeId]
      );
      const currentSortOrder = existing.rows[0]?.sort_order;
      if (currentSortOrder === undefined) {
        return null;
      }

      await client.query('SELECT id FROM activity_types WHERE shop_id = $1 FOR UPDATE', [shopId]);
      const nextSortOrder = input.sortOrder as number;
      if (nextSortOrder > currentSortOrder) {
        await client.query(
          `
            UPDATE activity_types
            SET sort_order = sort_order - 1, updated_at = now()
            WHERE shop_id = $1
              AND id <> $2
              AND sort_order > $3
              AND sort_order <= $4
          `,
          [shopId, activityTypeId, currentSortOrder, nextSortOrder]
        );
      } else if (nextSortOrder < currentSortOrder) {
        await client.query(
          `
            UPDATE activity_types
            SET sort_order = sort_order + 1, updated_at = now()
            WHERE shop_id = $1
              AND id <> $2
              AND sort_order >= $3
              AND sort_order < $4
          `,
          [shopId, activityTypeId, nextSortOrder, currentSortOrder]
        );
      }

      const values: unknown[] = [];
      const assignments: string[] = [];
      const addValue = (value: unknown): string => {
        values.push(value);
        return `$${values.length}`;
      };

      for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS_EXCEPT_SORT_ORDER)) {
        const typedFieldName = fieldName as keyof UpdateActivityTypeInput;
        if (Object.hasOwn(input, typedFieldName)) {
          assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
        }
      }

      assignments.push(`sort_order = ${addValue(nextSortOrder)}`);
      assignments.push('updated_at = now()');
      const shopPlaceholder = addValue(shopId);
      const idPlaceholder = addValue(activityTypeId);

      const result = await client.query<ActivityTypeRow>(
        `
          UPDATE activity_types
          SET ${assignments.join(', ')}
          WHERE shop_id = ${shopPlaceholder}
            AND id = ${idPlaceholder}
          RETURNING *
        `,
        values
      );

      const row = result.rows[0];
      return row === undefined ? null : mapActivityTypeRow(row);
    });
  }

  private async shiftSortOrdersForInsert(client: PoolClient, shopId: string, sortOrder: number): Promise<void> {
    await client.query('SELECT id FROM activity_types WHERE shop_id = $1 FOR UPDATE', [shopId]);
    await client.query(
      `
        UPDATE activity_types
        SET sort_order = sort_order + 1, updated_at = now()
        WHERE shop_id = $1
          AND sort_order >= $2
      `,
      [shopId, sortOrder]
    );
  }

  private async nextSortOrder(client: PoolClient, shopId: string): Promise<number> {
    const result = await client.query<{ sort_order: number }>(
      'SELECT COALESCE(max(sort_order), 0) + 1 AS sort_order FROM activity_types WHERE shop_id = $1',
      [shopId]
    );
    return result.rows[0]?.sort_order ?? 1;
  }

  private async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async archive(shopId: string, activityTypeId: string): Promise<ActivityType | null> {
    const result = await this.pool.query<ActivityTypeRow>(
      `
        UPDATE activity_types
        SET archived_at = now(), updated_at = now()
        WHERE shop_id = $1
          AND id = $2
          AND archived_at IS NULL
        RETURNING *
      `,
      [shopId, activityTypeId]
    );

    const row = result.rows[0];
    return row === undefined ? null : mapActivityTypeRow(row);
  }
}
