import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  archiveJobNoteSchema,
  createJobNoteSchema,
  updateJobNoteSchema
} from '@stoneboyz/domain';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JobNotesService } from './job-notes.service.js';

const customerIdSchema = z.string().uuid();
const projectIdSchema = z.string().uuid();
const noteIdSchema = z.string().uuid();

const formatZodError = (error: z.ZodError): Record<string, string[]> => {
  return z.flattenError(error).fieldErrors;
};

const badRequest = (details: Record<string, string[]>): BadRequestException => {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  });
};

@Controller('customers/:customerId/projects/:projectId/notes')
export class JobNotesController {
  constructor(private readonly jobNotesService: JobNotesService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Param('projectId') projectId: string) {
    const { parsedCustomerId, parsedProjectId } = this.parseCustomerProjectIds(customerId, projectId);

    return this.jobNotesService.list(parsedCustomerId, parsedProjectId);
  }

  @Post()
  async create(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedProjectId } = this.parseCustomerProjectIds(customerId, projectId);
    const parsedBody = createJobNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.jobNotesService.create(parsedCustomerId, parsedProjectId, { ...parsedBody.data, actorUserId });
  }

  @Patch(':noteId')
  async update(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedProjectId, parsedNoteId } = this.parseCustomerProjectNoteIds(customerId, projectId, noteId);
    const parsedBody = updateJobNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.jobNotesService.update(parsedCustomerId, parsedProjectId, parsedNoteId, { ...parsedBody.data, actorUserId });
  }

  @Delete(':noteId')
  @HttpCode(200)
  async archive(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string
  ) {
    const { parsedCustomerId, parsedProjectId, parsedNoteId } = this.parseCustomerProjectNoteIds(customerId, projectId, noteId);
    const parsedBody = archiveJobNoteSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.jobNotesService.archive(parsedCustomerId, parsedProjectId, parsedNoteId, { ...parsedBody.data, actorUserId });
  }

  private parseCustomerProjectIds(customerId: string, projectId: string): { parsedCustomerId: string; parsedProjectId: string } {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedCustomerId.success || !parsedProjectId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {})
      });
    }

    return { parsedCustomerId: parsedCustomerId.data, parsedProjectId: parsedProjectId.data };
  }

  private parseCustomerProjectNoteIds(
    customerId: string,
    projectId: string,
    noteId: string
  ): { parsedCustomerId: string; parsedProjectId: string; parsedNoteId: string } {
    const { parsedCustomerId, parsedProjectId } = this.parseCustomerProjectIds(customerId, projectId);
    const parsedNoteId = noteIdSchema.safeParse(noteId);

    if (!parsedNoteId.success) {
      throw badRequest({ noteId: ['Invalid UUID'] });
    }

    return { parsedCustomerId, parsedProjectId, parsedNoteId: parsedNoteId.data };
  }
}
