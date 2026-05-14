import { Module } from '@nestjs/common';
import { DATABASE_POOL, databaseProvider } from '../database.provider.js';
import { EventsModule } from '../events/events.module.js';
import { ScheduledEventsController } from './scheduled-events.controller.js';
import { ScheduledEventsRepository } from './scheduled-events.repository.js';
import { ScheduledEventsService } from './scheduled-events.service.js';

@Module({
  imports: [EventsModule],
  controllers: [ScheduledEventsController],
  providers: [databaseProvider, ScheduledEventsRepository, ScheduledEventsService],
  exports: [DATABASE_POOL]
})
export class ScheduledEventsModule {}
