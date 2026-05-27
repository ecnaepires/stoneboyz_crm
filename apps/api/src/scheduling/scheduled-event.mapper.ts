import type { ScheduledEvent } from '@stoneboyz/domain';

export interface ScheduledEventRow {
  id: string;
  customer_id: string;
  project_id: string | null;
  phase_id: string | null;
  event_type: ScheduledEvent['eventType'];
  appointment_type: ScheduledEvent['appointmentType'];
  template_kind: ScheduledEvent['templateKind'];
  title: string;
  scheduled_at: Date;
  duration_minutes: number;
  assignee_user_ids: string[];
  address: string | null;
  status: ScheduledEvent['status'];
  started_by_user_id: string | null;
  started_at: Date | null;
  completed_by_user_id: string | null;
  completed_at: Date | null;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();
const toNullableIso = (value: Date | null): string | null => (value === null ? null : toIso(value));

export const mapScheduledEventRow = (row: ScheduledEventRow): ScheduledEvent => ({
  id: row.id,
  customerId: row.customer_id,
  projectId: row.project_id,
  phaseId: row.phase_id,
  eventType: row.event_type,
  appointmentType: row.appointment_type,
  templateKind: row.template_kind,
  title: row.title,
  scheduledAt: toIso(row.scheduled_at),
  durationMinutes: row.duration_minutes,
  assigneeUserIds: row.assignee_user_ids,
  address: row.address,
  status: row.status,
  startedByUserId: row.started_by_user_id,
  startedAt: toNullableIso(row.started_at),
  completedByUserId: row.completed_by_user_id,
  completedAt: toNullableIso(row.completed_at),
  archivedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
  archivedByUserId: row.deleted_by_user_id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
