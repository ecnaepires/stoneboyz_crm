import { z } from "zod";
import {
  APPOINTMENT_TYPE_VALUES,
  SCHEDULED_EVENT_STATUS_VALUES,
  SCHEDULED_EVENT_TYPE_VALUES,
  TEMPLATE_KIND_VALUES,
} from "./scheduled-event.types.js";

export const scheduledEventTypeSchema = z.enum(SCHEDULED_EVENT_TYPE_VALUES);
export const appointmentTypeSchema = z.enum(APPOINTMENT_TYPE_VALUES);
export const templateKindSchema = z.enum(TEMPLATE_KIND_VALUES);
export const scheduledEventStatusSchema = z.enum(SCHEDULED_EVENT_STATUS_VALUES);

const actorSchema = z.object({});

const dateTimeSchema = z.string().datetime({ offset: true });
const nullableDateTimeSchema = dateTimeSchema.nullable();
const assigneeIdsSchema = z
  .array(z.string().uuid())
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Assignee IDs must be unique",
  });

const validateAppointmentType = (
  input: {
    eventType?: string | undefined;
    activityTypeId?: string | null | undefined;
    appointmentType?: string | null | undefined;
  },
  context: z.RefinementCtx,
): void => {
  if (
    input.eventType === "appointment" &&
    input.activityTypeId == null &&
    input.appointmentType == null
  ) {
    context.addIssue({
      code: "custom",
      path: ["activityTypeId"],
      message: "activityTypeId or appointmentType is required for appointment events",
    });
  }

  if (
    input.eventType === "shop_job" &&
    (input.activityTypeId != null || input.appointmentType != null)
  ) {
    context.addIssue({
      code: "custom",
      path: ["activityTypeId"],
      message: "activityTypeId and appointmentType must be null for shop_job events",
    });
  }
};

export const transitionScheduledEventSchema = actorSchema;
export const archiveScheduledEventSchema = actorSchema;

export const scheduledEventSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  phaseId: z.string().uuid().nullable(),
  jobActivityId: z.string().uuid().nullable(),
  eventType: scheduledEventTypeSchema,
  activityTypeId: z.string().uuid().nullable(),
  appointmentType: appointmentTypeSchema.nullable(),
  templateKind: templateKindSchema.nullable(),
  title: z.string(),
  scheduledAt: dateTimeSchema,
  durationMinutes: z.number().int(),
  assigneeIds: assigneeIdsSchema,
  address: z.string().nullable(),
  status: scheduledEventStatusSchema,
  startedByUserId: z.string().uuid().nullable(),
  startedAt: nullableDateTimeSchema,
  completedByUserId: z.string().uuid().nullable(),
  completedAt: nullableDateTimeSchema,
  archivedAt: nullableDateTimeSchema,
  archivedByUserId: z.string().uuid().nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const createScheduledEventSchema = z
  .object({
    customerId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    phaseId: z.string().uuid().optional(),
    eventType: scheduledEventTypeSchema,
    activityTypeId: z.string().uuid().nullable().optional(),
    appointmentType: appointmentTypeSchema.nullable().optional(),
    templateKind: templateKindSchema.nullable().optional(),
    title: z.string().min(1),
    scheduledAt: dateTimeSchema,
    durationMinutes: z.number().int().min(1).default(60),
    assigneeIds: assigneeIdsSchema.default([]),
    address: z.string().min(1).optional(),
  })
  .superRefine(validateAppointmentType);

export const updateScheduledEventSchema = z
  .object({
    projectId: z.string().uuid().nullable().optional(),
    phaseId: z.string().uuid().nullable().optional(),
    activityTypeId: z.string().uuid().nullable().optional(),
    appointmentType: appointmentTypeSchema.nullable().optional(),
    templateKind: templateKindSchema.nullable().optional(),
    title: z.string().min(1).optional(),
    scheduledAt: dateTimeSchema.optional(),
    durationMinutes: z.number().int().min(1).optional(),
    assigneeIds: assigneeIdsSchema.optional(),
    address: z.string().min(1).nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
    path: [],
  });

export const listScheduledEventsSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  eventType: scheduledEventTypeSchema.optional(),
  status: scheduledEventStatusSchema.optional(),
  projectId: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

const MAX_CALENDAR_RANGE_DAYS = 62;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const queryArray = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        typeof item === "string" ? item.split(",") : item,
      );
    }

    return typeof value === "string" ? value.split(",") : value;
  }, z.array(schema).optional());

export const listCalendarEventsSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
    eventTypes: queryArray(scheduledEventTypeSchema),
    activityTypeIds: queryArray(z.string().uuid()),
    appointmentTypes: queryArray(appointmentTypeSchema),
    statuses: queryArray(scheduledEventStatusSchema),
    assigneeIds: queryArray(z.string().uuid()),
    customerId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    hideCompleted: z.coerce.boolean().optional(),
  })
  .refine(
    (input) => new Date(input.to).getTime() > new Date(input.from).getTime(),
    {
      message: "to must be after from",
      path: ["to"],
    },
  )
  .refine(
    (input) =>
      (new Date(input.to).getTime() - new Date(input.from).getTime()) /
        MS_PER_DAY <=
      MAX_CALENDAR_RANGE_DAYS,
    {
      message: `Range must be ${MAX_CALENDAR_RANGE_DAYS} days or fewer`,
      path: ["to"],
    },
  );
  
