import type { Project } from '@stoneboyz/domain';

export interface ProjectRow {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  status: Project['status'];
  owner_user_id: string;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapProjectRow = (row: ProjectRow): Project => ({
  id: row.id,
  customerId: row.customer_id,
  title: row.title,
  description: row.description,
  status: row.status,
  ownerUserId: row.owner_user_id,
  archivedAt: row.archived_at === null ? null : toIso(row.archived_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
