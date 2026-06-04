import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AttachProjectSlabInput, CutSlabInput, ProjectSlab, Slab } from '@stoneboyz/domain';
import type { DatabaseError, Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { EventBus } from '../events/event-bus.js';
import { buildSlabCutPayload } from './slab-events.js';
import { ProjectSlabsRepository } from './project-slabs.repository.js';
import { SlabsService } from './slabs.service.js';

const UNIQUE_VIOLATION_CODE = '23505';

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

@Injectable()
export class ProjectSlabsService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly projectSlabsRepository: ProjectSlabsRepository,
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
