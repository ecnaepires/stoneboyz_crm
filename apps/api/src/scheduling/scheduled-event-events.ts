import type {
  ScheduledEventEventData,
  ScheduledEventRescheduledData,
  ScheduledEventUpdatedData
} from '../events/event-types.js';

export const buildScheduledEventCreatedPayload = (
  customerId: string,
  scheduledEventId: string,
  actorUserId: string
): ScheduledEventEventData => ({
  customerId,
  scheduledEventId,
  actorUserId
});

export const buildScheduledEventUpdatedPayload = (
  customerId: string,
  scheduledEventId: string,
  actorUserId: string,
  changedFields: string[]
): ScheduledEventUpdatedData => ({
  customerId,
  scheduledEventId,
  actorUserId,
  changedFields
});

export const buildScheduledEventTransitionPayload = (
  customerId: string,
  scheduledEventId: string,
  actorUserId: string
): ScheduledEventEventData => ({
  customerId,
  scheduledEventId,
  actorUserId
});

export const buildScheduledEventRescheduledPayload = (
  customerId: string,
  scheduledEventId: string,
  actorUserId: string,
  previousScheduledAt: string,
  newScheduledAt: string
): ScheduledEventRescheduledData => ({
  customerId,
  scheduledEventId,
  actorUserId,
  previousScheduledAt,
  newScheduledAt
});

export const buildScheduledEventArchivedPayload = (
  customerId: string,
  scheduledEventId: string,
  actorUserId: string
): ScheduledEventEventData => ({
  customerId,
  scheduledEventId,
  actorUserId
});
