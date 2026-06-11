import type { ActivityType, Shop } from '@stoneboyz/domain';

export interface ShopRow {
  id: string;
  slug: string;
  name: string;
  work_days: number[];
  counter_depth_presets: number[];
  created_at: Date;
  updated_at: Date;
}

export interface ActivityTypeRow {
  id: string;
  shop_id: string;
  name: string;
  seed_slug: ActivityType['seedSlug'];
  color: string;
  pipeline_stage: ActivityType['pipelineStage'];
  counts_square_footage: boolean;
  autoschedule_eligible: boolean;
  uses_template_kind: boolean;
  default_duration_minutes: number;
  sort_order: number;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();
const toNullableIso = (value: Date | null): string | null => (value === null ? null : toIso(value));

export const mapShopRow = (row: ShopRow): Shop => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  workDays: row.work_days,
  counterDepthPresets: row.counter_depth_presets,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

export const mapActivityTypeRow = (row: ActivityTypeRow): ActivityType => ({
  id: row.id,
  shopId: row.shop_id,
  name: row.name,
  seedSlug: row.seed_slug,
  color: row.color,
  pipelineStage: row.pipeline_stage,
  countsSquareFootage: row.counts_square_footage,
  autoscheduleEligible: row.autoschedule_eligible,
  usesTemplateKind: row.uses_template_kind,
  defaultDurationMinutes: row.default_duration_minutes,
  sortOrder: row.sort_order,
  archivedAt: toNullableIso(row.archived_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});
