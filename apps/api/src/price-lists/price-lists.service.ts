import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePriceListInput, ListPriceListsInput, PriceList, PriceListWithItems, UpdatePriceListInput } from '@stoneboyz/domain';
import { EventBus } from '../events/event-bus.js';
import { buildPriceListPayload, buildPriceListUpdatedPayload } from './price-list-events.js';
import { PriceListItemsRepository } from './price-list-items.repository.js';
import { InvalidPriceListCursorError, PriceListsRepository } from './price-lists.repository.js';

@Injectable()
export class PriceListsService {
  constructor(
    private readonly priceListsRepository: PriceListsRepository,
    private readonly priceListItemsRepository: PriceListItemsRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(input: ListPriceListsInput): Promise<{ data: PriceList[]; nextCursor: string | null; hasMore: boolean }> {
    try {
      return await this.priceListsRepository.list({
        ...input,
        limit: input.limit ?? 25,
        includeArchived: input.includeArchived ?? false
      });
    } catch (error) {
      if (error instanceof InvalidPriceListCursorError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { cursor: ['Invalid cursor'] }
        });
      }
      throw error;
    }
  }

  async create(input: CreatePriceListInput): Promise<PriceList> {
    const priceList = await this.priceListsRepository.create(input);
    this.eventBus.emit('price_list.created', buildPriceListPayload(priceList.id, input.actorUserId));
    return priceList;
  }

  async getById(priceListId: string): Promise<PriceListWithItems> {
    const priceList = await this.ensurePriceListExists(priceListId);
    const items = await this.priceListItemsRepository.list(priceListId);
    return { ...priceList, items };
  }

  async update(priceListId: string, input: UpdatePriceListInput): Promise<PriceList> {
    await this.ensurePriceListExists(priceListId);

    const priceList = await this.priceListsRepository.update(priceListId, input);
    if (priceList === null) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Price list not found' });

    const changedFields = Object.keys(input).filter((key) => key !== 'actorUserId');
    this.eventBus.emit('price_list.updated', buildPriceListUpdatedPayload(priceListId, input.actorUserId, changedFields));
    return priceList;
  }

  async activate(priceListId: string, actorUserId: string): Promise<PriceList> {
    const current = await this.ensurePriceListExists(priceListId);
    if (current.status !== 'draft') throw this.invalidTransition('Only draft price lists can be activated');

    const priceList = await this.priceListsRepository.activate(priceListId);
    if (priceList === null) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Price list not found' });

    this.eventBus.emit('price_list.activated', buildPriceListPayload(priceListId, actorUserId));
    return priceList;
  }

  async archive(priceListId: string, actorUserId: string): Promise<PriceList> {
    const current = await this.ensurePriceListExists(priceListId);
    if (current.status !== 'draft') throw this.invalidTransition('Only draft price lists can be archived');

    const priceList = await this.priceListsRepository.archive(priceListId, actorUserId);
    if (priceList === null) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Price list not found' });

    this.eventBus.emit('price_list.archived', buildPriceListPayload(priceListId, actorUserId));
    return priceList;
  }

  private async ensurePriceListExists(priceListId: string): Promise<PriceList> {
    const priceList = await this.priceListsRepository.findById(priceListId);
    if (priceList === null) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Price list not found' });
    return priceList;
  }

  private invalidTransition(message: string): ConflictException {
    return new ConflictException({ code: 'INVALID_TRANSITION', message });
  }
}
