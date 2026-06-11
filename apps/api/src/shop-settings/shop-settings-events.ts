export const buildWorkDaysUpdatedPayload = (shopId: string, actorUserId: string, workDays: number[]) =>
  ({ shopId, actorUserId, workDays });

export const buildHolidayCreatedPayload = (
  holidayId: string, shopId: string, actorUserId: string, holidayDate: string, name: string
) => ({ holidayId, shopId, actorUserId, holidayDate, name });

export const buildHolidayDeletedPayload = (
  holidayId: string, shopId: string, actorUserId: string, holidayDate: string
) => ({ holidayId, shopId, actorUserId, holidayDate });
