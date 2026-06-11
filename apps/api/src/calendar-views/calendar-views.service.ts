import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CalendarView,
  CreateCalendarViewInput,
  ListCalendarViewsInput,
  UpdateCalendarViewInput,
} from "@stoneboyz/domain";
import { CalendarViewsRepository } from "./calendar-views.repository.js";

@Injectable()
export class CalendarViewsService {
  constructor(
    private readonly calendarViewsRepository: CalendarViewsRepository,
  ) {}

  async list(
    actorUserId: string,
    input: ListCalendarViewsInput,
  ): Promise<{ data: CalendarView[] }> {
    const viewKind = input.viewKind ?? "calendar";
    const data = await this.calendarViewsRepository.listVisible(
      actorUserId,
      viewKind,
    );

    return { data };
  }

  async getById(actorUserId: string, viewId: string): Promise<CalendarView> {
    return this.ensureVisibleView(actorUserId, viewId);
  }

  async create(input: CreateCalendarViewInput): Promise<CalendarView> {
    return this.calendarViewsRepository.create(input);
  }

  async update(
    actorUserId: string,
    viewId: string,
    input: UpdateCalendarViewInput,
  ): Promise<CalendarView> {
    await this.ensureVisibleView(actorUserId, viewId);

    const updated = await this.calendarViewsRepository.update(actorUserId, viewId, {
      name: input.name,
      isShared: input.isShared,
      config: input.config,
    });

    if (updated === null) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User cannot edit this calendar view",
      });
    }

    return updated;
  }

  async archive(actorUserId: string, viewId: string): Promise<void> {
    await this.ensureVisibleView(actorUserId, viewId);

    const archived = await this.calendarViewsRepository.archive(actorUserId, viewId);

    if (archived === null) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User cannot delete this calendar view",
      });
    }
  }

  async makeDefault(actorUserId: string, viewId: string): Promise<CalendarView> {
    const view = await this.ensureVisibleView(actorUserId, viewId);
    return this.calendarViewsRepository.setDefault(actorUserId, view);
  }

  private async ensureVisibleView(
    actorUserId: string,
    viewId: string,
  ): Promise<CalendarView> {
    const view = await this.calendarViewsRepository.findVisibleById(
      actorUserId,
      viewId,
    );

    if (view === null) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Calendar view not found",
      });
    }

    return view;
  }
}
