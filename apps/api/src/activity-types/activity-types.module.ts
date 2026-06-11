import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { EventsModule } from '../events/events.module.js';
import { ActivityTypesController } from './activity-types.controller.js';
import { ActivityTypesRepository } from './activity-types.repository.js';
import { ActivityTypesService } from './activity-types.service.js';
import { ShopsRepository } from './shops.repository.js';

@Module({
  imports: [EventsModule],
  controllers: [ActivityTypesController],
  providers: [databaseProvider, ActivityTypesRepository, ActivityTypesService, ShopsRepository],
  exports: [ActivityTypesService, ActivityTypesRepository, ShopsRepository],
})
export class ActivityTypesModule {}
