import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTagInput, Tag, UpdateTagInput } from '@stoneboyz/domain';
import type { DatabaseError } from 'pg';
import { TagsRepository } from './tags.repository.js';

const UNIQUE_VIOLATION_CODE = '23505';

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

@Injectable()
export class TagsService {
  constructor(private readonly tagsRepository: TagsRepository) {}

  async list(includeArchived = false): Promise<{ data: Tag[] }> {
    return {
      data: await this.tagsRepository.list(includeArchived)
    };
  }

  async getById(tagId: string): Promise<Tag> {
    const tag = await this.tagsRepository.findById(tagId);

    if (tag === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Tag not found' });
    }

    return tag;
  }

  async create(input: CreateTagInput): Promise<Tag> {
    try {
      return await this.tagsRepository.create(input);
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Tag conflicts with an existing tag'
        });
      }

      throw error;
    }
  }

  async update(tagId: string, input: UpdateTagInput): Promise<Tag> {
    try {
      const tag = await this.tagsRepository.update(tagId, input);

      if (tag === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Tag not found' });
      }

      return tag;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Tag conflicts with an existing tag'
        });
      }

      throw error;
    }
  }

  async archive(tagId: string, actorUserId: string): Promise<Tag> {
    const tag = await this.tagsRepository.archive(tagId, actorUserId);

    if (tag === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Tag not found' });
    }

    return tag;
  }

  async listCustomerTags(customerId: string): Promise<{ data: Tag[] }> {
    await this.ensureCustomerExists(customerId);

    return {
      data: await this.tagsRepository.listCustomerTags(customerId)
    };
  }

  async assignCustomerTag(customerId: string, tagId: string): Promise<Tag> {
    await this.ensureCustomerExists(customerId);

    const tag = await this.tagsRepository.findById(tagId);

    if (tag === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Tag not found' });
    }

    await this.tagsRepository.assignCustomerTag(customerId, tagId);

    return tag;
  }

  async unassignCustomerTag(customerId: string, tagId: string): Promise<Tag> {
    await this.ensureCustomerExists(customerId);

    const tag = await this.tagsRepository.findById(tagId);

    if (tag === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Tag not found' });
    }

    const removed = await this.tagsRepository.unassignCustomerTag(customerId, tagId);

    if (!removed) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Tag not found' });
    }

    return tag;
  }

  async listProjectTags(customerId: string, projectId: string): Promise<{ data: Tag[] }> {
    await this.ensureProjectExists(customerId, projectId);

    return {
      data: await this.tagsRepository.listProjectTags(customerId, projectId)
    };
  }

  async assignProjectTag(customerId: string, projectId: string, tagId: string): Promise<Tag> {
    await this.ensureProjectExists(customerId, projectId);

    const tag = await this.tagsRepository.findById(tagId);

    if (tag === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Tag not found' });
    }

    await this.tagsRepository.assignProjectTag(customerId, projectId, tagId);

    return tag;
  }

  async unassignProjectTag(customerId: string, projectId: string, tagId: string): Promise<Tag> {
    await this.ensureProjectExists(customerId, projectId);

    const tag = await this.tagsRepository.findById(tagId);

    if (tag === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Tag not found' });
    }

    const removed = await this.tagsRepository.unassignProjectTag(customerId, projectId, tagId);

    if (!removed) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Tag not found' });
    }

    return tag;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.tagsRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }

  private async ensureProjectExists(customerId: string, projectId: string): Promise<void> {
    const exists = await this.tagsRepository.projectExists(customerId, projectId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
    }
  }
}
