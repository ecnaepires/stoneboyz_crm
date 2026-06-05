import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AttachProjectSlabInput, CutSlabInput, ProjectSlab, Slab } from '@stoneboyz/domain';
import type { DatabaseError, Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { EventBus } from '../events/event-bus.js';
import { buildSlabCutPayload } from './slab-events.js';
import { InventorySupportRepository } from './inventory-support.repository.js';
import { ProjectSlabsRepository } from './project-slabs.repository.js';
import { SlabsRepository } from './slabs.repository.js';
import { SlabsService } from './slabs.service.js';

export interface ReassignProjectSlabInput {
  actorUserId: string;
  targetCustomerId: string;
  targetProjectId: string;
  reason: string;
}

const UNIQUE_VIOLATION_CODE = '23505';

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

@Injectable()
export class ProjectSlabsService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly projectSlabsRepository: ProjectSlabsRepository,
    private readonly slabsRepository: SlabsRepository,
    private readonly inventorySupportRepository: InventorySupportRepository,
    private readonly slabsService: SlabsService,
    private readonly eventBus: EventBus
  ) {}

  async list(customerId: string, projectId: string): Promise<{ data: Slab[]; projectSlabs: ProjectSlab[] }> {
    await this.ensureProjectExists(customerId, projectId);
    const result = await this.projectSlabsRepository.list(projectId);

    return { data: result.slabs, projectSlabs: result.projectSlabs };
  }

  async attach(customerId: string, projectId: string, input: AttachProjectSlabInput): Promise<ProjectSlab> {
    await this.ensureProjectExists(customerId, projectId);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await this.slabsService.reserveForProject(input.slabId, projectId, input.actorUserId, client);
      const projectSlab = await this.projectSlabsRepository.attach(projectId, input, client);
      await client.query('COMMIT');

      return projectSlab;
    } catch (error) {
      await client.query('ROLLBACK');

      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({ code: 'INVALID_TRANSITION', message: 'Slab is already attached to project' });
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async detach(customerId: string, projectId: string, slabId: string, actorUserId: string): Promise<ProjectSlab> {
    await this.ensureProjectExists(customerId, projectId);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const projectSlab = await this.projectSlabsRepository.detach(projectId, slabId, client);

      if (projectSlab === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project slab not found' });
      }

      await this.slabsService.releaseForProject(slabId, projectId, actorUserId, client);
      await client.query('COMMIT');

      return projectSlab;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reassign(customerId: string, projectId: string, slabId: string, input: ReassignProjectSlabInput): Promise<ProjectSlab> {
    await this.ensureProjectExists(customerId, projectId);
    await this.ensureProjectExists(input.targetCustomerId, input.targetProjectId);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const sourceLink = await this.projectSlabsRepository.find(projectId, slabId, client);
      if (sourceLink === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project slab not found' });
      }

      const slab = await this.slabsRepository.findById(slabId, client);
      if (slab === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Slab not found' });
      }

      if (slab.ownership === 'customer_supplied' && input.targetCustomerId !== customerId) {
        throw new ConflictException({
          code: 'INVALID_TRANSITION',
          message: 'Customer-supplied material cannot be reassigned to a different customer'
        });
      }

      await this.projectSlabsRepository.detach(projectId, slabId, client);
      const projectSlab = await this.projectSlabsRepository.attach(
        input.targetProjectId,
        { actorUserId: input.actorUserId, slabId, notes: 'Reassigned' },
        client
      );
      await this.inventorySupportRepository.insertAuditEvent(
        {
          slabId,
          actorUserId: input.actorUserId,
          action: 'reassigned',
          fromProjectId: projectId,
          toProjectId: input.targetProjectId,
          reason: input.reason
        },
        client
      );

      await client.query('COMMIT');

      return projectSlab;
    } catch (error) {
      await client.query('ROLLBACK');

      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({ code: 'INVALID_TRANSITION', message: 'Slab is already attached to target project' });
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async cut(customerId: string, projectId: string, slabId: string, input: CutSlabInput): Promise<{ slab: Slab; remnants: Slab[] }> {
    await this.ensureProjectExists(customerId, projectId);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const projectSlab = await this.projectSlabsRepository.find(projectId, slabId, client);

      if (projectSlab === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project slab not found' });
      }

      const result = await this.slabsService.cutWithClient(slabId, input, client);
      await this.projectSlabsRepository.markConsumed(projectId, slabId, input.actorUserId, client);
      for (const remnant of result.remnants) {
        if (remnant.ownership !== 'shop_owned') {
          await this.projectSlabsRepository.attach(
            projectId,
            {
              actorUserId: input.actorUserId,
              slabId: remnant.id,
              notes: 'Remnant from cut'
            },
            client
          );
        }
      }
      await client.query('COMMIT');

      this.eventBus.emit(
        'slab.cut',
        buildSlabCutPayload(slabId, input.actorUserId, result.remnants.map((slab) => slab.id))
      );

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureProjectExists(customerId: string, projectId: string): Promise<void> {
    const exists = await this.projectSlabsRepository.projectExists(customerId, projectId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
    }
  }
}
