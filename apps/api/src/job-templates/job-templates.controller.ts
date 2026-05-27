import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';
import { JobTemplatesService } from './job-templates.service.js';

const jobTemplateIdSchema = z.string().uuid();

@Controller('job-templates')
export class JobTemplatesController {
  constructor(private readonly jobTemplatesService: JobTemplatesService) {}

  @Get()
  async list() {
    return this.jobTemplatesService.list();
  }

  @Get(':jobTemplateId')
  async getById(@Param('jobTemplateId') jobTemplateId: string) {
    const parsed = jobTemplateIdSchema.safeParse(jobTemplateId);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { jobTemplateId: ['Invalid UUID'] }
      });
    }

    return this.jobTemplatesService.getById(parsed.data);
  }
}
