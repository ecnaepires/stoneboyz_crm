import type { Tag } from '@stoneboyz/domain';

export interface TagRow {
  id: string;
  name: string;
  color: string | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapTagRow = (row: TagRow): Tag => ({
  id: row.id,
  name: row.name,
  color: row.color,
  archivedAt: row.archived_at === null ? null : toIso(row.archived_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
