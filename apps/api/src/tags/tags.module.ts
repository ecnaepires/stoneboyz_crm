import { Module } from '@nestjs/common';
import { CustomerTagsController, ProjectTagsController, TagsController } from './tags.controller.js';
import { TagsRepository } from './tags.repository.js';
import { TagsService } from './tags.service.js';

@Module({
  controllers: [TagsController, CustomerTagsController, ProjectTagsController],
  providers: [TagsRepository, TagsService]
})
export class TagsModule {}
