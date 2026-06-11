import { z } from "zod";
import {
  CALENDAR_COLOR_BY_VALUES,
  CALENDAR_DISPLAY_FIELD_VALUES,
  CALENDAR_DISPLAY_TYPE_VALUES,
  CALENDAR_GROUP_BY_VALUES,
  CALENDAR_VIEW_KIND_VALUES,
} from "./calendar-view.types.js";
import {
  appointmentTypeSchema,
  scheduledEventStatusSchema,
  scheduledEventTypeSchema,
} from "./scheduled-event.schemas.js";

export const calendarViewKindSchema = z.enum(CALENDAR_VIEW_KIND_VALUES);
export const calendarDisplayTypeSchema = z.enum(CALENDAR_DISPLAY_TYPE_VALUES);
export const calendarGroupBySchema = z.enum(CALENDAR_GROUP_BY_VALUES);
export const calendarColorBySchema = z.enum(CALENDAR_COLOR_BY_VALUES);
export const calendarDisplayFieldSchema = z.enum(CALENDAR_DISPLAY_FIELD_VALUES);

export const calendarViewFiltersSchema = z
  .object({
    eventTypes: z.array(scheduledEventTypeSchema).default([]),
    appointmentTypes: z.array(appointmentTypeSchema).default([]),
    statuses: z.array(scheduledEventStatusSchema).default([]),
    assigneeIds: z.array(z.string().uuid()).default([]),
    customerId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    hideCompleted: z.boolean().default(false),
  })
  .default({
    eventTypes: [],
    appointmentTypes: [],
    statuses: [],
    assigneeIds: [],
    hideCompleted: false,
  });

export const calendarViewConfigSchema = z.object({
  version: z.literal(1),
  displayType: calendarDisplayTypeSchema.default("week"),
  rangeDays: z.number().int().min(2).max(31).optional(),
  groupBy: calendarGroupBySchema.default("none"),
  filters: calendarViewFiltersSchema,
  displayFields: z
    .array(calendarDisplayFieldSchema)
    .default([
      "projectTitle",
      "customerName",
      "address",
      "activityTitle",
      "time",
      "status",
      "assignees",
    ]),
  colorBy: calendarColorBySchema.default("appointmentType"),
  wrapText: z.boolean().default(true),
  autoRefreshSeconds: z
    .number()
    .int()
    .min(15)
    .max(600)
    .nullable()
    .default(null),
});

export const calendarViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  viewKind: calendarViewKindSchema,
  ownerUserId: z.string().nullable(),
  isShared: z.boolean(),
  config: calendarViewConfigSchema,
  isDefault: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  archivedAt: z.string().datetime({ offset: true }).nullable(),
});

export const listCalendarViewsSchema = z.object({
  viewKind: calendarViewKindSchema.default("calendar"),
});

export const createCalendarViewSchema = z.object({
  name: z.string().trim().min(1),
  viewKind: calendarViewKindSchema.default("calendar"),
  isShared: z.boolean().default(false),
  config: calendarViewConfigSchema,
});

export const updateCalendarViewSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    isShared: z.boolean().optional(),
    config: calendarViewConfigSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
    path: [],
  });
