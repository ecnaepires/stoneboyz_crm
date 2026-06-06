import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';

interface DashboardStatsRow {
  active_customers: string | number | null;
  open_quote_count: string | number | null;
  open_quote_total_cents: string | number | null;
  orders_this_month_count: string | number | null;
  orders_this_month_total_cents: string | number | null;
  events_this_week: string | number | null;
}

interface RecentQuoteRow {
  id: string;
  quote_number: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'archived';
  customer_id: string;
  customer_name: string;
  value_cents: string | number | null;
  created_at: Date;
}

interface PipelineRow {
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  count: string | number | null;
}

interface RevenuePointRow {
  month: Date;
  quotes_cents: string | number | null;
  orders_cents: string | number | null;
}

const toInteger = (value: string | number | null | undefined): number => Number(value ?? 0);

// Per-quote value: line-item subtotal + tax − discount. Mirrors the open-quote
// total used for the headline stat, computed against a `quote_line_items` subtotal.
const QUOTE_SUBTOTAL_SUBQUERY = `
  SELECT
    qli.quote_id,
    COALESCE(SUM(FLOOR(qli.qty * (qli.unit_price_cents + qli.labor_price_cents))), 0)::integer AS subtotal_cents
  FROM quote_line_items qli
  GROUP BY qli.quote_id
`;

const QUOTE_VALUE_EXPRESSION = `
  COALESCE(quote_totals.subtotal_cents, 0)
  + FLOOR(
    (COALESCE(quote_totals.subtotal_cents, 0) - q.discount_cents) * q.tax_rate_bps / 10000.0
  )::integer
  - q.discount_cents
`;

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async getStats() {
    const [statsResult, recentQuotesResult, pipelineResult, revenueResult] = await Promise.all([
      this.pool.query<DashboardStatsRow>(`
        SELECT
          (
            SELECT COUNT(*)::integer
            FROM customers c
            WHERE c.deleted_at IS NULL
              AND c.status = 'active'
          ) AS active_customers,
          (
            SELECT COUNT(*)::integer
            FROM quotes q
            WHERE q.deleted_at IS NULL
              AND q.status IN ('draft', 'sent')
          ) AS open_quote_count,
          (
            SELECT COALESCE(
              SUM(
                COALESCE(quote_totals.subtotal_cents, 0)
                + FLOOR(
                  (COALESCE(quote_totals.subtotal_cents, 0) - q.discount_cents) * q.tax_rate_bps / 10000.0
                )::integer
                - q.discount_cents
              ),
              0
            )::integer
            FROM quotes q
            LEFT JOIN (
              SELECT
                qli.quote_id,
                COALESCE(SUM(FLOOR(qli.qty * (qli.unit_price_cents + qli.labor_price_cents))), 0)::integer AS subtotal_cents
              FROM quote_line_items qli
              GROUP BY qli.quote_id
            ) quote_totals ON quote_totals.quote_id = q.id
            WHERE q.deleted_at IS NULL
              AND q.status IN ('draft', 'sent')
          ) AS open_quote_total_cents,
          (
            SELECT COUNT(*)::integer
            FROM orders o
            WHERE o.deleted_at IS NULL
              AND o.sale_date >= date_trunc('month', CURRENT_DATE)
              AND o.sale_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
          ) AS orders_this_month_count,
          (
            SELECT COALESCE(SUM(o.total_cents), 0)::integer
            FROM orders o
            WHERE o.deleted_at IS NULL
              AND o.sale_date >= date_trunc('month', CURRENT_DATE)
              AND o.sale_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
          ) AS orders_this_month_total_cents,
          (
            SELECT COUNT(*)::integer
            FROM scheduled_events se
            WHERE se.deleted_at IS NULL
              AND se.status NOT IN ('cancelled', 'archived')
              AND se.scheduled_at >= NOW()
              AND se.scheduled_at < NOW() + INTERVAL '7 days'
          ) AS events_this_week
      `),
      this.pool.query<RecentQuoteRow>(`
        SELECT
          q.id,
          q.quote_number,
          q.title,
          q.status,
          q.customer_id,
          c.name AS customer_name,
          (${QUOTE_VALUE_EXPRESSION})::integer AS value_cents,
          q.created_at
        FROM quotes q
        INNER JOIN customers c ON c.id = q.customer_id
        LEFT JOIN (${QUOTE_SUBTOTAL_SUBQUERY}) quote_totals ON quote_totals.quote_id = q.id
        WHERE q.deleted_at IS NULL
          AND c.deleted_at IS NULL
        ORDER BY q.created_at DESC, q.id DESC
        LIMIT 8
      `),
      this.pool.query<PipelineRow>(`
        SELECT q.status, COUNT(*)::integer AS count
        FROM quotes q
        WHERE q.deleted_at IS NULL
          AND q.status IN ('draft', 'sent', 'accepted', 'rejected')
        GROUP BY q.status
      `),
      this.pool.query<RevenuePointRow>(`
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
            date_trunc('month', CURRENT_DATE),
            INTERVAL '1 month'
          )::date AS month
        ),
        quote_revenue AS (
          SELECT
            date_trunc('month', q.created_at)::date AS month,
            COALESCE(SUM(${QUOTE_VALUE_EXPRESSION}), 0)::bigint AS cents
          FROM quotes q
          LEFT JOIN (${QUOTE_SUBTOTAL_SUBQUERY}) quote_totals ON quote_totals.quote_id = q.id
          WHERE q.deleted_at IS NULL
          GROUP BY 1
        ),
        order_revenue AS (
          SELECT
            date_trunc('month', o.sale_date)::date AS month,
            COALESCE(SUM(o.total_cents), 0)::bigint AS cents
          FROM orders o
          WHERE o.deleted_at IS NULL
          GROUP BY 1
        )
        SELECT
          m.month,
          COALESCE(qr.cents, 0)::bigint AS quotes_cents,
          COALESCE(orr.cents, 0)::bigint AS orders_cents
        FROM months m
        LEFT JOIN quote_revenue qr ON qr.month = m.month
        LEFT JOIN order_revenue orr ON orr.month = m.month
        ORDER BY m.month ASC
      `)
    ]);

    const stats = statsResult.rows[0];

    const pipeline = { draft: 0, sent: 0, accepted: 0, rejected: 0 };
    for (const row of pipelineResult.rows) {
      pipeline[row.status] = toInteger(row.count);
    }

    return {
      activeCustomers: toInteger(stats?.active_customers),
      openQuotes: {
        count: toInteger(stats?.open_quote_count),
        totalCents: toInteger(stats?.open_quote_total_cents)
      },
      ordersThisMonth: {
        count: toInteger(stats?.orders_this_month_count),
        totalCents: toInteger(stats?.orders_this_month_total_cents)
      },
      eventsThisWeek: toInteger(stats?.events_this_week),
      pipeline,
      revenueSeries: revenueResult.rows.map((point) => ({
        month: point.month.toISOString().slice(0, 10),
        quotesCents: toInteger(point.quotes_cents),
        ordersCents: toInteger(point.orders_cents)
      })),
      recentQuotes: recentQuotesResult.rows.map((quote) => ({
        id: quote.id,
        quoteNumber: quote.quote_number,
        title: quote.title,
        status: quote.status,
        customerId: quote.customer_id,
        customerName: quote.customer_name,
        valueCents: toInteger(quote.value_cents),
        createdAt: quote.created_at.toISOString()
      }))
    };
  }
}
