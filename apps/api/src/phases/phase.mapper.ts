import type { Phase } from '@stoneboyz/domain';

export interface PhaseRow {
  id: string;
  customer_id: string;
  project_id: string;
  phase_number: number;
  name: string;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapPhaseRow = (row: PhaseRow): Phase => ({
  id: row.id,
  customerId: row.customer_id,
  projectId: row.project_id,
  phaseNumber: row.phase_number,
  name: row.name,
  archivedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
  archivedByUserId: row.deleted_by_user_id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
