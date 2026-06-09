import { z } from 'zod';
import {
  ORDER_DEPOSIT_STATUS_VALUES,
  ORDER_PAYMENT_METHOD_VALUES,
  ORDER_PAYMENT_RECORD_STATUS_VALUES,
  ORDER_PAYMENT_STATUS_VALUES
} from './order.types.js';

export const orderPaymentMethodSchema = z.enum(ORDER_PAYMENT_METHOD_VALUES);
export const orderPaymentStatusSchema = z.enum(ORDER_PAYMENT_STATUS_VALUES);
export const orderDepositStatusSchema = z.enum(ORDER_DEPOSIT_STATUS_VALUES);
export const orderPaymentRecordStatusSchema = z.enum(ORDER_PAYMENT_RECORD_STATUS_VALUES);

export const convertQuoteToOrderSchema = z.object({
  saleDate: z.string().date()
});

export const addOrderPaymentSchema = z.object({
  paymentDate: z.string().date(),
  amountCents: z.number().int().positive(),
  paymentMethod: orderPaymentMethodSchema,
  referenceNumber: z.string().min(1).optional(),
  notes: z.string().min(1).optional()
});

export const voidOrderPaymentSchema = z.object({
  voidReason: z.string().min(1).optional()
});

export const archiveOrderSchema = z.object({});

export const requestOrderDepositSchema = z.object({
  depositRequiredCents: z.number().int().positive()
});

export const listOrdersSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  paymentStatus: orderPaymentStatusSchema.optional(),
  includeArchived: z.boolean().default(false)
});
