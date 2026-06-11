import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { AssigneesController } from './assignees.controller.js';
import { AssigneesRepository } from './assignees.repository.js';

@Module({
  controllers: [AssigneesController],
  providers: [databaseProvider, AssigneesRepository],
  exports: [AssigneesRepository]
})
export class AssigneesModule {}
