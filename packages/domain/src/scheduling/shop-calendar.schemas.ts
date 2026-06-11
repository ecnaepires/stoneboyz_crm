import { z } from "zod";

export const shopCalendarSchema = z.object({
  workDays: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .refine((days) => new Set(days).size === days.length, {
      message: "workDays must not contain duplicates",
    }),
  holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const patchWorkDaysSchema = z.object({
  workDays: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .refine((days) => new Set(days).size === days.length, {
      message: "workDays must not contain duplicates",
    }),
});

export const createHolidaySchema = z.object({
  holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  name: z.string().min(1),
});

export const listHolidaysSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
