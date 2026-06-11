import { Inject, Injectable } from "@nestjs/common";
import type {
  CalendarEventItem,
  CreateScheduledEventInput,
  ListCalendarEventsInput,
  ListScheduledEventsInput,
  ScheduledEvent,
  ScheduledEventStatus,
  UpdateScheduledEventInput,
} from "@stoneboyz/domain";
import type { Pool } from "pg";
import { DATABASE_POOL } from "../database.provider.js";
import {
  mapCalendarEventRow,
  mapScheduledEventRow,
  type CalendarEventRow,
  type ScheduledEventRow,
} from "./scheduled-event.mapper.js";

interface ScheduledEventListInput {
  cursor?: string | undefined;
  limit: number;
  eventType?: ListScheduledEventsInput["eventType"] | undefined;
  status?: ListScheduledEventsInput["status"] | undefined;
  projectId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

interface ScheduledEventCursor {
  id: string;
  scheduledAt: string;
}

const UPDATE_COLUMNS = {
  projectId: "project_id",
  phaseId: "phase_id",
  appointmentType: "appointment_type",
  templateKind: "template_kind",
  title: "title",
  scheduledAt: "scheduled_at",
  durationMinutes: "duration_minutes",
  address: "address",
} satisfies Record<
  Exclude<keyof UpdateScheduledEventInput, "actorUserId" | "assigneeIds">,
  string
>;

export class InvalidScheduledEventCursorError extends Error {
  constructor() {
    super("Invalid scheduled event cursor");
  }
}

export class UnknownAssigneeError extends Error {
  constructor() {
    super("One or more assignees do not exist");
  }
}

export class InvalidScheduledEventStatusError extends Error {
  constructor() {
    super("Invalid scheduled event status");
  }
}

const encodeCursor = (cursor: ScheduledEventCursor): string => {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
};

const decodeCursor = (cursor: string): ScheduledEventCursor => {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<ScheduledEventCursor>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.scheduledAt !== "string"
    ) {
      throw new InvalidScheduledEventCursorError();
    }

    return {
      id: parsed.id,
      scheduledAt: parsed.scheduledAt,
    };
  } catch (error) {
    if (error instanceof InvalidScheduledEventCursorError) {
      throw error;
    }

    throw new InvalidScheduledEventCursorError();
  }
};

@Injectable()
export class ScheduledEventsRepository {
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
      [customerId],
    );

    return result.rows[0]?.exists ?? false;
  }

  async listGlobal(
    input: ListCalendarEventsInput,
  ): Promise<{ data: CalendarEventItem[] }> {
    const values: unknown[] = [input.from, input.to];
    const where = [
      "se.deleted_at IS NULL",
      "c.deleted_at IS NULL",
      "se.scheduled_at >= $1::date",
      "se.scheduled_at < $2::date",
    ];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (input.eventTypes !== undefined && input.eventTypes.length > 0) {
      where.push(`se.event_type = ANY(${addValue(input.eventTypes)}::text[])`);
    }

    if (
      input.appointmentTypes !== undefined &&
      input.appointmentTypes.length > 0
    ) {
      where.push(
        `se.appointment_type = ANY(${addValue(input.appointmentTypes)}::text[])`,
      );
    }

    if (input.statuses !== undefined && input.statuses.length > 0) {
      where.push(`se.status = ANY(${addValue(input.statuses)}::text[])`);
    }

    if (input.customerId !== undefined) {
      where.push(`se.customer_id = ${addValue(input.customerId)}::uuid`);
    }

    if (input.projectId !== undefined) {
      where.push(`se.project_id = ${addValue(input.projectId)}::uuid`);
    }

    if (input.hideCompleted === true) {
      where.push("se.status <> 'completed'");
    }

    if (input.assigneeIds !== undefined && input.assigneeIds.length > 0) {
      where.push(
        `EXISTS (
          SELECT 1
          FROM scheduled_event_assignees sea_filter
          WHERE sea_filter.scheduled_event_id = se.id
            AND sea_filter.assignee_id = ANY(${addValue(input.assigneeIds)}::uuid[])
        )`,
      );
    }

    const result = await this.pool.query<CalendarEventRow>(
      `
        SELECT
          se.*,
          c.name AS customer_name,
          p.title AS project_title,
          p.job_number AS job_number
        FROM scheduled_events se
        JOIN customers c ON c.id = se.customer_id
        LEFT JOIN projects p ON p.id = se.project_id
        WHERE ${where.join(" AND ")}
        ORDER BY se.scheduled_at ASC, se.id ASC
        LIMIT 2000
      `,
      values,
    );

    const eventIds = result.rows.map((row) => row.id);
    const [assigneeIdsByEvent, jobActivityIdByEvent] = await Promise.all([
      this.loadAssigneeIds(eventIds),
      this.loadJobActivityIds(eventIds),
    ]);

    return {
      data: result.rows.map((row) =>
        mapCalendarEventRow(
          row,
          assigneeIdsByEvent.get(row.id) ?? [],
          jobActivityIdByEvent.get(row.id) ?? null,
        ),
      ),
    };
  }

  async list(
    customerId: string,
    input: ScheduledEventListInput,
  ): Promise<{
    data: ScheduledEvent[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const values: unknown[] = [customerId];
    const where = ["customer_id = $1", "deleted_at IS NULL"];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (input.eventType !== undefined) {
      where.push(`event_type = ${addValue(input.eventType)}`);
    }

    if (input.status !== undefined) {
      where.push(`status = ${addValue(input.status)}`);
    }

    if (input.projectId !== undefined) {
      where.push(`project_id = ${addValue(input.projectId)}`);
    }

    if (input.from !== undefined) {
      where.push(`scheduled_at >= ${addValue(input.from)}`);
    }

    if (input.to !== undefined) {
      where.push(`scheduled_at <= ${addValue(input.to)}`);
    }

    if (input.cursor !== undefined) {
      const cursor = decodeCursor(input.cursor);
      where.push(
        `(scheduled_at > ${addValue(cursor.scheduledAt)} OR (scheduled_at = ${addValue(cursor.scheduledAt)} AND id > ${addValue(cursor.id)}))`,
      );
    }

    const limitValue = addValue(input.limit + 1);
    const result = await this.pool.query<ScheduledEventRow>(
      `
        SELECT *
        FROM scheduled_events
        WHERE ${where.join(" AND ")}
        ORDER BY scheduled_at ASC, id ASC
        LIMIT ${limitValue}
      `,
      values,
    );

    const rows = result.rows.slice(0, input.limit);
    const eventIds = rows.map((row) => row.id);
    const [assigneeIdsByEvent, jobActivityIdByEvent] = await Promise.all([
      this.loadAssigneeIds(eventIds),
      this.loadJobActivityIds(eventIds),
    ]);

    return {
      data: rows.map((row) =>
        mapScheduledEventRow(
          row,
          assigneeIdsByEvent.get(row.id) ?? [],
          jobActivityIdByEvent.get(row.id) ?? null,
        ),
      ),
      hasMore: result.rows.length > input.limit,
      nextCursor:
        result.rows.length > input.limit && rows.at(-1) !== undefined
          ? encodeCursor({
              id: rows.at(-1)!.id,
              scheduledAt: rows.at(-1)!.scheduled_at.toISOString(),
            })
          : null,
    };
  }

  async create(
    customerId: string,
    input: CreateScheduledEventInput,
  ): Promise<ScheduledEvent> {
    const assigneeIds = input.assigneeIds ?? [];
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (assigneeIds.length > 0) {
        await this.ensureAssigneesExist(client, assigneeIds);
      }

      const result = await client.query<ScheduledEventRow>(
        `
          INSERT INTO scheduled_events (
            customer_id,
            project_id,
            phase_id,
            event_type,
            appointment_type,
            template_kind,
            title,
            scheduled_at,
            duration_minutes,
            address
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `,
        [
          customerId,
          input.projectId ?? null,
          input.phaseId ?? null,
          input.eventType,
          input.appointmentType ?? null,
          input.templateKind ?? null,
          input.title,
          input.scheduledAt,
          input.durationMinutes ?? 60,
          input.address ?? null,
        ],
      );

      const row = result.rows[0] as ScheduledEventRow;

      if (assigneeIds.length > 0) {
        await client.query(
          `
            INSERT INTO scheduled_event_assignees (scheduled_event_id, assignee_id)
            SELECT $1, unnest($2::uuid[])
          `,
          [row.id, assigneeIds],
        );
      }

      await client.query("COMMIT");

      // A just-created event cannot be linked to a job activity yet; the
      // activity links to it afterwards via markScheduled.
      return mapScheduledEventRow(row, assigneeIds, null);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(
    customerId: string,
    eventId: string,
  ): Promise<ScheduledEvent | null> {
    const result = await this.pool.query<ScheduledEventRow>(
      `
        SELECT *
        FROM scheduled_events
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
      `,
      [customerId, eventId],
    );

    const row = result.rows[0];

    return row === undefined ? null : this.withAssigneeIds(row);
  }

  private async withAssigneeIds(
    row: ScheduledEventRow,
  ): Promise<ScheduledEvent> {
    const [assigneeIdsByEvent, jobActivityIdByEvent] = await Promise.all([
      this.loadAssigneeIds([row.id]),
      this.loadJobActivityIds([row.id]),
    ]);
    return mapScheduledEventRow(
      row,
      assigneeIdsByEvent.get(row.id) ?? [],
      jobActivityIdByEvent.get(row.id) ?? null,
    );
  }

  private async loadJobActivityIds(
    eventIds: string[],
  ): Promise<Map<string, string>> {
    if (eventIds.length === 0) {
      return new Map();
    }

    const result = await this.pool.query<{
      scheduled_event_id: string;
      job_activity_id: string;
    }>(
      `
        SELECT scheduled_event_id, min(id::text) AS job_activity_id
        FROM job_activities
        WHERE scheduled_event_id = ANY($1::uuid[]) AND deleted_at IS NULL
        GROUP BY scheduled_event_id
      `,
      [eventIds],
    );

    return new Map(
      result.rows.map((row) => [row.scheduled_event_id, row.job_activity_id]),
    );
  }

  private async loadAssigneeIds(
    eventIds: string[],
  ): Promise<Map<string, string[]>> {
    if (eventIds.length === 0) {
      return new Map();
    }

    const result = await this.pool.query<{
      scheduled_event_id: string;
      assignee_ids: string[];
    }>(
      `
        SELECT scheduled_event_id, array_agg(assignee_id ORDER BY created_at, assignee_id) AS assignee_ids
        FROM scheduled_event_assignees
        WHERE scheduled_event_id = ANY($1::uuid[])
        GROUP BY scheduled_event_id
      `,
      [eventIds],
    );

    return new Map(
      result.rows.map((row) => [row.scheduled_event_id, row.assignee_ids]),
    );
  }

  private async ensureAssigneesExist(
    client: { query: Pool["query"] },
    assigneeIds: string[],
  ): Promise<void> {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*)::text AS count
        FROM assignees
        WHERE id = ANY($1::uuid[]) AND archived_at IS NULL
      `,
      [assigneeIds],
    );

    if (Number(result.rows[0]?.count ?? 0) !== assigneeIds.length) {
      throw new UnknownAssigneeError();
    }
  }

  async update(
    customerId: string,
    eventId: string,
    input: UpdateScheduledEventInput,
  ): Promise<ScheduledEvent | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateScheduledEventInput;

      if (Object.hasOwn(input, typedFieldName)) {
        assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
      }
    }

    assignments.push("updated_at = now()");

    const customerPlaceholder = addValue(customerId);
    const eventPlaceholder = addValue(eventId);

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<ScheduledEventRow>(
        `
          UPDATE scheduled_events
          SET ${assignments.join(", ")}
          WHERE customer_id = ${customerPlaceholder}
            AND id = ${eventPlaceholder}
            AND deleted_at IS NULL
            AND status IN ('scheduled', 'confirmed')
          RETURNING *
        `,
        values,
      );

      const row = result.rows[0];

      if (row === undefined) {
        await client.query("ROLLBACK");

        const current = await this.findById(customerId, eventId);
        if (current !== null) {
          throw new InvalidScheduledEventStatusError();
        }

        return null;
      }

      if (input.assigneeIds !== undefined) {
        if (input.assigneeIds.length > 0) {
          await this.ensureAssigneesExist(client, input.assigneeIds);
        }

        await client.query(
          "DELETE FROM scheduled_event_assignees WHERE scheduled_event_id = $1",
          [row.id],
        );

        if (input.assigneeIds.length > 0) {
          await client.query(
            `
              INSERT INTO scheduled_event_assignees (scheduled_event_id, assignee_id)
              SELECT $1, unnest($2::uuid[])
            `,
            [row.id, input.assigneeIds],
          );
        }
      }

      await client.query("COMMIT");

      return this.withAssigneeIds(row);
    } catch (error) {
      if (!(error instanceof InvalidScheduledEventStatusError)) {
        await client.query("ROLLBACK").catch(() => undefined);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async confirm(
    customerId: string,
    eventId: string,
  ): Promise<ScheduledEvent | null> {
    return this.transition(customerId, eventId, ["scheduled"], "confirmed");
  }

  async start(
    customerId: string,
    eventId: string,
    actorUserId: string,
  ): Promise<ScheduledEvent | null> {
    return this.transitionWithAudit(
      customerId,
      eventId,
      ["confirmed"],
      "in_progress",
      {
        userIdColumn: "started_by_user_id",
        atColumn: "started_at",
        actorUserId,
      },
    );
  }

  async complete(
    customerId: string,
    eventId: string,
    actorUserId: string,
  ): Promise<ScheduledEvent | null> {
    return this.transitionWithAudit(
      customerId,
      eventId,
      ["in_progress"],
      "completed",
      {
        userIdColumn: "completed_by_user_id",
        atColumn: "completed_at",
        actorUserId,
      },
    );
  }

  async cancel(
    customerId: string,
    eventId: string,
  ): Promise<ScheduledEvent | null> {
    return this.transition(
      customerId,
      eventId,
      ["scheduled", "confirmed", "in_progress"],
      "cancelled",
    );
  }

  async archive(
    customerId: string,
    eventId: string,
    actorUserId: string,
  ): Promise<ScheduledEvent | null> {
    const result = await this.pool.query<ScheduledEventRow>(
      `
        UPDATE scheduled_events
        SET deleted_at = now(), deleted_by_user_id = $3, updated_at = now()
        WHERE customer_id = $1
          AND id = $2
          AND deleted_at IS NULL
          AND status IN ('completed', 'cancelled')
        RETURNING *
      `,
      [customerId, eventId, actorUserId],
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return this.withAssigneeIds(row);
    }

    const current = await this.findById(customerId, eventId);
    if (current !== null) {
      throw new InvalidScheduledEventStatusError();
    }

    return null;
  }

  private async transition(
    customerId: string,
    eventId: string,
    fromStatuses: ScheduledEventStatus[],
    toStatus: ScheduledEventStatus,
  ): Promise<ScheduledEvent | null> {
    const result = await this.pool.query<ScheduledEventRow>(
      `
        UPDATE scheduled_events
        SET status = $3, updated_at = now()
        WHERE customer_id = $1
          AND id = $2
          AND deleted_at IS NULL
          AND status = ANY($4::text[])
        RETURNING *
      `,
      [customerId, eventId, toStatus, fromStatuses],
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return this.withAssigneeIds(row);
    }

    const current = await this.findById(customerId, eventId);
    if (current !== null) {
      throw new InvalidScheduledEventStatusError();
    }

    return null;
  }

  private async transitionWithAudit(
    customerId: string,
    eventId: string,
    fromStatuses: ScheduledEventStatus[],
    toStatus: Extract<ScheduledEventStatus, "in_progress" | "completed">,
    audit: {
      userIdColumn: "started_by_user_id" | "completed_by_user_id";
      atColumn: "started_at" | "completed_at";
      actorUserId: string;
    },
  ): Promise<ScheduledEvent | null> {
    const values: unknown[] = [
      customerId,
      eventId,
      toStatus,
      audit.actorUserId,
      fromStatuses,
    ];
    const result = await this.pool.query<ScheduledEventRow>(
      `
        UPDATE scheduled_events
        SET status = $3, ${audit.userIdColumn} = $4, ${audit.atColumn} = now(), updated_at = now()
        WHERE customer_id = $1
          AND id = $2
          AND deleted_at IS NULL
          AND status = ANY($5::text[])
        RETURNING *
      `,
      values,
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return this.withAssigneeIds(row);
    }

    const current = await this.findById(customerId, eventId);
    if (current !== null) {
      throw new InvalidScheduledEventStatusError();
    }

    return null;
  }
}
