import type { JobActivity } from '@stoneboyz/domain';

export interface JobActivityRow {
  id: string;
  customer_id: string;
  project_id: string;
  job_template_id: string;
  template_activity_key: string;
  title: string;
  activity_type: JobActivity['activityType'];
  activity_type_id: string | null;
  appointment_type: JobActivity['appointmentType'];
  template_kind: JobActivity['templateKind'];
  status: JobActivity['status'];
  sort_order: number;
  duration_minutes: number;
  scheduled_event_id: string | null;
  autoschedule_state: JobActivity['autoscheduleState'];
  autoschedule_offset_amount: number | null;
  autoschedule_offset_unit: string | null;
  depends_on_activity_id: string | null;
  manual_override_at: Date | null;
  autoschedule_eligible?: boolean | null;
  created_at: Date;
  updated_at: Date;
}

const toIso = (value: Date): string => value.toISOString();

export const mapJobActivityRow = (row: JobActivityRow): JobActivity => ({
  id: row.id,
  customerId: row.customer_id,
  projectId: row.project_id,
  jobTemplateId: row.job_template_id,
  templateActivityKey: row.template_activity_key,
  title: row.title,
  activityType: row.activity_type,
  activityTypeId: row.activity_type_id,
  appointmentType: row.appointment_type,
  templateKind: row.template_kind,
  status: row.status,
  sortOrder: row.sort_order,
  durationMinutes: row.duration_minutes,
  scheduledEventId: row.scheduled_event_id,
  autoscheduleState: row.autoschedule_state,
  autoscheduleOffsetAmount: row.autoschedule_offset_amount,
  autoscheduleOffsetUnit: row.autoschedule_offset_unit,
  dependsOnActivityId: row.depends_on_activity_id,
  manualOverrideAt: row.manual_override_at === null ? null : toIso(row.manual_override_at),
  autoscheduleEligible: row.autoschedule_eligible ?? false,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});
