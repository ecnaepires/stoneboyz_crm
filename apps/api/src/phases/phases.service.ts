import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ArchivePhaseInput, CreatePhaseInput, Phase, UpdatePhaseInput } from '@stoneboyz/domain';
import { PhasesRepository } from './phases.repository.js';

@Injectable()
export class PhasesService {
  constructor(private readonly phasesRepository: PhasesRepository) {}

  async list(customerId: string, projectId: string, includeArchived = false): Promise<Phase[]> {
    await this.ensureProjectExists(customerId, projectId);
    return this.phasesRepository.list(customerId, projectId, includeArchived);
  }

  async create(customerId: string, projectId: string, input: CreatePhaseInput): Promise<Phase> {
    await this.ensureProjectExists(customerId, projectId);
    return this.phasesRepository.create(customerId, projectId, input);
  }

  async getById(customerId: string, projectId: string, phaseId: string): Promise<Phase> {
    await this.ensureProjectExists(customerId, projectId);
    const phase = await this.phasesRepository.findById(customerId, projectId, phaseId);

    if (phase === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Phase not found' });
    }

    return phase;
  }

  async update(customerId: string, projectId: string, phaseId: string, input: UpdatePhaseInput): Promise<Phase> {
    await this.ensureProjectExists(customerId, projectId);
    const phase = await this.phasesRepository.update(customerId, projectId, phaseId, input);

    if (phase === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Phase not found' });
    }

    return phase;
  }

  async archive(customerId: string, projectId: string, phaseId: string, input: ArchivePhaseInput): Promise<Phase> {
    await this.ensureProjectExists(customerId, projectId);
    const phase = await this.phasesRepository.archive(customerId, projectId, phaseId, input);

    if (phase === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Phase not found' });
    }

    return phase;
  }

  async getFirstPhaseId(projectId: string): Promise<string | null> {
    const phase = await this.phasesRepository.findFirstByProjectId(projectId);
    return phase?.id ?? null;
  }

  private async ensureProjectExists(customerId: string, projectId: string): Promise<void> {
    const exists = await this.phasesRepository.projectExists(customerId, projectId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
    }
  }
}
