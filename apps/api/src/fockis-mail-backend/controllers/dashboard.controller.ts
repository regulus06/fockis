import {
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';

import { AnalyticsService } from '../services/analytics.service';

import {
  userIdFrom,
  workspaceFrom,
} from '../services/helpers';

@Controller('fockis-mail/dashboard')
export class DashboardController {
  constructor(
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get()
  async getDashboard(
    @Req() req: any,
    @Query('preset') preset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.dashboard(
      userIdFrom(req),
      workspaceFrom(req),
      {
        preset,
        from,
        to,
      },
    );
  }
}