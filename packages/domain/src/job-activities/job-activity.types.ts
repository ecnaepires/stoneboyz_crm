import type { AppointmentType, ScheduledEventType, TemplateKind } from '../scheduling/scheduled-event.types.js';

export const JOB_ACTIVITY_STATUS_VALUES = [
  'not_scheduled',
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
] as const;

export type JobActivityStatus = typeof JOB_ACTIVITY_STATUS_VALUES[number];

export interface JobActivity {
  id: string;
  customerId: string;
  projectId: string;
  jobTemplateId: string;
  templateActivityKey: string;
  title: string;
  activityType: ScheduledEventType;
  appointmentType: AppointmentType | null;
  templateKind: TemplateKind | null;
  status: JobActivityStatus;
  sortOrder: number;
  durationMinutes: number;
  scheduledEventId: string | null;
  autoscheduleState: string | null;
  autoscheduleOffsetAmount: number | null;
  autoscheduleOffsetUnit: string | null;
  dependsOnActivityId: string | null;
  manualOverrideAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleJobActivityInput {
  actorUserId: string;
  scheduledAt: string;
  durationMinutes?: number | undefined;
  assigneeIds: string[];
}
