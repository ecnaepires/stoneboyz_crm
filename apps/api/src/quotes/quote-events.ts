import type {
  QuoteEventData,
  QuoteLineItemEventData,
  QuoteLineItemUpdatedData,
  QuoteUpdatedData
} from '../events/event-types.js';

export const buildQuoteCreatedPayload = (
  customerId: string,
  quoteId: string,
  actorUserId: string
): QuoteEventData => ({
  customerId,
  quoteId,
  actorUserId
});

export const buildQuoteUpdatedPayload = (
  customerId: string,
  quoteId: string,
  actorUserId: string,
  changedFields: string[]
): QuoteUpdatedData => ({
  customerId,
  quoteId,
  actorUserId,
  changedFields
});

export const buildQuoteTransitionPayload = (
  customerId: string,
  quoteId: string,
  actorUserId: string
): QuoteEventData => ({
  customerId,
  quoteId,
  actorUserId
});

export const buildQuoteLineItemPayload = (
  customerId: string,
  quoteId: string,
  lineItemId: string,
  actorUserId: string
): QuoteLineItemEventData => ({
  customerId,
  quoteId,
  lineItemId,
  actorUserId
});

export const buildQuoteLineItemUpdatedPayload = (
  customerId: string,
  quoteId: string,
  lineItemId: string,
  actorUserId: string,
  changedFields: string[]
): QuoteLineItemUpdatedData => ({
  customerId,
  quoteId,
  lineItemId,
  actorUserId,
  changedFields
});
