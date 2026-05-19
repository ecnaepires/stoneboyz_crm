export const buildPriceListPayload = (priceListId: string, actorUserId: string) => ({
  priceListId,
  actorUserId
});

export const buildPriceListUpdatedPayload = (priceListId: string, actorUserId: string, changedFields: string[]) => ({
  priceListId,
  actorUserId,
  changedFields
});

export const buildPriceListItemPayload = (priceListId: string, itemId: string, actorUserId: string) => ({
  priceListId,
  itemId,
  actorUserId
});

export const buildPriceListItemUpdatedPayload = (
  priceListId: string,
  itemId: string,
  actorUserId: string,
  changedFields: string[]
) => ({
  priceListId,
  itemId,
  actorUserId,
  changedFields
});
