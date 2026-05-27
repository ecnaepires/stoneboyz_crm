import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller.js';
import { AttachmentsRepository } from './attachments.repository.js';
import { AttachmentsService } from './attachments.service.js';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsRepository, AttachmentsService]
})
export class AttachmentsModule {}
