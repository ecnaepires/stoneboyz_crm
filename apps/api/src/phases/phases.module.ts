import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { PhasesController } from './phases.controller.js';
import { PhasesRepository } from './phases.repository.js';
import { PhasesService } from './phases.service.js';

@Module({
  controllers: [PhasesController],
  providers: [databaseProvider, PhasesRepository, PhasesService],
  exports: [PhasesRepository]
})
export class PhasesModule {}
