import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';

// Read-only operational reports. Definitions mirror the dashboard and the API
// totals so a number never disagrees between two screens (see
// docs/specs/modules/reports.md). Square footage comes from the persisted
// `material` price-line quantity — never re-derived from a drawing at request time.

export interface SalesByMonthRow {
  month: string; // YYYY-MM-DD (first of month)
  totalCents: number;
  orderCount: number;
}

export interface JobsBySalespersonRow {
  userId: string;
  name: string;
  jobCount: number;
}

export interface InstalledSqFtRow {
  month?: string; // by-month variant
  week?: string; // by-week variant
  installedSqFt: number;
}

// Sum of material square footage per project, from non-archived quotes. One
// material line per area (unique on quote_area + category), so areas never double.
const PROJECT_MATERIAL_SQFT = `
  SELECT q.project_id, COALESCE(SUM(gpl.quantity), 0) AS sqft
  FROM quotes q
  JOIN quote_areas qa ON qa.quote_id = q.id
  JOIN generated_price_lines gpl
    ON gpl.quote_area_id = qa.id AND gpl.category = 'material'
  WHERE q.deleted_at IS NULL AND q.project_id IS NOT NULL
  GROUP BY q.project_id
`;

@Injectable()
export class ReportsService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async salesByMonth(from?: string, to?: string): Promise<SalesByMonthRow[]> {
    const result = await this.pool.query<{
      month: string;
      total_cents: string;
      order_count: number;
    }>(
      `
      SELECT to_char(date_trunc('month', o.sale_date), 'YYYY-MM-DD') AS month,
             COALESCE(SUM(o.total_cents), 0)::bigint AS total_cents,
             COUNT(*)::int AS order_count
      FROM orders o
      WHERE o.deleted_at IS NULL
        AND o.sale_date >= COALESCE($1::date, CURRENT_DATE - INTERVAL '12 months')
        AND ($2::date IS NULL OR o.sale_date <= $2::date)
      GROUP BY date_trunc('month', o.sale_date)
      ORDER BY date_trunc('month', o.sale_date) ASC
      `,
      [from ?? null, to ?? null],
    );
    return result.rows.map((r) => ({
      month: r.month,
      totalCents: Number(r.total_cents),
      orderCount: Number(r.order_count),
    }));
  }

  async jobsBySalesperson(): Promise<JobsBySalespersonRow[]> {
    const result = await this.pool.query<{
      user_id: string;
      name: string;
      job_count: number;
    }>(
      `
      SELECT u.id AS user_id, u.name, COUNT(p.id)::int AS job_count
      FROM projects p
      JOIN "user" u ON u.id = p.owner_user_id
      WHERE p.archived_at IS NULL
      GROUP BY u.id, u.name
      ORDER BY job_count DESC, u.name ASC
      `,
    );
    return result.rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      jobCount: Number(r.job_count),
    }));
  }

  async installedSqFtByMonth(from?: string, to?: string): Promise<InstalledSqFtRow[]> {
    const rows = await this.installedSqFt('month', from, to);
    return rows.map((r) => ({ month: r.bucket, installedSqFt: r.installed_sqft }));
  }

  async installedSqFtByWeek(from?: string, to?: string): Promise<InstalledSqFtRow[]> {
    const rows = await this.installedSqFt('week', from, to);
    return rows.map((r) => ({ week: r.bucket, installedSqFt: r.installed_sqft }));
  }

  // Shared install-sqft query. `grain` is a trusted literal ('month' | 'week'),
  // never user input, so it is safe to interpolate into date_trunc.
  private async installedSqFt(
    grain: 'month' | 'week',
    from?: string,
    to?: string,
  ): Promise<Array<{ bucket: string; installed_sqft: number }>> {
    const result = await this.pool.query<{ bucket: string; installed_sqft: string }>(
      `
      WITH project_material AS (${PROJECT_MATERIAL_SQFT}),
      install_buckets AS (
        SELECT DISTINCT se.project_id,
               date_trunc('${grain}', se.scheduled_at) AS bucket
        FROM scheduled_events se
        WHERE se.deleted_at IS NULL
          AND se.appointment_type = 'install'
          AND se.project_id IS NOT NULL
          AND se.scheduled_at >= COALESCE($1::date, CURRENT_DATE - INTERVAL '12 months')
          AND ($2::date IS NULL OR se.scheduled_at <= $2::date)
      )
      SELECT to_char(ib.bucket, 'YYYY-MM-DD') AS bucket,
             COALESCE(SUM(pm.sqft), 0)::float AS installed_sqft
      FROM install_buckets ib
      JOIN project_material pm ON pm.project_id = ib.project_id
      GROUP BY ib.bucket
      ORDER BY ib.bucket ASC
      `,
      [from ?? null, to ?? null],
    );
    return result.rows.map((r) => ({
      bucket: r.bucket,
      installed_sqft: Number(r.installed_sqft),
    }));
  }
}
