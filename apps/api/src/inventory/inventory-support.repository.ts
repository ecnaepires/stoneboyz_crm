import { Inject, Injectable } from '@nestjs/common';
import type { CreateDamageMarkInput, DamageMark, DamageMarkShape } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';

interface DamageMarkRow {
  id: string;
  slab_id: string;
  photo_id: string | null;
  type: DamageMark['type'];
  severity: DamageMark['severity'];
  shape: DamageMarkShape;
  note: string | null;
  created_by_user_id: string | null;
  created_at: Date;
}

const mapDamageMarkRow = (row: DamageMarkRow): DamageMark => ({
  id: row.id,
  slabId: row.slab_id,
  photoId: row.photo_id,
  type: row.type,
  severity: row.severity,
  shape: row.shape,
  note: row.note,
  createdByUserId: row.created_by_user_id,
  createdAt: row.created_at.toISOString()
});

@Injectable()
export class InventorySupportRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async createDamageMark(slabId: string, input: CreateDamageMarkInput): Promise<DamageMark> {
    const result = await this.pool.query<DamageMarkRow>(
      `
        INSERT INTO damage_marks (slab_id, photo_id, type, severity, shape, note, created_by_user_id)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
        RETURNING *
      `,
      [
        slabId,
        input.photoId ?? null,
        input.type,
        input.severity ?? 'minor',
        JSON.stringify(input.shape),
        input.note ?? null,
        input.actorUserId
      ]
    );

    await this.pool.query(
      `
        UPDATE slabs
        SET condition = CASE WHEN condition = 'good' THEN 'minor_damage' ELSE condition END,
            updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [slabId]
    );

    return mapDamageMarkRow(result.rows[0] as DamageMarkRow);
  }

  async listDamageMarks(slabId: string): Promise<DamageMark[]> {
    const result = await this.pool.query<DamageMarkRow>(
      `
        SELECT *
        FROM damage_marks
        WHERE slab_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [slabId]
    );

    return result.rows.map(mapDamageMarkRow);
  }

  async listMaterialColors(): Promise<Array<{ id: string; name: string }>> {
    const result = await this.pool.query<{ id: string; name: string }>(
      `
        SELECT id, name
        FROM material_colors
        ORDER BY name ASC
      `
    );

    return result.rows;
  }

  async createMaterialColor(name: string): Promise<{ id: string; name: string }> {
    const result = await this.pool.query<{ id: string; name: string }>(
      `
        INSERT INTO material_colors (name)
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET updated_at = now()
        RETURNING id, name
      `,
      [name]
    );

    return result.rows[0] as { id: string; name: string };
  }

  async listStorageLocations(): Promise<Array<{ id: string; zone: string; rack: string; bin: string | null; slot: string | null }>> {
    const result = await this.pool.query<{ id: string; zone: string; rack: string; bin: string | null; slot: string | null }>(
      `
        SELECT id, zone, rack, bin, slot
        FROM storage_locations
        WHERE active = true
        ORDER BY zone ASC, rack ASC, bin ASC NULLS FIRST, slot ASC NULLS FIRST
      `
    );

    return result.rows;
  }

  async createStorageLocation(input: {
    zone: string;
    rack: string;
    bin?: string | undefined;
    slot?: string | undefined;
    notes?: string | undefined;
  }): Promise<{ id: string; zone: string; rack: string; bin: string | null; slot: string | null }> {
    const result = await this.pool.query<{ id: string; zone: string; rack: string; bin: string | null; slot: string | null }>(
      `
        INSERT INTO storage_locations (zone, rack, bin, slot, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, zone, rack, bin, slot
      `,
      [input.zone, input.rack, input.bin ?? null, input.slot ?? null, input.notes ?? null]
    );

    return result.rows[0] as { id: string; zone: string; rack: string; bin: string | null; slot: string | null };
  }

  async listReceipts(): Promise<Array<{ id: string; vendor: string | null; receivedAt: string }>> {
    const result = await this.pool.query<{ id: string; vendor: string | null; received_at: Date }>(
      `
        SELECT id, vendor, received_at
        FROM inventory_receipts
        ORDER BY received_at DESC, id ASC
      `
    );

    return result.rows.map((row) => ({ id: row.id, vendor: row.vendor, receivedAt: row.received_at.toISOString() }));
  }

  async createReceipt(input: { vendor?: string | undefined; notes?: string | undefined; actorUserId: string }): Promise<{ id: string; vendor: string | null; receivedAt: string }> {
    const result = await this.pool.query<{ id: string; vendor: string | null; received_at: Date }>(
      `
        INSERT INTO inventory_receipts (vendor, notes, created_by_user_id)
        VALUES ($1, $2, $3)
        RETURNING id, vendor, received_at
      `,
      [input.vendor ?? null, input.notes ?? null, input.actorUserId]
    );

    const row = result.rows[0] as { id: string; vendor: string | null; received_at: Date };
    return { id: row.id, vendor: row.vendor, receivedAt: row.received_at.toISOString() };
  }
}
