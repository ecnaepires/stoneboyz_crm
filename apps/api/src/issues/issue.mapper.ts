import type { Issue } from '@stoneboyz/domain';

export interface IssueRow {
  id: string;
  customer_id: string;
  project_id: string;
  phase_id: string | null;
  type: Issue['type'];
  severity: Issue['severity'];
  status: Issue['status'];
  description: string;
  reported_by_user_id: string;
  reported_at: Date;
  assignee_user_id: string | null;
  resolved_at: Date | null;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapIssueRow = (row: IssueRow): Issue => ({
  id: row.id,
  customerId: row.customer_id,
  projectId: row.project_id,
  phaseId: row.phase_id,
  type: row.type,
  severity: row.severity,
  status: row.status,
  description: row.description,
  reportedByUserId: row.reported_by_user_id,
  reportedAt: toIso(row.reported_at),
  assigneeUserId: row.assignee_user_id,
  resolvedAt: row.resolved_at === null ? null : toIso(row.resolved_at),
  deletedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
  deletedByUserId: row.deleted_by_user_id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
