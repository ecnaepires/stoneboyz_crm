export const ISSUE_TYPE_VALUES = [
  'damage_fabrication',
  'damage_install',
  'wrong_material',
  'complaint_cosmetic',
  'complaint_fit',
  'service_callback',
  'measurement_error',
  'process_error',
  'other'
] as const;
export const ISSUE_SEVERITY_VALUES = ['low', 'medium', 'high', 'critical'] as const;
export const ISSUE_STATUS_VALUES = ['open', 'in_progress', 'resolved', 'closed'] as const;

export type IssueType = typeof ISSUE_TYPE_VALUES[number];
export type IssueSeverity = typeof ISSUE_SEVERITY_VALUES[number];
export type IssueStatus = typeof ISSUE_STATUS_VALUES[number];

export interface Issue {
  id: string;
  customerId: string;
  projectId: string;
  phaseId: string | null;
  type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  description: string;
  reportedByUserId: string;
  reportedAt: string;
  assigneeUserId: string | null;
  resolvedAt: string | null;
  deletedAt: string | null;
  deletedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueInput {
  type: IssueType;
  severity?: IssueSeverity | undefined;
  description: string;
  phaseId?: string | undefined;
  reportedByUserId: string;
  assigneeUserId?: string | undefined;
}

export interface UpdateIssueInput {
  actorUserId: string;
  severity?: IssueSeverity | undefined;
  description?: string | undefined;
  status?: IssueStatus | undefined;
  assigneeUserId?: string | null | undefined;
}

export interface ArchiveIssueInput {
  actorUserId: string;
}

export interface ListIssuesInput {
  projectId: string;
  phaseId?: string | undefined;
  status?: IssueStatus | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
  includeArchived?: boolean | undefined;
}
