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
  created_at: Date;
}

const toInteger = (value: string | number | null | undefined): number => Number(value ?? 0);

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async getStats() {
    const [statsResult, recentQuotesResult] = await Promise.all([
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
          q.created_at
        FROM quotes q
        INNER JOIN customers c ON c.id = q.customer_id
        WHERE q.deleted_at IS NULL
          AND c.deleted_at IS NULL
        ORDER BY q.created_at DESC, q.id DESC
        LIMIT 8
      `)
    ]);

    const stats = statsResult.rows[0];

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
      recentQuotes: recentQuotesResult.rows.map((quote) => ({
        id: quote.id,
        quoteNumber: quote.quote_number,
        title: quote.title,
        status: quote.status,
        customerId: quote.customer_id,
        customerName: quote.customer_name,
        createdAt: quote.created_at.toISOString()
      }))
    };
  }
}
