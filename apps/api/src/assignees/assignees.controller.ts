import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { createAssigneeSchema } from '@stoneboyz/domain';
import { z } from 'zod';
import { AssigneesRepository } from './assignees.repository.js';

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

@Controller('assignees')
export class AssigneesController {
  constructor(private readonly assigneesRepository: AssigneesRepository) {}

  @Get()
  async list() {
    return this.assigneesRepository.list();
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsedBody = createAssigneeSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.assigneesRepository.create(parsedBody.data);
  }
}
