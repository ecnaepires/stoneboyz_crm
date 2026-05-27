import { Injectable, NotFoundException } from '@nestjs/common';
import type { JobTemplate } from '@stoneboyz/domain';
import { JobTemplatesRepository } from './job-templates.repository.js';

@Injectable()
export class JobTemplatesService {
  constructor(private readonly jobTemplatesRepository: JobTemplatesRepository) {}

  async list(): Promise<JobTemplate[]> {
    return this.jobTemplatesRepository.list();
  }

  async getById(jobTemplateId: string): Promise<JobTemplate> {
    const jobTemplate = await this.jobTemplatesRepository.findById(jobTemplateId);

    if (jobTemplate === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Job template not found' });
    }

    return jobTemplate;
  }
}
