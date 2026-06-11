import { Inject, Injectable } from '@nestjs/common';
import type { JobActivity } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapJobActivityRow, type JobActivityRow } from './job-activity.mapper.js';

@Injectable()
export class JobActivitiesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(customerId: string, projectId: string): Promise<JobActivity[]> {
    const result = await this.pool.query<JobActivityRow>(
      `
        SELECT ja.*, COALESCE(at.autoschedule_eligible, false) AS autoschedule_eligible
        FROM job_activities ja
        LEFT JOIN activity_types at ON at.id = ja.activity_type_id
        WHERE ja.customer_id = $1
          AND ja.project_id = $2
          AND ja.deleted_at IS NULL
        ORDER BY ja.sort_order ASC, ja.id ASC
      `,
      [customerId, projectId]
    );

    return result.rows.map(mapJobActivityRow);
  }

  async findById(customerId: string, projectId: string, activityId: string): Promise<JobActivity | null> {
    const result = await this.pool.query<JobActivityRow>(
      `
        SELECT ja.*, COALESCE(at.autoschedule_eligible, false) AS autoschedule_eligible
        FROM job_activities ja
        LEFT JOIN activity_types at ON at.id = ja.activity_type_id
        WHERE ja.customer_id = $1
          AND ja.project_id = $2
          AND ja.id = $3
          AND ja.deleted_at IS NULL
      `,
      [customerId, projectId, activityId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobActivityRow(row);
  }

  async markScheduled(
    customerId: string,
    projectId: string,
    activityId: string,
    params: {
      scheduledEventId: string;
      durationMinutes: number;
      autoscheduleState?: JobActivity['autoscheduleState'];
    }
  ): Promise<JobActivity | null> {
    const result = await this.pool.query<JobActivityRow>(
      `
        WITH updated AS (
        UPDATE job_activities
        SET
          scheduled_event_id = $4,
          duration_minutes = $5,
          autoschedule_state = $6,
          status = 'scheduled',
          updated_at = now()
        WHERE customer_id = $1
          AND project_id = $2
          AND id = $3
          AND deleted_at IS NULL
          AND status = 'not_scheduled'
          AND scheduled_event_id IS NULL
        RETURNING *
        )
        SELECT updated.*, COALESCE(at.autoschedule_eligible, false) AS autoschedule_eligible
        FROM updated
        LEFT JOIN activity_types at ON at.id = updated.activity_type_id
      `,
      [
        customerId,
        projectId,
        activityId,
        params.scheduledEventId,
        params.durationMinutes,
        params.autoscheduleState ?? null
      ]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobActivityRow(row);
  }

  async updateScheduleDetails(
    customerId: string,
    projectId: string,
    activityId: string,
    params: { durationMinutes: number; markManualOverride?: boolean }
  ): Promise<JobActivity | null> {
    const result = await this.pool.query<JobActivityRow>(
      `
        WITH updated AS (
        UPDATE job_activities
        SET
          duration_minutes = $4,
          autoschedule_state = CASE WHEN $5 THEN 'manual_override' ELSE autoschedule_state END,
          manual_override_at = CASE WHEN $5 THEN now() ELSE manual_override_at END,
          updated_at = now()
        WHERE customer_id = $1
          AND project_id = $2
          AND id = $3
          AND deleted_at IS NULL
          AND status IN ('scheduled', 'confirmed')
          AND scheduled_event_id IS NOT NULL
        RETURNING *
        )
        SELECT updated.*, COALESCE(at.autoschedule_eligible, false) AS autoschedule_eligible
        FROM updated
        LEFT JOIN activity_types at ON at.id = updated.activity_type_id
      `,
      [customerId, projectId, activityId, params.durationMinutes, params.markManualOverride ?? false]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobActivityRow(row);
  }

  async updateStatusByScheduledEventId(
    customerId: string,
    scheduledEventId: string,
    status: JobActivity['status']
  ): Promise<JobActivity | null> {
    const result = await this.pool.query<JobActivityRow>(
      `
        WITH updated AS (
        UPDATE job_activities
        SET status = $3, updated_at = now()
        WHERE customer_id = $1
          AND scheduled_event_id = $2
          AND deleted_at IS NULL
        RETURNING *
        )
        SELECT updated.*, COALESCE(at.autoschedule_eligible, false) AS autoschedule_eligible
        FROM updated
        LEFT JOIN activity_types at ON at.id = updated.activity_type_id
      `,
      [customerId, scheduledEventId, status]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapJobActivityRow(row);
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
