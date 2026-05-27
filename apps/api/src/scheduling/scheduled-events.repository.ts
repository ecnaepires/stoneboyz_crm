import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateScheduledEventInput,
  ListScheduledEventsInput,
  ScheduledEvent,
  ScheduledEventStatus,
  UpdateScheduledEventInput
} from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapScheduledEventRow, type ScheduledEventRow } from './scheduled-event.mapper.js';

interface ScheduledEventListInput {
  cursor?: string | undefined;
  limit: number;
  eventType?: ListScheduledEventsInput['eventType'] | undefined;
  status?: ListScheduledEventsInput['status'] | undefined;
  projectId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

interface ScheduledEventCursor {
  id: string;
  scheduledAt: string;
}

const UPDATE_COLUMNS = {
  projectId: 'project_id',
  phaseId: 'phase_id',
  appointmentType: 'appointment_type',
  templateKind: 'template_kind',
  title: 'title',
  scheduledAt: 'scheduled_at',
  durationMinutes: 'duration_minutes',
  assigneeUserIds: 'assignee_user_ids',
  address: 'address'
} satisfies Record<Exclude<keyof UpdateScheduledEventInput, 'actorUserId'>, string>;

export class InvalidScheduledEventCursorError extends Error {
  constructor() {
    super('Invalid scheduled event cursor');
  }
}

export class InvalidScheduledEventStatusError extends Error {
  constructor() {
    super('Invalid scheduled event status');
  }
}

const encodeCursor = (cursor: ScheduledEventCursor): string => {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
};

const decodeCursor = (cursor: string): ScheduledEventCursor => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<ScheduledEventCursor>;

    if (typeof parsed.id !== 'string' || typeof parsed.scheduledAt !== 'string') {
      throw new InvalidScheduledEventCursorError();
    }

    return {
      id: parsed.id,
      scheduledAt: parsed.scheduledAt
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
      [customerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async list(
    customerId: string,
    input: ScheduledEventListInput
  ): Promise<{ data: ScheduledEvent[]; hasMore: boolean; nextCursor: string | null }> {
    const values: unknown[] = [customerId];
    const where = ['customer_id = $1', 'deleted_at IS NULL'];

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
        `(scheduled_at > ${addValue(cursor.scheduledAt)} OR (scheduled_at = ${addValue(cursor.scheduledAt)} AND id > ${addValue(cursor.id)}))`
      );
    }

    const limitValue = addValue(input.limit + 1);
    const result = await this.pool.query<ScheduledEventRow>(
      `
        SELECT *
        FROM scheduled_events
        WHERE ${where.join(' AND ')}
        ORDER BY scheduled_at ASC, id ASC
        LIMIT ${limitValue}
      `,
      values
    );

    const rows = result.rows.slice(0, input.limit);

    return {
      data: rows.map(mapScheduledEventRow),
      hasMore: result.rows.length > input.limit,
      nextCursor:
        result.rows.length > input.limit && rows.at(-1) !== undefined
          ? encodeCursor({ id: rows.at(-1)!.id, scheduledAt: rows.at(-1)!.scheduled_at.toISOString() })
          : null
    };
  }

  async create(customerId: string, input: CreateScheduledEventInput): Promise<ScheduledEvent> {
    const result = await this.pool.query<ScheduledEventRow>(
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
          assignee_user_ids,
          address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid[], $11)
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
        input.assigneeUserIds,
        input.address ?? null
      ]
    );

    return mapScheduledEventRow(result.rows[0] as ScheduledEventRow);
  }

  async findById(customerId: string, eventId: string): Promise<ScheduledEvent | null> {
    const result = await this.pool.query<ScheduledEventRow>(
      `
        SELECT *
        FROM scheduled_events
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
      `,
      [customerId, eventId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapScheduledEventRow(row);
  }

  async update(customerId: string, eventId: string, input: UpdateScheduledEventInput): Promise<ScheduledEvent | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];
    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateScheduledEventInput;

      if (Object.hasOwn(input, typedFieldName)) {
        const placeholder = addValue(input[typedFieldName]);
        assignments.push(`${columnName} = ${fieldName === 'assigneeUserIds' ? `${placeholder}::uuid[]` : placeholder}`);
      }
    }

    assignments.push('updated_at = now()');

    const customerPlaceholder = addValue(customerId);
    const eventPlaceholder = addValue(eventId);

    const result = await this.pool.query<ScheduledEventRow>(
      `
        UPDATE scheduled_events
        SET ${assignments.join(', ')}
        WHERE customer_id = ${customerPlaceholder}
          AND id = ${eventPlaceholder}
          AND deleted_at IS NULL
          AND status IN ('scheduled', 'confirmed')
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return mapScheduledEventRow(row);
    }

    const current = await this.findById(customerId, eventId);
    if (current !== null) {
      throw new InvalidScheduledEventStatusError();
    }

    return null;
  }

  async confirm(customerId: string, eventId: string): Promise<ScheduledEvent | null> {
    return this.transition(customerId, eventId, ['scheduled'], 'confirmed');
  }

  async start(customerId: string, eventId: string, actorUserId: string): Promise<ScheduledEvent | null> {
    return this.transitionWithAudit(customerId, eventId, ['confirmed'], 'in_progress', {
      userIdColumn: 'started_by_user_id',
      atColumn: 'started_at',
      actorUserId
    });
  }

  async complete(customerId: string, eventId: string, actorUserId: string): Promise<ScheduledEvent | null> {
    return this.transitionWithAudit(customerId, eventId, ['in_progress'], 'completed', {
      userIdColumn: 'completed_by_user_id',
      atColumn: 'completed_at',
      actorUserId
    });
  }

  async cancel(customerId: string, eventId: string): Promise<ScheduledEvent | null> {
    return this.transition(customerId, eventId, ['scheduled', 'confirmed', 'in_progress'], 'cancelled');
  }

  async archive(customerId: string, eventId: string, actorUserId: string): Promise<ScheduledEvent | null> {
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
      [customerId, eventId, actorUserId]
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return mapScheduledEventRow(row);
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
    toStatus: ScheduledEventStatus
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
      [customerId, eventId, toStatus, fromStatuses]
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return mapScheduledEventRow(row);
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
    toStatus: Extract<ScheduledEventStatus, 'in_progress' | 'completed'>,
    audit: { userIdColumn: 'started_by_user_id' | 'completed_by_user_id'; atColumn: 'started_at' | 'completed_at'; actorUserId: string }
  ): Promise<ScheduledEvent | null> {
    const values: unknown[] = [customerId, eventId, toStatus, audit.actorUserId, fromStatuses];
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
      values
    );

    const row = result.rows[0];

    if (row !== undefined) {
      return mapScheduledEventRow(row);
    }

    const current = await this.findById(customerId, eventId);
    if (current !== null) {
      throw new InvalidScheduledEventStatusError();
    }

    return null;
  }
}
