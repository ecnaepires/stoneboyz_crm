import type {
  AppointmentType,
  ScheduledEventStatus,
  ScheduledEventType,
} from "./scheduled-event.types.js";

export const CALENDAR_VIEW_KIND_VALUES = ["calendar", "job_list"] as const;

export const CALENDAR_DISPLAY_TYPE_VALUES = ["day", "week", "range"] as const;

export const CALENDAR_GROUP_BY_VALUES = ["none", "assignee"] as const;

export const CALENDAR_COLOR_BY_VALUES = [
  "appointmentType",
  "status",
  "assignee",
] as const;

export const CALENDAR_DISPLAY_FIELD_VALUES = [
  "projectTitle",
  "customerName",
  "address",
  "activityTitle",
  "time",
  "duration",
  "status",
  "assignees",
  "notes",
  "sqft",
] as const;

export type CalendarViewKind = (typeof CALENDAR_VIEW_KIND_VALUES)[number];
export type CalendarDisplayType = (typeof CALENDAR_DISPLAY_TYPE_VALUES)[number];
export type CalendarGroupBy = (typeof CALENDAR_GROUP_BY_VALUES)[number];
export type CalendarColorBy = (typeof CALENDAR_COLOR_BY_VALUES)[number];
export type CalendarDisplayField =
  (typeof CALENDAR_DISPLAY_FIELD_VALUES)[number];

export interface CalendarViewFilters {
  eventTypes: ScheduledEventType[];
  appointmentTypes: AppointmentType[];
  statuses: ScheduledEventStatus[];
  assigneeIds: string[];
  customerId?: string | undefined;
  projectId?: string | undefined;
  hideCompleted: boolean;
}

export interface CalendarViewConfig {
  version: 1;
  displayType: CalendarDisplayType;
  rangeDays?: number | undefined;
  groupBy: CalendarGroupBy;
  filters: CalendarViewFilters;
  displayFields: CalendarDisplayField[];
  colorBy: CalendarColorBy;
  wrapText: boolean;
  autoRefreshSeconds: number | null;
}

export interface CalendarView {
  id: string;
  name: string;
  viewKind: CalendarViewKind;
  ownerUserId: string | null;
  isShared: boolean;
  config: CalendarViewConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ListCalendarViewsInput {
  viewKind?: CalendarViewKind | undefined;
}

export interface CreateCalendarViewInput {
  actorUserId: string;
  name: string;
  viewKind: CalendarViewKind;
  isShared: boolean;
  config: CalendarViewConfig;
}

export interface UpdateCalendarViewInput {
  actorUserId: string;
  name?: string | undefined;
  isShared?: boolean | undefined;
  config?: CalendarViewConfig | undefined;
}
