import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePriceListItemInput, PriceListItem, UpdatePriceListItemInput } from '@stoneboyz/domain';
import { EventBus } from '../events/event-bus.js';
import { buildPriceListItemPayload, buildPriceListItemUpdatedPayload } from './price-list-events.js';
import { PriceListItemsRepository } from './price-list-items.repository.js';
import { PriceListsRepository } from './price-lists.repository.js';

@Injectable()
export class PriceListItemsService {
  constructor(
    private readonly priceListsRepository: PriceListsRepository,
    private readonly priceListItemsRepository: PriceListItemsRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(priceListId: string): Promise<{ data: PriceListItem[] }> {
    await this.ensureEditablePriceListExists(priceListId, false);
    return { data: await this.priceListItemsRepository.list(priceListId) };
  }

  async create(priceListId: string, input: CreatePriceListItemInput): Promise<PriceListItem> {
    await this.ensurePriceListExists(priceListId);
    const item = await this.priceListItemsRepository.create(priceListId, input);
    this.eventBus.emit('price_list.item_created', buildPriceListItemPayload(priceListId, item.id, input.actorUserId));
    return item;
  }

  async update(priceListId: string, itemId: string, input: UpdatePriceListItemInput): Promise<PriceListItem> {
    await this.ensurePriceListExists(priceListId);
    const item = await this.priceListItemsRepository.update(priceListId, itemId, input);
    if (item === null) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Price list item not found' });

    const changedFields = Object.keys(input).filter((key) => key !== 'actorUserId');
    this.eventBus.emit('price_list.item_updated', buildPriceListItemUpdatedPayload(priceListId, itemId, input.actorUserId, changedFields));
    return item;
  }

  async delete(priceListId: string, itemId: string, actorUserId: string): Promise<PriceListItem> {
    await this.ensurePriceListExists(priceListId);
    const item = await this.priceListItemsRepository.delete(priceListId, itemId);
    if (item === null) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Price list item not found' });

    this.eventBus.emit('price_list.item_deleted', buildPriceListItemPayload(priceListId, itemId, actorUserId));
    return item;
  }

  private async ensureEditablePriceListExists(priceListId: string, _requireDraft = true): Promise<void> {
    await this.ensurePriceListExists(priceListId);
  }

  private async ensurePriceListExists(priceListId: string): Promise<void> {
    const priceList = await this.priceListsRepository.findById(priceListId);
    if (priceList === null) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Price list not found' });
  }
}
