import { Inject, Injectable } from '@nestjs/common';
import type { PipelineStage } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';

export interface PipelineBoardFilters {
  stage?: PipelineStage | undefined;
  ownerUserId?: string | undefined;
  customerId?: string | undefined;
  search?: string | undefined;
}

export interface PipelineNextAppointment {
  appointmentType: string | null;
  scheduledAt: string;
}

export interface PipelineCard {
  id: string;
  jobNumber: string;
  title: string;
  city: string | null;
  pipelineStage: PipelineStage;
  daysInStage: number;
  ownerUserId: string;
  customerId: string;
  customerName: string;
  nextAppointment: PipelineNextAppointment | null;
  quoteValueCents: number;
  squareFeet: number;
  openIssueCount: number;
}

interface BoardRow {
  id: string;
  job_number: string;
  title: string;
  job_city: string | null;
  pipeline_stage: PipelineStage;
  days_in_stage: string | number | null;
  owner_user_id: string;
  customer_id: string;
  customer_name: string;
  next_appointment_type: string | null;
  next_appointment_at: Date | null;
  quote_value_cents: string | number | null;
  square_feet: string | number | null;
  open_issue_count: string | number | null;
}

const toNumber = (value: string | number | null | undefined): number => Number(value ?? 0);

@Injectable()
export class PipelineService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async getBoard(filters: PipelineBoardFilters): Promise<PipelineCard[]> {
    const values: unknown[] = [];
    const where: string[] = ['p.archived_at IS NULL'];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (filters.stage !== undefined) {
      where.push(`p.pipeline_stage = ${addValue(filters.stage)}`);
    }

    if (filters.ownerUserId !== undefined) {
      where.push(`p.owner_user_id = ${addValue(filters.ownerUserId)}`);
    }

    if (filters.customerId !== undefined) {
      where.push(`p.customer_id = ${addValue(filters.customerId)}`);
    }

    if (filters.search !== undefined) {
      where.push(`p.title ILIKE ${addValue(`%${filters.search}%`)}`);
    }

    const result = await this.pool.query<BoardRow>(
      `
        SELECT
          p.id,
          p.job_number,
          p.title,
          p.job_city,
          p.pipeline_stage,
          EXTRACT(DAY FROM (now() - p.stage_entered_at))::integer AS days_in_stage,
          p.owner_user_id,
          p.customer_id,
          c.name AS customer_name,
          na.appointment_type AS next_appointment_type,
          na.scheduled_at AS next_appointment_at,
          COALESCE(q.value_cents, 0) AS quote_value_cents,
          COALESCE(q.square_feet, 0) AS square_feet,
          COALESCE(iss.open_count, 0) AS open_issue_count
        FROM projects p
        INNER JOIN customers c ON c.id = p.customer_id
        LEFT JOIN LATERAL (
          SELECT se.appointment_type, se.scheduled_at
          FROM scheduled_events se
          WHERE se.project_id = p.id
            AND se.deleted_at IS NULL
            AND se.status IN ('scheduled', 'confirmed')
            AND se.scheduled_at >= now()
          ORDER BY se.scheduled_at ASC, se.id ASC
          LIMIT 1
        ) na ON true
        LEFT JOIN LATERAL (
          SELECT
            sq.subtotal_cents
              + FLOOR((sq.subtotal_cents - sq.discount_cents) * sq.tax_rate_bps / 10000.0)::integer
              - sq.discount_cents AS value_cents,
            sq.square_feet
          FROM (
            SELECT
              q2.discount_cents,
              q2.tax_rate_bps,
              COALESCE(SUM(FLOOR(qli.qty * (qli.unit_price_cents + qli.labor_price_cents))), 0)::integer AS subtotal_cents,
              COALESCE(SUM(qli.qty) FILTER (WHERE lower(qli.qty_unit) IN ('sqft', 'sq_ft', 'sf')), 0)::numeric AS square_feet
            FROM quotes q2
            LEFT JOIN quote_line_items qli ON qli.quote_id = q2.id
            WHERE q2.project_id = p.id
              AND q2.deleted_at IS NULL
            GROUP BY q2.id, q2.discount_cents, q2.tax_rate_bps, q2.status, q2.updated_at
            ORDER BY (q2.status = 'accepted') DESC, q2.updated_at DESC, q2.id DESC
            LIMIT 1
          ) sq
        ) q ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::integer AS open_count
          FROM issues i
          WHERE i.project_id = p.id
            AND i.deleted_at IS NULL
            AND i.status NOT IN ('resolved', 'closed')
        ) iss ON true
        WHERE ${where.join(' AND ')}
        ORDER BY p.stage_entered_at ASC, p.id ASC
      `,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      jobNumber: row.job_number,
      title: row.title,
      city: row.job_city,
      pipelineStage: row.pipeline_stage,
      daysInStage: toNumber(row.days_in_stage),
      ownerUserId: row.owner_user_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      nextAppointment:
        row.next_appointment_at === null
          ? null
          : {
              appointmentType: row.next_appointment_type,
              scheduledAt: row.next_appointment_at.toISOString()
            },
      quoteValueCents: toNumber(row.quote_value_cents),
      squareFeet: toNumber(row.square_feet),
      openIssueCount: toNumber(row.open_issue_count)
    }));
  }
}
