import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PIPELINE_STAGE_VALUES } from '@stoneboyz/domain';
import { z } from 'zod';
import { PipelineService } from './pipeline.service.js';

const pipelineQuerySchema = z.object({
  stage: z.enum(PIPELINE_STAGE_VALUES).optional(),
  ownerUserId: z.string().min(1).optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().min(1).optional()
});

const formatZodError = (error: z.ZodError): Record<string, string[]> => {
  return z.flattenError(error).fieldErrors;
};

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get()
  async getBoard(@Query() query: Record<string, unknown>) {
    const parsed = pipelineQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsed.error)
      });
    }

    return this.pipelineService.getBoard(parsed.data);
  }
}
