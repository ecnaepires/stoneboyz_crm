import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ArchiveCustomerNoteInput,
  CreateCustomerNoteInput,
  CustomerNote,
  UpdateCustomerNoteInput
} from '@stoneboyz/domain';
import { EventBus } from '../events/event-bus.js';
import {
  buildCustomerNoteArchivedPayload,
  buildCustomerNoteCreatedPayload,
  buildCustomerNoteUpdatedPayload
} from './customer-events.js';
import { CustomerNotesRepository } from './customer-notes.repository.js';

@Injectable()
export class CustomerNotesService {
  constructor(
    private readonly customerNotesRepository: CustomerNotesRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(customerId: string): Promise<{ data: CustomerNote[] }> {
    await this.ensureCustomerExists(customerId);

    return {
      data: await this.customerNotesRepository.list(customerId)
    };
  }

  async create(customerId: string, input: CreateCustomerNoteInput): Promise<CustomerNote> {
    await this.ensureCustomerExists(customerId);

    const note = await this.customerNotesRepository.create(customerId, input);

    this.eventBus.emit(
      'customer.note_created',
      buildCustomerNoteCreatedPayload(customerId, note.id, input.actorUserId)
    );

    return note;
  }

  async update(
    customerId: string,
    noteId: string,
    input: UpdateCustomerNoteInput,
    actorUserId: string
  ): Promise<CustomerNote> {
    const previousNote = await this.customerNotesRepository.findById(customerId, noteId);

    if (previousNote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer note not found' });
    }

    const note = await this.customerNotesRepository.update(customerId, noteId, input.body);

    if (note === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer note not found' });
    }

    this.eventBus.emit(
      'customer.note_updated',
      buildCustomerNoteUpdatedPayload(customerId, noteId, actorUserId, ['body'])
    );

    return note;
  }

  async archive(customerId: string, noteId: string, input: ArchiveCustomerNoteInput): Promise<CustomerNote> {
    const note = await this.customerNotesRepository.archive(customerId, noteId);

    if (note === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer note not found' });
    }

    this.eventBus.emit(
      'customer.note_archived',
      buildCustomerNoteArchivedPayload(customerId, noteId, input.actorUserId)
    );

    return note;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.customerNotesRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }
}
