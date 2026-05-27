import type { JobTemplate, JobTemplateActivitySpec } from '@stoneboyz/domain';

export interface JobTemplateRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_default: boolean;
  activity_specs: JobTemplateActivitySpec[];
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapJobTemplateRow = (row: JobTemplateRow): JobTemplate => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  isDefault: row.is_default,
  activitySpecs: [...row.activity_specs].sort((left, right) => left.sortOrder - right.sortOrder),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
