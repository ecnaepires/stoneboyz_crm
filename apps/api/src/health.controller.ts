import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator.js';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

@Controller('health')
@Public()
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
