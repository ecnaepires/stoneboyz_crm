import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { JobNotesController } from './job-notes.controller.js';
import { JobNotesRepository } from './job-notes.repository.js';
import { JobNotesService } from './job-notes.service.js';

@Module({
  controllers: [JobNotesController],
  providers: [databaseProvider, JobNotesRepository, JobNotesService]
})
export class JobNotesModule {}
