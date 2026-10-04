import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { CampaignsService } from '../services/campaigns.service';

import {
  CreateCampaignDto,
  ScheduleCampaignDto,
  UpdateCampaignDto,
} from '../dto/fockis-mail.dto';

import {
  userIdFrom,
  workspaceFrom,
} from '../services/helpers';

@Controller('fockis-mail/campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
  ) {}

  /**
   * List campaigns for the authenticated owner/workspace.
   */
  @Get()
  list(@Req() req: any) {
    return this.campaignsService.list(
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Get one campaign.
   *
   * NOTE:
   * /campaigns/new is a frontend React route.
   * It should not be requested from this API endpoint.
   */
  @Get(':id')
  get(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.campaignsService.get(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Create campaign.
   */
  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Update campaign.
   */
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(
      id,
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Delete campaign.
   */
  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.campaignsService.remove(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Send campaign immediately.
   */
  @Post(':id/send')
  send(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.campaignsService.send(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Alias for sendNow.
   */
  @Post(':id/send-now')
  sendNow(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.campaignsService.send(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Schedule campaign.
   */
  @Post(':id/schedule')
  schedule(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    return this.campaignsService.schedule(
      id,
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }
}