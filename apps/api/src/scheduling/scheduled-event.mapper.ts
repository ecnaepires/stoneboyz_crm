import type { CalendarEventItem, ScheduledEvent } from "@stoneboyz/domain";

export interface ScheduledEventRow {
  id: string;
  customer_id: string;
  project_id: string | null;
  phase_id: string | null;
  event_type: ScheduledEvent["eventType"];
  activity_type_id: string | null;
  appointment_type: ScheduledEvent["appointmentType"];
  activity_seed_slug?: ScheduledEvent["appointmentType"];
  activity_type_name?: string | null;
  activity_type_color?: string | null;
  template_kind: ScheduledEvent["templateKind"];
  title: string;
  scheduled_at: Date;
  duration_minutes: number;
  address: string | null;
  status: ScheduledEvent["status"];
  started_by_user_id: string | null;
  started_at: Date | null;
  completed_by_user_id: string | null;
  completed_at: Date | null;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CalendarEventRow extends ScheduledEventRow {
  customer_name: string;
  project_title: string | null;
  job_number: string | null;
  activity_type_counts_sqft: boolean | null;
  activity_type_sort_order: number | null;
}

const toIso = (value: Date): string => value.toISOString();
const toNullableIso = (value: Date | null): string | null =>
  value === null ? null : toIso(value);

export const mapScheduledEventRow = (
  row: ScheduledEventRow,
  assigneeIds: string[],
  jobActivityId: string | null,
): ScheduledEvent => ({
  id: row.id,
  customerId: row.customer_id,
  projectId: row.project_id,
  phaseId: row.phase_id,
  jobActivityId,
  eventType: row.event_type,
  activityTypeId: row.activity_type_id,
  appointmentType: row.activity_seed_slug ?? row.appointment_type,
  templateKind: row.template_kind,
  title: row.title,
  scheduledAt: toIso(row.scheduled_at),
  durationMinutes: row.duration_minutes,
  assigneeIds,
  address: row.address,
  status: row.status,
  startedByUserId: row.started_by_user_id,
  startedAt: toNullableIso(row.started_at),
  completedByUserId: row.completed_by_user_id,
  completedAt: toNullableIso(row.completed_at),
  archivedAt: row.deleted_at === null ? null : toIso(row.deleted_at),
  archivedByUserId: row.deleted_by_user_id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

export const mapCalendarEventRow = (
  row: CalendarEventRow,
  assigneeIds: string[],
  jobActivityId: string | null,
  sqft: number | null,
  sqftIsEstimate: boolean,
): CalendarEventItem => ({
  ...mapScheduledEventRow(row, assigneeIds, jobActivityId),
  customerName: row.customer_name,
  projectTitle: row.project_title,
  jobNumber: row.job_number,
  activityTypeName: row.activity_type_name ?? null,
  activityTypeColor: row.activity_type_color ?? null,
  sqft,
  sqftIsEstimate,
});
