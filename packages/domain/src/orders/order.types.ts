export const ORDER_PAYMENT_METHOD_VALUES = [
  'cash',
  'check',
  'mastercard',
  'visa',
  'american_express',
  'discover',
  'bank_transfer',
  'echeck'
] as const;

export type OrderPaymentMethod = typeof ORDER_PAYMENT_METHOD_VALUES[number];

export const ORDER_PAYMENT_STATUS_VALUES = ['unpaid', 'partially_paid', 'paid'] as const;

export type OrderPaymentStatus = typeof ORDER_PAYMENT_STATUS_VALUES[number];

export const ORDER_DEPOSIT_STATUS_VALUES = ['not_requested', 'requested', 'paid'] as const;

export type OrderDepositStatus = typeof ORDER_DEPOSIT_STATUS_VALUES[number];

export const ORDER_PAYMENT_RECORD_STATUS_VALUES = ['recorded', 'void'] as const;

export type OrderPaymentRecordStatus = typeof ORDER_PAYMENT_RECORD_STATUS_VALUES[number];

export interface OrderPayment {
  id: string;
  orderId: string;
  paymentDate: string;
  amountCents: number;
  paymentMethod: OrderPaymentMethod;
  status: OrderPaymentRecordStatus;
  referenceNumber: string | null;
  notes: string | null;
  voidedAt: string | null;
  voidedByUserId: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderArea {
  id: string;
  orderId: string;
  sortOrder: number;
  name: string;
  material: string | null;
  color: string | null;
  edgeProfile: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLineItem {
  id: string;
  orderId: string;
  quoteAreaId: string | null;
  slabId: string | null;
  sortOrder: number;
  stoneType: string;
  lengthIn: number | null;
  widthIn: number | null;
  thicknessCm: number | null;
  edgeProfile: string | null;
  qty: number;
  qtyUnit: string;
  unitPriceCents: number;
  laborPriceCents: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  quoteId: string;
  customerId: string;
  orderNumber: string;
  title: string;
  saleDate: string;
  subtotalCents: number;
  discountCents: number;
  taxRateBps: number;
  totalCents: number;
  totalPaidCents: number;
  balanceDueCents: number;
  paymentStatus: OrderPaymentStatus;
  depositRequiredCents: number;
  depositPaidCents: number;
  depositBalanceCents: number;
  depositStatus: OrderDepositStatus;
  depositRequestedAt: string | null;
  depositRequestedByUserId: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  areas?: OrderArea[] | undefined;
  lineItems?: OrderLineItem[] | undefined;
}

export interface OrderWithPayments extends Order {
  payments: OrderPayment[];
}

export interface ConvertQuoteToOrderInput {
  actorUserId: string;
  saleDate: string;
}

export interface AddOrderPaymentInput {
  actorUserId: string;
  paymentDate: string;
  amountCents: number;
  paymentMethod: OrderPaymentMethod;
  referenceNumber?: string | undefined;
  notes?: string | undefined;
}

export interface VoidOrderPaymentInput {
  actorUserId: string;
  voidReason?: string | undefined;
}

export interface RequestOrderDepositInput {
  actorUserId: string;
  depositRequiredCents: number;
}

export interface ListOrdersInput {
  cursor?: string | undefined;
  limit?: number | undefined;
  paymentStatus?: OrderPaymentStatus | undefined;
  includeArchived?: boolean | undefined;
}
