import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { EventsModule } from '../events/events.module.js';
import { PriceListItemsController } from './price-list-items.controller.js';
import { PriceListItemsRepository } from './price-list-items.repository.js';
import { PriceListItemsService } from './price-list-items.service.js';
import { PriceListsController } from './price-lists.controller.js';
import { PriceListsRepository } from './price-lists.repository.js';
import { PriceListsService } from './price-lists.service.js';

@Module({
  imports: [EventsModule],
  controllers: [PriceListsController, PriceListItemsController],
  providers: [databaseProvider, PriceListsRepository, PriceListItemsRepository, PriceListsService, PriceListItemsService],
  exports: [PriceListsService]
})
export class PriceListsModule {}
