import type { ShopHoliday } from '@stoneboyz/domain';

export interface ShopHolidayRow {
  id: string;
  shop_id: string;
  holiday_date: string; // Postgres returns 'date' columns as a Date object in node-postgres
  name: string;
  created_at: Date;
}

export const mapHolidayRow = (row: ShopHolidayRow): ShopHoliday => ({
  id: row.id,
  shopId: row.shop_id,
  holidayDate: typeof row.holiday_date === 'string'
    ? row.holiday_date
    : (row.holiday_date as unknown as Date).toISOString().slice(0, 10),
  name: row.name,
  createdAt: (row.created_at as Date).toISOString(),
});
