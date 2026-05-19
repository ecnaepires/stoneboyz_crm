import type { QuoteAreaEventData, QuoteAreaUpdatedData } from '../events/event-types.js';

export const buildQuoteAreaPayload = (
  customerId: string,
  quoteId: string,
  areaId: string,
  actorUserId: string
): QuoteAreaEventData => ({
  customerId,
  quoteId,
  areaId,
  actorUserId
});

export const buildQuoteAreaUpdatedPayload = (
  customerId: string,
  quoteId: string,
  areaId: string,
  actorUserId: string,
  changedFields: string[]
): QuoteAreaUpdatedData => ({
  customerId,
  quoteId,
  areaId,
  actorUserId,
  changedFields
});
