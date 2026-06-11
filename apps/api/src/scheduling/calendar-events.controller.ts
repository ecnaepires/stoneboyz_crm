import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { listCalendarEventsSchema } from "@stoneboyz/domain";
import { z } from "zod";
import { ScheduledEventsService } from "./scheduled-events.service.js";

const formatZodError = (error: z.ZodError): Record<string, string[]> => {
  return z.flattenError(error).fieldErrors;
};

const badRequest = (details: Record<string, string[]>): BadRequestException => {
  return new BadRequestException({
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
    details,
  });
};

@Controller("events")
export class CalendarEventsController {
  constructor(
    private readonly scheduledEventsService: ScheduledEventsService,
  ) {}

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const parsedQuery = listCalendarEventsSchema.safeParse(query);

    if (!parsedQuery.success) {
      throw badRequest(formatZodError(parsedQuery.error));
    }

    return this.scheduledEventsService.listGlobal(parsedQuery.data);
  }
}
