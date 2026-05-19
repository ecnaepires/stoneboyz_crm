import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { DrawingRevision, SaveDrawingRevisionInput } from '@stoneboyz/domain';
import { QuoteAreasRepository } from './quote-areas.repository.js';
import { QuoteDrawingRepository } from './quote-drawing.repository.js';
import { QuotesRepository } from './quotes.repository.js';

@Injectable()
export class QuoteDrawingService {
  constructor(
    private readonly quotesRepository: QuotesRepository,
    private readonly quoteAreasRepository: QuoteAreasRepository,
    private readonly quoteDrawingRepository: QuoteDrawingRepository
  ) {}

  async getLatestRevision(
    customerId: string,
    quoteId: string,
    areaId: string
  ): Promise<{ data: DrawingRevision | null }> {
    await this.ensureAreaExists(customerId, quoteId, areaId);
    const revision = await this.quoteDrawingRepository.findLatestByAreaId(areaId);
    return { data: revision };
  }

  async saveRevision(
    customerId: string,
    quoteId: string,
    areaId: string,
    input: SaveDrawingRevisionInput
  ): Promise<DrawingRevision> {
    const quote = await this.ensureAreaExists(customerId, quoteId, areaId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    return this.quoteDrawingRepository.save(areaId, input);
  }

  async listRevisions(
    customerId: string,
    quoteId: string,
    areaId: string
  ): Promise<{ data: DrawingRevision[] }> {
    await this.ensureAreaExists(customerId, quoteId, areaId);
    const revisions = await this.quoteDrawingRepository.findAllByAreaId(areaId);
    return { data: revisions };
  }

  async revertToRevision(
    customerId: string,
    quoteId: string,
    areaId: string,
    revisionId: string,
    actorUserId: string
  ): Promise<DrawingRevision> {
    const quote = await this.ensureAreaExists(customerId, quoteId, areaId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }

    const revision = await this.quoteDrawingRepository.findById(areaId, revisionId);

    if (revision === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Drawing revision not found' });
    }

    return this.quoteDrawingRepository.save(areaId, {
      actorUserId,
      layout: revision.layout,
      notes: `Reverted to revision ${revision.revisionNumber}`
    });
  }

  private async ensureAreaExists(customerId: string, quoteId: string, areaId: string) {
    const quote = await this.quotesRepository.findById(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    const area = await this.quoteAreasRepository.findById(quoteId, areaId);

    if (area === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote area not found' });
    }

    return quote;
  }
}
