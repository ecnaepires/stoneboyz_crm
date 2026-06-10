import type { Assignee } from '@stoneboyz/domain';

export interface AssigneeRow {
  id: string;
  name: string;
  assignee_type: Assignee['assigneeType'];
  active: boolean;
  linked_user_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

const toIso = (value: Date): string => value.toISOString();

export const mapAssigneeRow = (row: AssigneeRow): Assignee => ({
  id: row.id,
  name: row.name,
  assigneeType: row.assignee_type,
  active: row.active,
  linkedUserId: row.linked_user_id,
  notes: row.notes,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  archivedAt: row.archived_at === null ? null : toIso(row.archived_at)
});
