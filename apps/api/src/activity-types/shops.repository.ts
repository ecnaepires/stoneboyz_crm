import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Shop } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapShopRow, type ShopRow } from './activity-type.mapper.js';

@Injectable()
export class ShopsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async currentShop(): Promise<Shop> {
    const result = await this.pool.query<ShopRow>(
      `
        SELECT *
        FROM shops
        WHERE slug = 'stone-boyz'
        LIMIT 1
      `
    );

    const row = result.rows[0];
    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Shop not found' });
    }

    return mapShopRow(row);
  }
}
