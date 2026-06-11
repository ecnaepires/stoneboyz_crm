import { Inject, Injectable } from "@nestjs/common";
import {
  calendarViewConfigSchema,
  type CalendarView,
  type CalendarViewConfig,
  type CalendarViewKind,
} from "@stoneboyz/domain";
import type { Pool } from "pg";
import { DATABASE_POOL } from "../database.provider.js";
import {
  mapCalendarViewRow,
  type CalendarViewRow,
} from "./calendar-view.mapper.js";

@Injectable()
export class CalendarViewsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async listVisible(
    actorUserId: string,
    viewKind: CalendarViewKind,
  ): Promise<CalendarView[]> {
    const result = await this.pool.query<CalendarViewRow>(
      `
        SELECT
          cv.*,
          (uvd.calendar_view_id IS NOT NULL) AS is_default
        FROM calendar_views cv
        LEFT JOIN user_view_defaults uvd
          ON uvd.calendar_view_id = cv.id
         AND uvd.user_id = $1
         AND uvd.view_kind = cv.view_kind
        WHERE cv.archived_at IS NULL
          AND cv.view_kind = $2
          AND (cv.is_shared OR cv.owner_user_id = $1)
        ORDER BY cv.is_shared DESC, cv.name ASC
      `,
      [actorUserId, viewKind],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async findVisibleById(
    actorUserId: string,
    viewId: string,
  ): Promise<CalendarView | null> {
    const result = await this.pool.query<CalendarViewRow>(
      `
        SELECT
          cv.*,
          (uvd.calendar_view_id IS NOT NULL) AS is_default
        FROM calendar_views cv
        LEFT JOIN user_view_defaults uvd
          ON uvd.calendar_view_id = cv.id
         AND uvd.user_id = $1
         AND uvd.view_kind = cv.view_kind
        WHERE cv.id = $2
          AND cv.archived_at IS NULL
          AND (cv.is_shared OR cv.owner_user_id = $1)
      `,
      [actorUserId, viewId],
    );

    const row = result.rows[0];
    return row === undefined ? null : this.mapRow(row);
  }

  async create(input: {
    actorUserId: string;
    name: string;
    viewKind: CalendarViewKind;
    isShared: boolean;
    config: CalendarViewConfig;
  }): Promise<CalendarView> {
    const result = await this.pool.query<CalendarViewRow>(
      `
        INSERT INTO calendar_views (name, view_kind, owner_user_id, is_shared, config)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING *, false AS is_default
      `,
      [
        input.name,
        input.viewKind,
        input.actorUserId,
        input.isShared,
        JSON.stringify(input.config),
      ],
    );

    return this.mapRow(result.rows[0] as CalendarViewRow);
  }

  async update(
    actorUserId: string,
    viewId: string,
    input: {
      name?: string | undefined;
      isShared?: boolean | undefined;
      config?: CalendarViewConfig | undefined;
    },
  ): Promise<CalendarView | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (input.name !== undefined) {
      assignments.push(`name = ${addValue(input.name)}`);
    }

    if (input.isShared !== undefined) {
      assignments.push(`is_shared = ${addValue(input.isShared)}`);
    }

    if (input.config !== undefined) {
      assignments.push(`config = ${addValue(JSON.stringify(input.config))}::jsonb`);
    }

    assignments.push("updated_at = now()");

    const actorPlaceholder = addValue(actorUserId);
    const viewPlaceholder = addValue(viewId);

    const result = await this.pool.query<CalendarViewRow>(
      `
        UPDATE calendar_views cv
        SET ${assignments.join(", ")}
        WHERE cv.id = ${viewPlaceholder}
          AND cv.archived_at IS NULL
          AND (
            cv.owner_user_id = ${actorPlaceholder}
            OR (
              cv.is_shared = true
              AND EXISTS (
                SELECT 1 FROM "user" u
                WHERE u.id = ${actorPlaceholder}
                  AND u.role = 'admin'
              )
            )
          )
        RETURNING
          cv.*,
          EXISTS (
            SELECT 1
            FROM user_view_defaults uvd
            WHERE uvd.calendar_view_id = cv.id
              AND uvd.user_id = ${actorPlaceholder}
              AND uvd.view_kind = cv.view_kind
          ) AS is_default
      `,
      values,
    );

    const row = result.rows[0];
    return row === undefined ? null : this.mapRow(row);
  }

  async archive(actorUserId: string, viewId: string): Promise<CalendarView | null> {
    const result = await this.pool.query<CalendarViewRow>(
      `
        UPDATE calendar_views cv
        SET archived_at = now(), updated_at = now()
        WHERE cv.id = $2
          AND cv.archived_at IS NULL
          AND (
            cv.owner_user_id = $1
            OR (
              cv.is_shared = true
              AND EXISTS (
                SELECT 1 FROM "user" u
                WHERE u.id = $1
                  AND u.role = 'admin'
              )
            )
          )
        RETURNING cv.*, false AS is_default
      `,
      [actorUserId, viewId],
    );

    const row = result.rows[0];
    return row === undefined ? null : this.mapRow(row);
  }

  async setDefault(actorUserId: string, view: CalendarView): Promise<CalendarView> {
    await this.pool.query(
      `
        INSERT INTO user_view_defaults (user_id, view_kind, calendar_view_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, view_kind)
        DO UPDATE SET calendar_view_id = EXCLUDED.calendar_view_id
      `,
      [actorUserId, view.viewKind, view.id],
    );

    return { ...view, isDefault: true };
  }

  private mapRow(row: CalendarViewRow): CalendarView {
    const parsedConfig = calendarViewConfigSchema.safeParse(row.config);
    const config = parsedConfig.success
      ? parsedConfig.data
      : calendarViewConfigSchema.parse({ version: 2 });
    return mapCalendarViewRow(row, config);
  }
}
