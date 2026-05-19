import type { ProjectSlab, Slab } from '@stoneboyz/domain';

export interface SlabRow {
  id: string;
  parent_slab_id: string | null;
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
  notes: string | null;
  status: Slab['status'];
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectSlabRow {
  id: string;
  project_id: string;
  slab_id: string;
  consumed_by_user_id: string | null;
  consumed_at: Date | null;
  notes: string | null;
  created_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapSlabRow = (row: SlabRow): Slab => ({
  id: row.id,
  parentSlabId: row.parent_slab_id,
  stoneType: row.stone_type,
  finish: row.finish,
  qualityGrade: row.quality_grade,
  lengthIn: row.length_in,
  widthIn: row.width_in,
  thicknessCm: row.thickness_cm,
  sqFt: Number(((row.length_in * row.width_in) / 144).toFixed(3)),
  lotNumber: row.lot_number,
  bundleNumber: row.bundle_number,
  warehouseLocation: row.warehouse_location,
  costCents: row.cost_cents,
  imageUrls: row.image_urls,
  notes: row.notes,
  status: row.status,
  archivedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
  archivedByUserId: row.deleted_by_user_id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

export const mapProjectSlabRow = (row: ProjectSlabRow): ProjectSlab => ({
  id: row.id,
  projectId: row.project_id,
  slabId: row.slab_id,
  consumedByUserId: row.consumed_by_user_id,
  consumedAt: row.consumed_at === null ? null : toIso(row.consumed_at),
  notes: row.notes,
  createdAt: toIso(row.created_at)
});
