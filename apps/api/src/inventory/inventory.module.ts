import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { EventsModule } from '../events/events.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { InventorySupportController } from './inventory-support.controller.js';
import { InventorySupportRepository } from './inventory-support.repository.js';
import { InventorySupportService } from './inventory-support.service.js';
import { ProjectSlabsController } from './project-slabs.controller.js';
import { ProjectSlabsRepository } from './project-slabs.repository.js';
import { ProjectSlabsService } from './project-slabs.service.js';
import { SlabsController } from './slabs.controller.js';
import { SlabsRepository } from './slabs.repository.js';
import { SlabsService } from './slabs.service.js';

@Module({
  imports: [EventsModule, StorageModule],
  controllers: [SlabsController, ProjectSlabsController, InventorySupportController],
  providers: [
    databaseProvider,
    SlabsRepository,
    SlabsService,
    ProjectSlabsRepository,
    ProjectSlabsService,
    InventorySupportRepository,
    InventorySupportService
  ],
  exports: [SlabsService]
})
export class InventoryModule {}
