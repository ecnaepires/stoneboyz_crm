export const SCHEDULED_EVENT_TYPE_VALUES = ["appointment", "shop_job"] as const;
export const APPOINTMENT_TYPE_VALUES = [
  "template",
  "deposit",
  "material",
  "cut",
  "fabrication",
  "install",
  "invoice",
  "repair",
  "other",
] as const;
export const TEMPLATE_KIND_VALUES = [
  "measurement_only",
  "physical_template",
  "laser_template",
] as const;
export const SCHEDULED_EVENT_STATUS_VALUES = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type ScheduledEventType = (typeof SCHEDULED_EVENT_TYPE_VALUES)[number];
export type AppointmentType = (typeof APPOINTMENT_TYPE_VALUES)[number];
export type TemplateKind = (typeof TEMPLATE_KIND_VALUES)[number];
export type ScheduledEventStatus =
  (typeof SCHEDULED_EVENT_STATUS_VALUES)[number];

export interface ScheduledEvent {
  id: string;
  customerId: string;
  projectId: string | null;
  phaseId: string | null;
  jobActivityId: string | null;
  eventType: ScheduledEventType;
  activityTypeId: string | null;
  appointmentType: AppointmentType | null;
  templateKind: TemplateKind | null;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  assigneeIds: string[];
  address: string | null;
  status: ScheduledEventStatus;
  startedByUserId: string | null;
  startedAt: string | null;
  completedByUserId: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventItem extends ScheduledEvent {
  customerName: string;
  projectTitle: string | null;
  jobNumber: string | null;
  activityTypeName: string | null;
  activityTypeColor: string | null;
  sqft: number | null;
  sqftIsEstimate: boolean;
}

export interface CreateScheduledEventInput {
  actorUserId: string;
  customerId?: string | undefined;
  projectId?: string | undefined;
  phaseId?: string | undefined;
  eventType: ScheduledEventType;
  activityTypeId?: string | null | undefined;
  appointmentType?: AppointmentType | null | undefined;
  templateKind?: TemplateKind | null | undefined;
  title: string;
  scheduledAt: string;
  durationMinutes?: number | undefined;
  assigneeIds: string[];
  address?: string | undefined;
}

export interface UpdateScheduledEventInput {
  actorUserId: string;
  projectId?: string | null | undefined;
  phaseId?: string | null | undefined;
  activityTypeId?: string | null | undefined;
  appointmentType?: AppointmentType | null | undefined;
  templateKind?: TemplateKind | null | undefined;
  title?: string | undefined;
  scheduledAt?: string | undefined;
  durationMinutes?: number | undefined;
  assigneeIds?: string[] | undefined;
  address?: string | null | undefined;
}

export interface TransitionScheduledEventInput {
  actorUserId: string;
}

export interface ArchiveScheduledEventInput {
  actorUserId: string;
}

export interface ListScheduledEventsInput {
  cursor?: string | undefined;
  limit?: number | undefined;
  eventType?: ScheduledEventType | undefined;
  status?: ScheduledEventStatus | undefined;
  projectId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface ListCalendarEventsInput {
  from: string;
  to: string;
  eventTypes?: ScheduledEventType[] | undefined;
  activityTypeIds?: string[] | undefined;
  appointmentTypes?: AppointmentType[] | undefined;
  statuses?: ScheduledEventStatus[] | undefined;
  assigneeIds?: string[] | undefined;
  customerId?: string | undefined;
  projectId?: string | undefined;
  hideCompleted?: boolean | undefined;
}
