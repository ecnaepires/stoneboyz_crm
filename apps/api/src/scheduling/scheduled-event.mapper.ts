import type { ScheduledEvent } from '@stoneboyz/domain';

export interface ScheduledEventRow {
  id: string;
  customer_id: string;
  project_id: string | null;
  event_type: ScheduledEvent['eventType'];
  appointment_type: ScheduledEvent['appointmentType'];
  title: string;
  scheduled_at: Date;
  duration_minutes: number;
  assignee_user_ids: string[];
  address: string | null;
  notes: string | null;
  status: ScheduledEvent['status'];
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapScheduledEventRow = (row: ScheduledEventRow): ScheduledEvent => ({
  id: row.id,
  customerId: row.customer_id,
  projectId: row.project_id,
  eventType: row.event_type,
  appointmentType: row.appointment_type,
  title: row.title,
  scheduledAt: toIso(row.scheduled_at),
  durationMinutes: row.duration_minutes,
  assigneeUserIds: row.assignee_user_ids,
  address: row.address,
  notes: row.notes,
  status: row.status,
  archivedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
  archivedByUserId: row.deleted_by_user_id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
