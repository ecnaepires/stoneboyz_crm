import { Injectable, NotFoundException } from '@nestjs/common';
import type { ArchiveJobNoteInput, CreateJobNoteInput, JobNote, UpdateJobNoteInput } from '@stoneboyz/domain';
import { JobNotesRepository } from './job-notes.repository.js';

@Injectable()
export class JobNotesService {
  constructor(private readonly jobNotesRepository: JobNotesRepository) {}

  async list(customerId: string, projectId: string): Promise<JobNote[]> {
    await this.ensureCustomerExists(customerId);
    await this.ensureProjectExists(customerId, projectId);

    return this.jobNotesRepository.findByProjectId(customerId, projectId);
  }

  async create(customerId: string, projectId: string, input: CreateJobNoteInput): Promise<JobNote> {
    await this.ensureCustomerExists(customerId);
    await this.ensureProjectExists(customerId, projectId);

    return this.jobNotesRepository.create(customerId, projectId, input);
  }

  async update(customerId: string, projectId: string, noteId: string, input: UpdateJobNoteInput): Promise<JobNote> {
    const previousNote = await this.jobNotesRepository.findById(customerId, projectId, noteId);

    if (previousNote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Job note not found' });
    }

    const note = await this.jobNotesRepository.update(customerId, projectId, noteId, input);

    if (note === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Job note not found' });
    }

    return note;
  }

  async archive(customerId: string, projectId: string, noteId: string, input: ArchiveJobNoteInput): Promise<JobNote> {
    const note = await this.jobNotesRepository.softDelete(customerId, projectId, noteId);

    if (note === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Job note not found' });
    }

    return note;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.jobNotesRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }

  private async ensureProjectExists(customerId: string, projectId: string): Promise<void> {
    const exists = await this.jobNotesRepository.projectExists(customerId, projectId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
    }
  }
}
