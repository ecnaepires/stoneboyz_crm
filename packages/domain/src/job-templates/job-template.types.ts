import type { AppointmentType, ScheduledEventType, TemplateKind } from '../scheduling/scheduled-event.types.js';

export interface JobTemplateActivitySpec {
  sortOrder: number;
  title: string;
  eventType: ScheduledEventType;
  appointmentType: AppointmentType | null;
  templateKind: TemplateKind | null;
  durationMinutes: number;
  notes: string | null;
}

export interface JobTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  activitySpecs: JobTemplateActivitySpec[];
  createdAt: string;
  updatedAt: string;
}
