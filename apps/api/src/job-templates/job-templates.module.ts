import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { JobTemplatesController } from './job-templates.controller.js';
import { JobTemplatesRepository } from './job-templates.repository.js';
import { JobTemplatesService } from './job-templates.service.js';

@Module({
  controllers: [JobTemplatesController],
  providers: [databaseProvider, JobTemplatesRepository, JobTemplatesService],
  exports: [JobTemplatesRepository]
})
export class JobTemplatesModule {}
