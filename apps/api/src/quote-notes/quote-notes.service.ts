import { Injectable, NotFoundException } from '@nestjs/common';
import type { ArchiveQuoteNoteInput, CreateQuoteNoteInput, QuoteNote, UpdateQuoteNoteInput } from '@stoneboyz/domain';
import { QuoteNotesRepository } from './quote-notes.repository.js';

@Injectable()
export class QuoteNotesService {
  constructor(private readonly quoteNotesRepository: QuoteNotesRepository) {}

  async list(customerId: string, quoteId: string): Promise<QuoteNote[]> {
    await this.ensureCustomerExists(customerId);
    await this.ensureQuoteExists(customerId, quoteId);

    return this.quoteNotesRepository.findByQuoteId(customerId, quoteId);
  }

  async create(customerId: string, quoteId: string, input: CreateQuoteNoteInput): Promise<QuoteNote> {
    await this.ensureCustomerExists(customerId);
    await this.ensureQuoteExists(customerId, quoteId);

    return this.quoteNotesRepository.create(customerId, quoteId, input);
  }

  async update(customerId: string, quoteId: string, noteId: string, input: UpdateQuoteNoteInput): Promise<QuoteNote> {
    const previousNote = await this.quoteNotesRepository.findById(customerId, quoteId, noteId);

    if (previousNote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote note not found' });
    }

    const note = await this.quoteNotesRepository.update(customerId, quoteId, noteId, input);

    if (note === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote note not found' });
    }

    return note;
  }

  async archive(customerId: string, quoteId: string, noteId: string, input: ArchiveQuoteNoteInput): Promise<QuoteNote> {
    const note = await this.quoteNotesRepository.softDelete(customerId, quoteId, noteId);

    if (note === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote note not found' });
    }

    return note;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.quoteNotesRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }

  private async ensureQuoteExists(customerId: string, quoteId: string): Promise<void> {
    const exists = await this.quoteNotesRepository.quoteExists(customerId, quoteId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }
  }
}
