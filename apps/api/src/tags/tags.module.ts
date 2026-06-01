import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module.js';
import { CustomerTagsController, ProjectTagsController, TagsController } from './tags.controller.js';
import { TagsRepository } from './tags.repository.js';
import { TagsService } from './tags.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [TagsController, CustomerTagsController, ProjectTagsController],
  providers: [TagsRepository, TagsService]
})
export class TagsModule {}
