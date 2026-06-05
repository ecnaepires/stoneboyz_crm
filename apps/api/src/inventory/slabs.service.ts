import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ArchiveSlabInput,
  CreateSlabInput,
  CutSlabInput,
  FindMaterialInput,
  FindMaterialResult,
  ListSlabsInput,
  Slab,
  UpdateSlabInput
} from '@stoneboyz/domain';
import type { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { EventBus } from '../events/event-bus.js';
import { buildSlabCutPayload, buildSlabEventPayload, buildSlabReservedPayload, buildSlabUpdatedPayload } from './slab-events.js';
import { InventorySupportRepository } from './inventory-support.repository.js';
import { InvalidSlabCursorError, InvalidSlabStatusError, SlabsRepository } from './slabs.repository.js';

@Injectable()
export class SlabsService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly slabsRepository: SlabsRepository,
    private readonly inventorySupportRepository: InventorySupportRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(input: ListSlabsInput): Promise<{ data: Slab[]; nextCursor: string | null; hasMore: boolean }> {
    try {
      return await this.slabsRepository.list({
        ...input,
        limit: input.limit ?? 25
      });
    } catch (error) {
      if (error instanceof InvalidSlabCursorError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { cursor: ['Invalid cursor'] }
        });
      }

      throw error;
    }
  }

  async create(input: CreateSlabInput): Promise<Slab> {
    const slab = await this.slabsRepository.create({
      ...input,
      tagCode: input.tagCode ?? await this.slabsRepository.nextTagCode()
    });
    this.eventBus.emit('slab.created', buildSlabEventPayload(slab.id, input.actorUserId));
    return slab;
  }

  async getById(slabId: string): Promise<Slab> {
    return this.ensureSlabExists(slabId);
  }

  async findMaterial(input: FindMaterialInput): Promise<{ data: Array<Slab & { fitsRotated: boolean; wasteSqFt: number }> }> {
    const results: FindMaterialResult[] = await this.slabsRepository.findMaterial(input);

    return {
      data: results.map((result) => ({
        ...result.slab,
        fitsRotated: result.fitsRotated,
        wasteSqFt: result.wasteSqFt
      }))
    };
  }

  async update(slabId: string, input: UpdateSlabInput): Promise<Slab> {
    const current = await this.ensureSlabExists(slabId);

    if (current.status !== 'available' && current.status !== 'remnant') {
      throw this.invalidTransition('Slab status does not allow updates');
    }

    try {
      const slab = await this.slabsRepository.update(slabId, input);

      if (slab === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
      }

      const changedFields = Object.keys(input).filter((key) => key !== 'actorUserId');
      this.eventBus.emit('slab.updated', buildSlabUpdatedPayload(slabId, input.actorUserId, changedFields));

      return slab;
    } catch (error) {
      if (error instanceof InvalidSlabStatusError) {
        throw this.invalidTransition('Slab status does not allow updates');
      }

      throw error;
    }
  }

  async archive(slabId: string, input: ArchiveSlabInput): Promise<Slab> {
    const current = await this.ensureSlabExists(slabId);

    if (current.status !== 'available' && current.status !== 'remnant') {
      throw this.invalidTransition('Slab status does not allow archive');
    }

    try {
      const slab = await this.slabsRepository.archive(slabId, input.actorUserId);

      if (slab === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
      }

      this.eventBus.emit('slab.archived', buildSlabEventPayload(slabId, input.actorUserId));

      return slab;
    } catch (error) {
      if (error instanceof InvalidSlabStatusError) {
        throw this.invalidTransition('Slab status does not allow archive');
      }

      throw error;
    }
  }

  async cut(slabId: string, input: CutSlabInput): Promise<{ slab: Slab; remnants: Slab[] }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await this.cutWithClient(slabId, input, client);
      await client.query('COMMIT');

      this.eventBus.emit(
        'slab.cut',
        buildSlabCutPayload(slabId, input.actorUserId, result.remnants.map((slab) => slab.id))
      );

      return result;
    } catch (error) {
      await client.query('ROLLBACK');

      if (error instanceof InvalidSlabStatusError) {
        throw this.invalidTransition(error.message === 'Slab is already cut' ? 'Slab is already cut' : 'Invalid slab transition');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async cutWithClient(slabId: string, input: CutSlabInput, client: PoolClient): Promise<{ slab: Slab; remnants: Slab[] }> {
    const result = await this.slabsRepository.cut(slabId, input.remnants ?? [], client);

    if (result.slab === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
    }

    return { slab: result.slab, remnants: result.remnants };
  }

  async reserveForQuote(slabId: string, quoteId: string, actorUserId: string, client: PoolClient): Promise<void> {
    await this.reserveWithClient(slabId, actorUserId, client, quoteId);
  }

  async releaseForQuote(slabId: string, quoteId: string, actorUserId: string, client: PoolClient): Promise<void> {
    const released = await this.slabsRepository.release(slabId, client);

    if (released !== null) {
      this.eventBus.emit('slab.released', buildSlabReservedPayload(slabId, actorUserId, quoteId));
    }
  }

  async releaseManyForQuote(quoteId: string, actorUserId: string, client: PoolClient): Promise<void> {
    const releasedSlabIds = await this.slabsRepository.releaseManyForQuote(quoteId, client);

    for (const slabId of releasedSlabIds) {
      this.eventBus.emit('slab.released', buildSlabReservedPayload(slabId, actorUserId, quoteId));
    }
  }

  async reserveForProject(slabId: string, projectId: string, actorUserId: string, client: PoolClient): Promise<void> {
    const current = await this.slabsRepository.findById(slabId, client);

    if (current === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
    }

    if (current.status === 'reserved') {
      return;
    }

    await this.reserveWithClient(slabId, actorUserId, client, undefined, projectId);
    await this.inventorySupportRepository.insertAuditEvent(
      { slabId, actorUserId, action: 'reserved', toProjectId: projectId },
      client
    );
  }

  async releaseForProject(slabId: string, projectId: string, actorUserId: string, client: PoolClient): Promise<void> {
    const current = await this.slabsRepository.findById(slabId, client);

    if (current === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
    }

    if (current.ownership !== 'shop_owned') {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: 'Restricted material must be released to shop stock by an inventory manager'
      });
    }

    const released = await this.slabsRepository.release(slabId, client);

    if (released !== null) {
      this.eventBus.emit('slab.released', buildSlabReservedPayload(slabId, actorUserId, undefined, projectId));
      await this.inventorySupportRepository.insertAuditEvent(
        { slabId, actorUserId, action: 'released', fromProjectId: projectId },
        client
      );
    }
  }

  private async reserveWithClient(
    slabId: string,
    actorUserId: string,
    client: PoolClient,
    quoteId?: string,
    projectId?: string
  ): Promise<void> {
    try {
      const slab = await this.slabsRepository.reserve(slabId, client);

      if (slab === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
      }

      this.eventBus.emit('slab.reserved', buildSlabReservedPayload(slabId, actorUserId, quoteId, projectId));
    } catch (error) {
      if (error instanceof InvalidSlabStatusError) {
        throw new ConflictException({ code: 'SLAB_NOT_AVAILABLE', message: 'Slab is not available' });
      }

      throw error;
    }
  }

  async addImageUrl(slabId: string, url: string): Promise<Slab | null> {
    return this.slabsRepository.addImageUrl(slabId, url);
  }

  async removeImageUrl(slabId: string, url: string): Promise<Slab | null> {
    return this.slabsRepository.removeImageUrl(slabId, url);
  }

  private async ensureSlabExists(slabId: string): Promise<Slab> {
    const slab = await this.slabsRepository.findById(slabId);

    if (slab === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
    }

    return slab;
  }

  private invalidTransition(message: string): ConflictException {
    return new ConflictException({ code: message === 'Slab is already cut' ? 'SLAB_ALREADY_CUT' : 'INVALID_TRANSITION', message });
  }
}
