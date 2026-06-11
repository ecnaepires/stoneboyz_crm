import { Inject, Injectable } from '@nestjs/common';
import type { ShopHoliday } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapHolidayRow, type ShopHolidayRow } from './shop-settings.mapper.js';

@Injectable()
export class ShopSettingsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async patchWorkDays(shopId: string, workDays: number[]): Promise<void> {
    await this.pool.query(
      'UPDATE shops SET work_days = $1, updated_at = now() WHERE id = $2',
      [workDays, shopId]
    );
  }

  async putCounterDepthPresets(shopId: string, presets: number[]): Promise<void> {
    await this.pool.query(
      'UPDATE shops SET counter_depth_presets = $1, updated_at = now() WHERE id = $2',
      [presets, shopId]
    );
  }

  async listHolidays(shopId: string, from?: string, to?: string): Promise<ShopHoliday[]> {
    const today = new Date().toISOString().slice(0, 10);
    const twoYearsOut = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fromDate = from ?? today;
    const toDate = to ?? twoYearsOut;

    const result = await this.pool.query<ShopHolidayRow>(
      `SELECT * FROM shop_holidays
       WHERE shop_id = $1 AND holiday_date >= $2::date AND holiday_date <= $3::date
       ORDER BY holiday_date ASC`,
      [shopId, fromDate, toDate]
    );
    return result.rows.map(mapHolidayRow);
  }

  async listHolidayDates(shopId: string, from: string, to: string): Promise<string[]> {
    const result = await this.pool.query<{ holiday_date: string }>(
      `SELECT holiday_date::text FROM shop_holidays
       WHERE shop_id = $1 AND holiday_date >= $2::date AND holiday_date <= $3::date`,
      [shopId, from, to]
    );
    return result.rows.map((r) =>
      typeof r.holiday_date === 'string' ? r.holiday_date : (r.holiday_date as unknown as Date).toISOString().slice(0, 10)
    );
  }

  async createHoliday(shopId: string, holidayDate: string, name: string): Promise<ShopHoliday> {
    const result = await this.pool.query<ShopHolidayRow>(
      `INSERT INTO shop_holidays (shop_id, holiday_date, name)
       VALUES ($1, $2::date, $3)
       RETURNING *`,
      [shopId, holidayDate, name]
    );
    return mapHolidayRow(result.rows[0] as ShopHolidayRow);
  }

  async deleteHoliday(shopId: string, holidayId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM shop_holidays WHERE id = $1 AND shop_id = $2',
      [holidayId, shopId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findHolidayById(shopId: string, holidayId: string): Promise<ShopHoliday | null> {
    const result = await this.pool.query<ShopHolidayRow>(
      'SELECT * FROM shop_holidays WHERE id = $1 AND shop_id = $2',
      [holidayId, shopId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapHolidayRow(row);
  }
}
