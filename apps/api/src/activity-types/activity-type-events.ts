export const buildActivityTypeCreatedPayload = (
  activityTypeId: string,
  shopId: string,
  actorUserId: string,
  name: string
) => ({ activityTypeId, shopId, actorUserId, name });

export const buildActivityTypeUpdatedPayload = (
  activityTypeId: string,
  shopId: string,
  actorUserId: string,
  changedFields: string[]
) => ({ activityTypeId, shopId, actorUserId, changedFields });

export const buildActivityTypeArchivedPayload = (
  activityTypeId: string,
  shopId: string,
  actorUserId: string
) => ({ activityTypeId, shopId, actorUserId });
