export const SCHEDULED_EVENT_TYPE_VALUES = ['appointment', 'shop_job'] as const;
export const APPOINTMENT_TYPE_VALUES = ['measure', 'template', 'install', 'follow_up', 'other'] as const;
export const SCHEDULED_EVENT_STATUS_VALUES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;

export type ScheduledEventType = typeof SCHEDULED_EVENT_TYPE_VALUES[number];
export type AppointmentType = typeof APPOINTMENT_TYPE_VALUES[number];
export type ScheduledEventStatus = typeof SCHEDULED_EVENT_STATUS_VALUES[number];

export interface ScheduledEvent {
  id: string;
  customerId: string;
  projectId: string | null;
  eventType: ScheduledEventType;
  appointmentType: AppointmentType | null;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  assigneeUserIds: string[];
  address: string | null;
  notes: string | null;
  status: ScheduledEventStatus;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledEventInput {
  actorUserId: string;
  customerId?: string | undefined;
  projectId?: string | undefined;
  eventType: ScheduledEventType;
  appointmentType?: AppointmentType | null | undefined;
  title: string;
  scheduledAt: string;
  durationMinutes?: number | undefined;
  assigneeUserIds: string[];
  address?: string | undefined;
  notes?: string | undefined;
}

export interface UpdateScheduledEventInput {
  actorUserId: string;
  projectId?: string | null | undefined;
  appointmentType?: AppointmentType | null | undefined;
  title?: string | undefined;
  scheduledAt?: string | undefined;
  durationMinutes?: number | undefined;
  assigneeUserIds?: string[] | undefined;
  address?: string | null | undefined;
  notes?: string | null | undefined;
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
