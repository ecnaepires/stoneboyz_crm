import { Module } from '@nestjs/common';
import { ActivityTypesModule } from '../activity-types/activity-types.module.js';
import { databaseProvider } from '../database.provider.js';
import { ScheduledEventsModule } from '../scheduling/scheduled-events.module.js';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module.js';
import { JobActivityScheduledEventListener } from './job-activity-scheduled-event.listener.js';
import { JobActivitiesController } from './job-activities.controller.js';
import { JobActivitiesRepository } from './job-activities.repository.js';
import { JobActivitiesService } from './job-activities.service.js';

@Module({
  imports: [ActivityTypesModule, ScheduledEventsModule, ShopSettingsModule],
  controllers: [JobActivitiesController],
  providers: [databaseProvider, JobActivitiesRepository, JobActivitiesService, JobActivityScheduledEventListener],
  exports: [JobActivitiesRepository]
})
export class JobActivitiesModule {}
