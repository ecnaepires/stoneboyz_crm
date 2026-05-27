import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateIssueInput, Issue, ListIssuesInput, UpdateIssueInput } from '@stoneboyz/domain';
import { IssuesRepository, InvalidIssueCursorError } from './issues.repository.js';

@Injectable()
export class IssuesService {
  constructor(private readonly issuesRepository: IssuesRepository) {}

  async list(customerId: string, input: ListIssuesInput): Promise<{ data: Issue[]; hasMore: boolean; nextCursor: string | null }> {
    await this.ensureProjectExists(customerId, input.projectId);

    try {
      return await this.issuesRepository.list(customerId, {
        ...input,
        limit: input.limit ?? 25
      });
    } catch (error) {
      if (error instanceof InvalidIssueCursorError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { cursor: ['Invalid cursor'] }
        });
      }

      throw error;
    }
  }

  async create(customerId: string, projectId: string, input: CreateIssueInput): Promise<Issue> {
    await this.ensureProjectExists(customerId, projectId);

    if (input.phaseId !== undefined) {
      await this.ensurePhaseExists(customerId, projectId, input.phaseId);
    }

    return this.issuesRepository.create(customerId, projectId, input);
  }

  async getById(customerId: string, projectId: string, issueId: string): Promise<Issue> {
    await this.ensureProjectExists(customerId, projectId);

    const issue = await this.issuesRepository.findById(customerId, projectId, issueId);

    if (issue === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Issue not found' });
    }

    return issue;
  }

  async update(customerId: string, projectId: string, issueId: string, input: UpdateIssueInput): Promise<Issue> {
    await this.ensureProjectExists(customerId, projectId);

    const issue = await this.issuesRepository.update(customerId, projectId, issueId, input);

    if (issue === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Issue not found' });
    }

    return issue;
  }

  async archive(customerId: string, projectId: string, issueId: string, actorUserId: string): Promise<Issue> {
    await this.ensureProjectExists(customerId, projectId);

    const issue = await this.issuesRepository.archive(customerId, projectId, issueId, actorUserId);

    if (issue === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Issue not found' });
    }

    return issue;
  }

  private async ensureProjectExists(customerId: string, projectId: string): Promise<void> {
    const exists = await this.issuesRepository.projectExists(customerId, projectId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
    }
  }

  private async ensurePhaseExists(customerId: string, projectId: string, phaseId: string): Promise<void> {
    const exists = await this.issuesRepository.phaseExists(customerId, projectId, phaseId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Phase not found' });
    }
  }
}
