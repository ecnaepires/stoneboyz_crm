import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  createCalendarViewSchema,
  listCalendarViewsSchema,
  updateCalendarViewSchema,
} from "@stoneboyz/domain";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { CalendarViewsService } from "./calendar-views.service.js";

const viewIdSchema = z.string().uuid();

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

@Controller("calendar-views")
export class CalendarViewsController {
  constructor(private readonly calendarViewsService: CalendarViewsService) {}

  @Get()
  async list(
    @CurrentUser() actorUserId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const parsedQuery = listCalendarViewsSchema.safeParse(query);

    if (!parsedQuery.success) {
      throw badRequest(formatZodError(parsedQuery.error));
    }

    return this.calendarViewsService.list(actorUserId, parsedQuery.data);
  }

  @Post()
  async create(@CurrentUser() actorUserId: string, @Body() body: unknown) {
    const parsedBody = createCalendarViewSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.calendarViewsService.create({
      ...parsedBody.data,
      actorUserId,
    });
  }

  @Get(":viewId")
  async getById(
    @CurrentUser() actorUserId: string,
    @Param("viewId") viewId: string,
  ) {
    return this.calendarViewsService.getById(
      actorUserId,
      this.parseViewId(viewId),
    );
  }

  @Patch(":viewId")
  async update(
    @CurrentUser() actorUserId: string,
    @Param("viewId") viewId: string,
    @Body() body: unknown,
  ) {
    const parsedBody = updateCalendarViewSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.calendarViewsService.update(
      actorUserId,
      this.parseViewId(viewId),
      { ...parsedBody.data, actorUserId },
    );
  }

  @Delete(":viewId")
  @HttpCode(204)
  async archive(
    @CurrentUser() actorUserId: string,
    @Param("viewId") viewId: string,
  ) {
    await this.calendarViewsService.archive(actorUserId, this.parseViewId(viewId));
  }

  @Post(":viewId/make-default")
  @HttpCode(200)
  async makeDefault(
    @CurrentUser() actorUserId: string,
    @Param("viewId") viewId: string,
  ) {
    return this.calendarViewsService.makeDefault(
      actorUserId,
      this.parseViewId(viewId),
    );
  }

  private parseViewId(viewId: string): string {
    const parsedViewId = viewIdSchema.safeParse(viewId);

    if (!parsedViewId.success) {
      throw badRequest({ viewId: ["Invalid UUID"] });
    }

    return parsedViewId.data;
  }
}
