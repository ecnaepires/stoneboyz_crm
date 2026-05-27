import { Injectable, NotFoundException } from '@nestjs/common';
import type { ArchiveActivityNoteInput, ActivityNote, CreateActivityNoteInput, UpdateActivityNoteInput } from '@stoneboyz/domain';
import { ActivityNotesRepository } from './activity-notes.repository.js';

@Injectable()
export class ActivityNotesService {
  constructor(private readonly activityNotesRepository: ActivityNotesRepository) {}

  async list(customerId: string, eventId: string): Promise<ActivityNote[]> {
    await this.ensureCustomerExists(customerId);
    await this.ensureEventExists(customerId, eventId);

    return this.activityNotesRepository.findByEventId(customerId, eventId);
  }

  async create(customerId: string, eventId: string, input: CreateActivityNoteInput): Promise<ActivityNote> {
    await this.ensureCustomerExists(customerId);
    await this.ensureEventExists(customerId, eventId);

    return this.activityNotesRepository.create(customerId, eventId, input);
  }

  async update(customerId: string, eventId: string, noteId: string, input: UpdateActivityNoteInput): Promise<ActivityNote> {
    const previousNote = await this.activityNotesRepository.findById(customerId, eventId, noteId);

    if (previousNote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Activity note not found' });
    }

    const note = await this.activityNotesRepository.update(customerId, eventId, noteId, input);

    if (note === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Activity note not found' });
    }

    return note;
  }

  async archive(customerId: string, eventId: string, noteId: string, input: ArchiveActivityNoteInput): Promise<ActivityNote> {
    const note = await this.activityNotesRepository.softDelete(customerId, eventId, noteId);

    if (note === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Activity note not found' });
    }

    return note;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.activityNotesRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }

  private async ensureEventExists(customerId: string, eventId: string): Promise<void> {
    const exists = await this.activityNotesRepository.eventExists(customerId, eventId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Scheduled event not found' });
    }
  }
}
