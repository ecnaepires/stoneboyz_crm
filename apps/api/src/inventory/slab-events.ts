import type { SlabCutData, SlabEventData, SlabReservedData, SlabUpdatedData } from '../events/event-types.js';

export const buildSlabEventPayload = (slabId: string, actorUserId: string): SlabEventData => ({
  slabId,
  actorUserId
});

export const buildSlabUpdatedPayload = (
  slabId: string,
  actorUserId: string,
  changedFields: string[]
): SlabUpdatedData => ({
  slabId,
  actorUserId,
  changedFields
});

export const buildSlabReservedPayload = (
  slabId: string,
  actorUserId: string,
  quoteId?: string,
  projectId?: string
): SlabReservedData => ({
  slabId,
  actorUserId,
  ...(quoteId !== undefined ? { quoteId } : {}),
  ...(projectId !== undefined ? { projectId } : {})
});

export const buildSlabCutPayload = (slabId: string, actorUserId: string, remnantSlabIds: string[]): SlabCutData => ({
  slabId,
  actorUserId,
  remnantSlabIds
});

