import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';

@Injectable()
export class PortalService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async getQuoteByToken(token: string) {
    const { rows: quoteRows } = await this.pool.query<{
      id: string;
      quote_number: string;
      title: string;
      status: string;
      customer_id: string;
      customer_name: string;
      valid_until: string | null;
      notes: string | null;
      terms_and_conditions: string | null;
      discount_cents: string;
      subtotal_cents: string;
      tax_rate_bps: string;
      share_token: string;
    }>(
      `SELECT q.id, q.quote_number, q.title, q.status, q.customer_id,
              c.name AS customer_name, q.valid_until, q.notes, q.terms_and_conditions,
              q.discount_cents, q.tax_rate_bps, q.share_token,
              COALESCE(SUM(FLOOR(qli.qty * (qli.unit_price_cents + qli.labor_price_cents))), 0)::integer AS subtotal_cents
       FROM quotes q
       JOIN customers c ON c.id = q.customer_id
       LEFT JOIN quote_line_items qli ON qli.quote_id = q.id
       WHERE q.share_token = $1 AND q.deleted_at IS NULL
       GROUP BY q.id, c.name`,
      [token]
    );

    if (quoteRows.length === 0) throw new NotFoundException('Quote not found');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const q = quoteRows[0]!;

    const { rows: areas } = await this.pool.query<{ id: string; name: string; sort_order: number }>(
      `SELECT id, name, sort_order FROM quote_areas WHERE quote_id = $1 ORDER BY sort_order`,
      [q.id]
    );

    const { rows: items } = await this.pool.query<{
      id: string;
      stone_type: string;
      qty: string;
      qty_unit: string;
      unit_price_cents: number;
      labor_price_cents: number;
      length_in: number | null;
      width_in: number | null;
      thickness_cm: number | null;
      edge_profile: string | null;
      notes: string | null;
      sort_order: number;
      quote_area_id: string | null;
    }>(
      `SELECT id, stone_type, qty, qty_unit, unit_price_cents, labor_price_cents,
              length_in, width_in, thickness_cm, edge_profile, notes, sort_order, quote_area_id
       FROM quote_line_items WHERE quote_id = $1 ORDER BY sort_order`,
      [q.id]
    );

    const subtotalCents = Number(q.subtotal_cents);
    const discountCents = Number(q.discount_cents);
    const taxRateBps = Number(q.tax_rate_bps);
    const taxCents = Math.floor((subtotalCents - discountCents) * (taxRateBps / 10000));

    return {
      id: q.id,
      quoteNumber: q.quote_number,
      title: q.title,
      status: q.status,
      customerId: q.customer_id,
      customerName: q.customer_name,
      validUntil: q.valid_until,
      notes: q.notes,
      termsAndConditions: q.terms_and_conditions,
      discountCents,
      taxCents,
      subtotalCents,
      taxRateBps,
      shareToken: q.share_token,
      areas: areas.map((a) => ({ id: a.id, name: a.name, sortOrder: a.sort_order })),
      lineItems: items.map((i) => ({
        id: i.id,
        stoneType: i.stone_type,
        qty: Number(i.qty),
        qtyUnit: i.qty_unit,
        unitPriceCents: Number(i.unit_price_cents),
        laborPriceCents: Number(i.labor_price_cents),
        lengthIn: i.length_in != null ? Number(i.length_in) : null,
        widthIn: i.width_in != null ? Number(i.width_in) : null,
        thicknessCm: i.thickness_cm != null ? Number(i.thickness_cm) : null,
        edgeProfile: i.edge_profile,
        notes: i.notes,
        sortOrder: i.sort_order,
        quoteAreaId: i.quote_area_id,
      })),
    };
  }

  async acceptByToken(token: string): Promise<{ ok: boolean }> {
    const { rows } = await this.pool.query<{ status: string }>(
      `SELECT status FROM quotes WHERE share_token = $1 AND deleted_at IS NULL`,
      [token]
    );
    if (rows.length === 0) throw new NotFoundException('Quote not found');
    if (rows[0]!.status !== 'sent') throw new NotFoundException('Quote cannot be accepted in its current status');
    await this.pool.query(
      `UPDATE quotes SET status = 'accepted', accepted_at = now(), updated_at = now() WHERE share_token = $1`,
      [token]
    );
    return { ok: true };
  }

  async rejectByToken(token: string): Promise<{ ok: boolean }> {
    const { rows } = await this.pool.query<{ status: string }>(
      `SELECT status FROM quotes WHERE share_token = $1 AND deleted_at IS NULL`,
      [token]
    );
    if (rows.length === 0) throw new NotFoundException('Quote not found');
    if (rows[0]!.status !== 'sent') throw new NotFoundException('Quote cannot be rejected in its current status');
    await this.pool.query(
      `UPDATE quotes SET status = 'rejected', rejected_at = now(), updated_at = now() WHERE share_token = $1`,
      [token]
    );
    return { ok: true };
  }
}
