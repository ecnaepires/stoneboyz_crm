import type { OrderEventData, OrderPaymentEventData } from '../events/event-types.js';

export const buildOrderPayload = (customerId: string, orderId: string, actorUserId: string): OrderEventData => ({
  customerId,
  orderId,
  actorUserId
});

export const buildOrderPaymentPayload = (
  customerId: string,
  orderId: string,
  paymentId: string,
  actorUserId: string
): OrderPaymentEventData => ({
  customerId,
  orderId,
  paymentId,
  actorUserId
});
