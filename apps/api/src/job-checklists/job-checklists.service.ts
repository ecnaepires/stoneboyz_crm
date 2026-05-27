import { Injectable, NotFoundException } from '@nestjs/common';
import type { JobChecklist, UpdateJobChecklistInput } from '@stoneboyz/domain';
import { JobChecklistsRepository } from './job-checklists.repository.js';

@Injectable()
export class JobChecklistsService {
  constructor(private readonly jobChecklistsRepository: JobChecklistsRepository) {}

  async getByPhaseId(customerId: string, projectId: string, phaseId: string): Promise<JobChecklist> {
    const checklist = await this.jobChecklistsRepository.findByPhaseId(customerId, projectId, phaseId);

    if (checklist === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Phase not found' });
    }

    return checklist;
  }

  async update(
    customerId: string,
    projectId: string,
    phaseId: string,
    input: UpdateJobChecklistInput
  ): Promise<JobChecklist> {
    const checklist = await this.jobChecklistsRepository.update(customerId, projectId, phaseId, input);

    if (checklist === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Phase not found' });
    }

    return checklist;
  }
}
