export interface ShopCalendar {
  workDays: number[];   // distinct integers 0–6 (Sun=0 … Sat=6), non-empty
  holidays: string[];   // ISO dates 'YYYY-MM-DD'
}

export interface ShopHoliday {
  id: string;
  shopId: string;
  holidayDate: string;  // 'YYYY-MM-DD'
  name: string;
  createdAt: string;
}
