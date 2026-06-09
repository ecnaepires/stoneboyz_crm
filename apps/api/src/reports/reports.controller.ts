import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Accept only well-formed ISO dates; anything else is ignored (falls back to the
// default trailing-12-months window) rather than reaching SQL as a bad cast.
const coerceDate = (value?: string): string | undefined =>
  value && ISO_DATE.test(value) ? value : undefined;

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-by-month')
  async salesByMonth(@Query('from') from?: string, @Query('to') to?: string) {
    return { data: await this.reportsService.salesByMonth(coerceDate(from), coerceDate(to)) };
  }

  @Get('jobs-by-salesperson')
  async jobsBySalesperson() {
    return { data: await this.reportsService.jobsBySalesperson() };
  }

  @Get('installed-sqft-by-month')
  async installedSqFtByMonth(@Query('from') from?: string, @Query('to') to?: string) {
    return {
      data: await this.reportsService.installedSqFtByMonth(coerceDate(from), coerceDate(to)),
    };
  }

  @Get('installed-sqft-by-week')
  async installedSqFtByWeek(@Query('from') from?: string, @Query('to') to?: string) {
    return {
      data: await this.reportsService.installedSqFtByWeek(coerceDate(from), coerceDate(to)),
    };
  }
}
