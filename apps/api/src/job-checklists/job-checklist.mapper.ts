import type { JobChecklist } from '@stoneboyz/domain';

export interface JobChecklistRow {
  id: string;
  customer_id: string;
  project_id: string;
  phase_id: string;
  deposit_received: boolean;
  tearout_required: boolean;
  tearout_completed: boolean;
  ready_to_template: boolean;
  approved_for_install: boolean;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapJobChecklistRow = (row: JobChecklistRow): JobChecklist => ({
  id: row.id,
  customerId: row.customer_id,
  projectId: row.project_id,
  phaseId: row.phase_id,
  depositReceived: row.deposit_received,
  tearoutRequired: row.tearout_required,
  tearoutCompleted: row.tearout_completed,
  readyToTemplate: row.ready_to_template,
  approvedForInstall: row.approved_for_install,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
