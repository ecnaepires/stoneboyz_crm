import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { archiveTagSchema, createTagSchema, listTagsSchema, updateTagSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { TagsService } from './tags.service.js';

const tagIdSchema = z.string().uuid();
const customerIdSchema = z.string().uuid();
const projectIdSchema = z.string().uuid();
const tagAssignmentSchema = z.object({ tagId: z.string().uuid() });

const badRequest = (details: Record<string, string[]>): BadRequestException =>
  new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  });

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

const parseBoolean = (value: unknown): unknown => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
};

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const parsed = listTagsSchema.safeParse({
      ...query,
      includeArchived: parseBoolean(query['includeArchived'])
    });

    if (!parsed.success) {
      throw badRequest(formatZodError(parsed.error));
    }

    return this.tagsService.list(parsed.data.includeArchived);
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createTagSchema.safeParse(body);

    if (!parsed.success) {
      throw badRequest(formatZodError(parsed.error));
    }

    return this.tagsService.create(parsed.data);
  }

  @Get(':tagId')
  async getById(@Param('tagId') tagId: string) {
    const parsedTagId = tagIdSchema.safeParse(tagId);

    if (!parsedTagId.success) {
      throw badRequest({ tagId: ['Invalid UUID'] });
    }

    return this.tagsService.getById(parsedTagId.data);
  }

  @Patch(':tagId')
  async update(@Param('tagId') tagId: string, @Body() body: unknown) {
    const parsedTagId = tagIdSchema.safeParse(tagId);

    if (!parsedTagId.success) {
      throw badRequest({ tagId: ['Invalid UUID'] });
    }

    const parsedBody = updateTagSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.tagsService.update(parsedTagId.data, parsedBody.data);
  }

  @Delete(':tagId')
  @HttpCode(200)
  async archive(@Param('tagId') tagId: string, @Body() body: unknown) {
    const parsedTagId = tagIdSchema.safeParse(tagId);

    if (!parsedTagId.success) {
      throw badRequest({ tagId: ['Invalid UUID'] });
    }

    const parsedBody = archiveTagSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.tagsService.archive(parsedTagId.data, parsedBody.data.actorUserId);
  }
}

@Controller('customers/:customerId/tags')
export class CustomerTagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(@Param('customerId') customerId: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    return this.tagsService.listCustomerTags(parsedCustomerId.data);
  }

  @Post()
  async assign(@Param('customerId') customerId: string, @Body() body: unknown) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    const parsedBody = tagAssignmentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.tagsService.assignCustomerTag(parsedCustomerId.data, parsedBody.data.tagId);
  }

  @Delete()
  @HttpCode(200)
  async unassign(@Param('customerId') customerId: string, @Body() body: unknown) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);

    if (!parsedCustomerId.success) {
      throw badRequest({ customerId: ['Invalid UUID'] });
    }

    const parsedBody = tagAssignmentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.tagsService.unassignCustomerTag(parsedCustomerId.data, parsedBody.data.tagId);
  }
}

@Controller('customers/:customerId/projects/:projectId/tags')
export class ProjectTagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(@Param('customerId') customerId: string, @Param('projectId') projectId: string) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedCustomerId.success || !parsedProjectId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {})
      });
    }

    return this.tagsService.listProjectTags(parsedCustomerId.data, parsedProjectId.data);
  }

  @Post()
  async assign(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedCustomerId.success || !parsedProjectId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {})
      });
    }

    const parsedBody = tagAssignmentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.tagsService.assignProjectTag(
      parsedCustomerId.data,
      parsedProjectId.data,
      parsedBody.data.tagId
    );
  }

  @Delete()
  @HttpCode(200)
  async unassign(
    @Param('customerId') customerId: string,
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ) {
    const parsedCustomerId = customerIdSchema.safeParse(customerId);
    const parsedProjectId = projectIdSchema.safeParse(projectId);

    if (!parsedCustomerId.success || !parsedProjectId.success) {
      throw badRequest({
        ...(!parsedCustomerId.success ? { customerId: ['Invalid UUID'] } : {}),
        ...(!parsedProjectId.success ? { projectId: ['Invalid UUID'] } : {})
      });
    }

    const parsedBody = tagAssignmentSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.tagsService.unassignProjectTag(
      parsedCustomerId.data,
      parsedProjectId.data,
      parsedBody.data.tagId
    );
  }
}
