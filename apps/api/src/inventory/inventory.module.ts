import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { EventsModule } from '../events/events.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ProjectSlabsController } from './project-slabs.controller.js';
import { ProjectSlabsRepository } from './project-slabs.repository.js';
import { ProjectSlabsService } from './project-slabs.service.js';
import { SlabsController } from './slabs.controller.js';
import { SlabsRepository } from './slabs.repository.js';
import { SlabsService } from './slabs.service.js';

@Module({
  imports: [EventsModule, StorageModule],
  controllers: [SlabsController, ProjectSlabsController],
  providers: [databaseProvider, SlabsRepository, SlabsService, ProjectSlabsRepository, ProjectSlabsService],
  exports: [SlabsRepository, SlabsService]
})
export class InventoryModule {}
