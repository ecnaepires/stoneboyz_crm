import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { JobChecklistsController } from './job-checklists.controller.js';
import { JobChecklistsRepository } from './job-checklists.repository.js';
import { JobChecklistsService } from './job-checklists.service.js';

@Module({
  controllers: [JobChecklistsController],
  providers: [databaseProvider, JobChecklistsRepository, JobChecklistsService],
  exports: [JobChecklistsRepository]
})
export class JobChecklistsModule {}
