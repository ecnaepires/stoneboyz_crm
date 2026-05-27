import type { Order, OrderArea, OrderLineItem, OrderPayment, OrderPaymentMethod, OrderPaymentStatus } from '@stoneboyz/domain';

export interface OrderRow {
  id: string;
  quote_id: string;
  customer_id: string;
  order_number: string;
  title: string;
  sale_date: Date | string;
  subtotal_cents: number;
  discount_cents: number;
  tax_rate_bps: number;
  total_cents: number;
  total_paid_cents: number | string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderPaymentRow {
  id: string;
  order_id: string;
  payment_date: Date | string;
  amount_cents: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderAreaRow {
  id: string;
  order_id: string;
  sort_order: number;
  name: string;
  material: string | null;
  color: string | null;
  edge_profile: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderLineItemRow {
  id: string;
  order_id: string;
  quote_area_id: string | null;
  slab_id: string | null;
  sort_order: number;
  stone_type: string;
  length_in: number | null;
  width_in: number | null;
  thickness_cm: number | null;
  edge_profile: string | null;
  qty: string | number;
  qty_unit: string;
  unit_price_cents: number;
  labor_price_cents: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

const toDateString = (value: Date | string): string =>
  typeof value === 'string' ? value : value.toISOString().slice(0, 10);

const computePaymentStatus = (totalPaidCents: number, totalCents: number): OrderPaymentStatus => {
  if (totalCents > 0 && totalPaidCents >= totalCents) return 'paid';
  if (totalPaidCents > 0) return 'partially_paid';
  return 'unpaid';
};

export const mapOrderRow = (row: OrderRow): Order => {
  const totalPaidCents = Number(row.total_paid_cents ?? 0);
  const totalCents = row.total_cents;

  return {
    id: row.id,
    quoteId: row.quote_id,
    customerId: row.customer_id,
    orderNumber: row.order_number,
    title: row.title,
    saleDate: toDateString(row.sale_date),
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    taxRateBps: row.tax_rate_bps,
    totalCents,
    totalPaidCents,
    balanceDueCents: Math.max(0, totalCents - totalPaidCents),
    paymentStatus: computePaymentStatus(totalPaidCents, totalCents),
    notes: row.notes,
    termsAndConditions: row.terms_and_conditions,
    archivedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
    archivedByUserId: row.deleted_by_user_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
};

export const mapOrderPaymentRow = (row: OrderPaymentRow): OrderPayment => ({
  id: row.id,
  orderId: row.order_id,
  paymentDate: toDateString(row.payment_date),
  amountCents: row.amount_cents,
  paymentMethod: row.payment_method as OrderPaymentMethod,
  referenceNumber: row.reference_number,
  notes: row.notes,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

export const mapOrderAreaRow = (row: OrderAreaRow): OrderArea => ({
  id: row.id,
  orderId: row.order_id,
  sortOrder: row.sort_order,
  name: row.name,
  material: row.material,
  color: row.color,
  edgeProfile: row.edge_profile,
  notes: row.notes,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

export const mapOrderLineItemRow = (row: OrderLineItemRow): OrderLineItem => ({
  id: row.id,
  orderId: row.order_id,
  quoteAreaId: row.quote_area_id,
  slabId: row.slab_id,
  sortOrder: row.sort_order,
  stoneType: row.stone_type,
  lengthIn: row.length_in,
  widthIn: row.width_in,
  thicknessCm: row.thickness_cm,
  edgeProfile: row.edge_profile,
  qty: Number(row.qty),
  qtyUnit: row.qty_unit,
  unitPriceCents: row.unit_price_cents,
  laborPriceCents: row.labor_price_cents,
  notes: row.notes,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
