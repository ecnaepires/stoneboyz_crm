import { Module } from "@nestjs/common";
import { databaseProvider } from "../database.provider.js";
import { CalendarViewsController } from "./calendar-views.controller.js";
import { CalendarViewsRepository } from "./calendar-views.repository.js";
import { CalendarViewsService } from "./calendar-views.service.js";

@Module({
  controllers: [CalendarViewsController],
  providers: [databaseProvider, CalendarViewsRepository, CalendarViewsService],
  exports: [CalendarViewsRepository, CalendarViewsService],
})
export class CalendarViewsModule {}
