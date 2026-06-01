import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module.js';
import { AttachmentsController } from './attachments.controller.js';
import { AttachmentsRepository } from './attachments.repository.js';
import { AttachmentsService } from './attachments.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsRepository, AttachmentsService]
})
export class AttachmentsModule {}
