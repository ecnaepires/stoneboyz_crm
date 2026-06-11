import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { EventsModule } from '../events/events.module.js';
import { ShopsRepository } from '../activity-types/shops.repository.js';
import { ShopSettingsController } from './shop-settings.controller.js';
import { ShopSettingsRepository } from './shop-settings.repository.js';
import { ShopSettingsService } from './shop-settings.service.js';

@Module({
  imports: [EventsModule],
  controllers: [ShopSettingsController],
  providers: [databaseProvider, ShopsRepository, ShopSettingsRepository, ShopSettingsService],
  exports: [ShopSettingsRepository, ShopsRepository],
})
export class ShopSettingsModule {}
