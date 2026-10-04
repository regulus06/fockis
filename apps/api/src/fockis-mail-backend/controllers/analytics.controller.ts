import {
  Controller,
  Get,
  Param,
  Req,
} from '@nestjs/common';

import {
  AnalyticsService,
} from '../services/analytics.service';

import {
  userIdFrom,
  workspaceFrom,
} from '../services/helpers';

@Controller('fockis-mail/analytics')
export class AnalyticsController {
  constructor(
    private readonly service: AnalyticsService,
  ) {}

  @Get()
  dashboard(
    @Req() req: any,
  ) {
    return this.service.dashboard(
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  @Get('campaigns/:id')
  campaign(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.service.campaign(
      userIdFrom(req),
      workspaceFrom(req),
      id,
    );
  }
}