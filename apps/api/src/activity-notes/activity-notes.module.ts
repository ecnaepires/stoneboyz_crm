import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { ActivityNotesController } from './activity-notes.controller.js';
import { ActivityNotesRepository } from './activity-notes.repository.js';
import { ActivityNotesService } from './activity-notes.service.js';

@Module({
  controllers: [ActivityNotesController],
  providers: [databaseProvider, ActivityNotesRepository, ActivityNotesService]
})
export class ActivityNotesModule {}
