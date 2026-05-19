import { Controller, Get, Post, Param, HttpCode } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { PortalService } from './portal.service.js';

@Public()
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('quotes/:token')
  getQuote(@Param('token') token: string) {
    return this.portalService.getQuoteByToken(token);
  }

  @Post('quotes/:token/accept')
  @HttpCode(200)
  acceptQuote(@Param('token') token: string) {
    return this.portalService.acceptByToken(token);
  }

  @Post('quotes/:token/reject')
  @HttpCode(200)
  rejectQuote(@Param('token') token: string) {
    return this.portalService.rejectByToken(token);
  }
}
