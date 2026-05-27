import { Injectable, NotFoundException } from '@nestjs/common';
import type { Attachment, CreateAttachmentInput, ListAttachmentsInput } from '@stoneboyz/domain';
import { AttachmentsRepository } from './attachments.repository.js';

@Injectable()
export class AttachmentsService {
  constructor(private readonly attachmentsRepository: AttachmentsRepository) {}

  async list(customerId: string, input: ListAttachmentsInput): Promise<{ data: Attachment[] }> {
    await this.ensureCustomerExists(customerId);
    await this.ensureAttachableExists(customerId, input.attachableType, input.attachableId);

    return {
      data: await this.attachmentsRepository.listByAttachable(customerId, input.attachableType, input.attachableId)
    };
  }

  async create(customerId: string, input: CreateAttachmentInput): Promise<Attachment> {
    await this.ensureCustomerExists(customerId);
    await this.ensureAttachableExists(customerId, input.attachableType, input.attachableId);

    return this.attachmentsRepository.create(customerId, input);
  }

  async softDelete(customerId: string, attachmentId: string, actorUserId: string): Promise<Attachment> {
    await this.ensureCustomerExists(customerId);

    const attachment = await this.attachmentsRepository.softDelete(customerId, attachmentId, actorUserId);

    if (attachment === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attachment not found' });
    }

    return attachment;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.attachmentsRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }

  private async ensureAttachableExists(
    customerId: string,
    attachableType: CreateAttachmentInput['attachableType'],
    attachableId: string
  ): Promise<void> {
    if (attachableType === 'job') {
      const exists = await this.attachmentsRepository.projectExists(customerId, attachableId);

      if (!exists) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
      }
    }
  }
}
