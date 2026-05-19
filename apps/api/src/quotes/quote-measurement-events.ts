import type { QuoteMeasurementEventData, QuoteMeasurementUpdatedData } from '../events/event-types.js';

export const buildQuoteMeasurementPayload = (
  customerId: string,
  quoteId: string,
  areaId: string,
  measurementId: string,
  actorUserId: string
): QuoteMeasurementEventData => ({
  customerId,
  quoteId,
  areaId,
  measurementId,
  actorUserId
});

export const buildQuoteMeasurementUpdatedPayload = (
  customerId: string,
  quoteId: string,
  areaId: string,
  measurementId: string,
  actorUserId: string,
  changedFields: string[]
): QuoteMeasurementUpdatedData => ({
  customerId,
  quoteId,
  areaId,
  measurementId,
  actorUserId,
  changedFields
});
