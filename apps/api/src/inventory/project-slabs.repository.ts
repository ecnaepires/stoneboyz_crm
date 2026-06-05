import { Inject, Injectable } from '@nestjs/common';
import type { AttachProjectSlabInput, ProjectSlab, Slab } from '@stoneboyz/domain';
import type { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapProjectSlabRow, mapSlabRow, type ProjectSlabRow } from './slab.mapper.js';

interface ProjectSlabJoinedRow extends ProjectSlabRow {
  slab_row_id: string;
  parent_slab_id: string | null;
  owner_customer_id: string | null;
  material_color_id: string | null;
  storage_location_id: string | null;
  inventory_receipt_id: string | null;
  tag_code: string | null;
  kind: Slab['kind'];
  availability: Slab['availability'];
  ownership: Slab['ownership'];
  condition: Slab['condition'];
  hold_reason: string | null;
  stone_type: string;
  finish: Slab['finish'];
  quality_grade: Slab['qualityGrade'];
  length_in: number;
  width_in: number;
  thickness_cm: number;
  lot_number: string | null;
  bundle_number: string | null;
  warehouse_location: string | null;
  cost_cents: number;
  image_urls: string[];
  slab_notes: string | null;
  status: Slab['status'];
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  slab_created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ProjectSlabsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async projectExists(customerId: string, projectId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM projects
          WHERE id = $1 AND customer_id = $2 AND archived_at IS NULL
        ) AS "exists"
      `,
      [projectId, customerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async list(projectId: string): Promise<{ projectSlabs: ProjectSlab[]; slabs: Slab[] }> {
    const result = await this.pool.query<ProjectSlabJoinedRow>(
      `
        SELECT
          ps.id,
          ps.project_id,
          ps.slab_id,
          ps.consumed_by_user_id,
          ps.consumed_at,
          ps.notes,
          ps.created_at,
          s.id AS slab_row_id,
          s.parent_slab_id,
          s.owner_customer_id,
          s.material_color_id,
          s.storage_location_id,
          s.inventory_receipt_id,
          s.tag_code,
          s.kind,
          s.availability,
          s.ownership,
          s.condition,
          s.hold_reason,
          s.stone_type,
          s.finish,
          s.quality_grade,
          s.length_in,
          s.width_in,
          s.thickness_cm,
          s.lot_number,
          s.bundle_number,
          s.warehouse_location,
          s.cost_cents,
          s.image_urls,
          s.notes AS slab_notes,
          s.status,
          s.deleted_at,
          s.deleted_by_user_id,
          s.created_at AS slab_created_at,
          s.updated_at
        FROM project_slabs ps
        JOIN slabs s ON s.id = ps.slab_id
        WHERE ps.project_id = $1 AND s.deleted_at IS NULL
        ORDER BY ps.created_at ASC, ps.id ASC
      `,
      [projectId]
    );

    return {
      projectSlabs: result.rows.map((row) => mapProjectSlabRow(row)),
      slabs: result.rows.map((row) =>
        mapSlabRow({
          id: row.slab_row_id,
          parent_slab_id: row.parent_slab_id,
          owner_customer_id: row.owner_customer_id,
          material_color_id: row.material_color_id,
          storage_location_id: row.storage_location_id,
          inventory_receipt_id: row.inventory_receipt_id,
          tag_code: row.tag_code,
          kind: row.kind,
          availability: row.availability,
          ownership: row.ownership,
          condition: row.condition,
          hold_reason: row.hold_reason,
          stone_type: row.stone_type,
          finish: row.finish,
          quality_grade: row.quality_grade,
          length_in: row.length_in,
          width_in: row.width_in,
          thickness_cm: row.thickness_cm,
          lot_number: row.lot_number,
          bundle_number: row.bundle_number,
          warehouse_location: row.warehouse_location,
          cost_cents: row.cost_cents,
          image_urls: row.image_urls,
          notes: row.slab_notes,
          status: row.status,
          deleted_at: row.deleted_at,
          deleted_by_user_id: row.deleted_by_user_id,
          created_at: row.slab_created_at,
          updated_at: row.updated_at
        })
      )
    };
  }

  async attach(projectId: string, input: AttachProjectSlabInput, client: PoolClient): Promise<ProjectSlab> {
    const result = await client.query<ProjectSlabRow>(
      `
        INSERT INTO project_slabs (project_id, slab_id, notes)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [projectId, input.slabId, input.notes ?? null]
    );

    return mapProjectSlabRow(result.rows[0] as ProjectSlabRow);
  }

  async detach(projectId: string, slabId: string, client: PoolClient): Promise<ProjectSlab | null> {
    const result = await client.query<ProjectSlabRow>(
      `
        DELETE FROM project_slabs
        WHERE project_id = $1 AND slab_id = $2
        RETURNING *
      `,
      [projectId, slabId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapProjectSlabRow(row);
  }

  async find(projectId: string, slabId: string, client: PoolClient): Promise<ProjectSlab | null> {
    const result = await client.query<ProjectSlabRow>(
      `
        SELECT *
        FROM project_slabs
        WHERE project_id = $1 AND slab_id = $2
      `,
      [projectId, slabId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapProjectSlabRow(row);
  }

  async markConsumed(projectId: string, slabId: string, actorUserId: string, client: PoolClient): Promise<void> {
    await client.query(
      `
        UPDATE project_slabs
        SET consumed_by_user_id = $3, consumed_at = now()
        WHERE project_id = $1 AND slab_id = $2
      `,
      [projectId, slabId, actorUserId]
    );
  }
}
