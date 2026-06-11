import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { ScheduledEventsModule } from '../scheduling/scheduled-events.module.js';
import { JobActivityScheduledEventListener } from './job-activity-scheduled-event.listener.js';
import { JobActivitiesController } from './job-activities.controller.js';
import { JobActivitiesRepository } from './job-activities.repository.js';
import { JobActivitiesService } from './job-activities.service.js';

@Module({
  imports: [ScheduledEventsModule],
  controllers: [JobActivitiesController],
  providers: [databaseProvider, JobActivitiesRepository, JobActivitiesService, JobActivityScheduledEventListener],
  exports: [JobActivitiesRepository]
})
export class JobActivitiesModule {}
