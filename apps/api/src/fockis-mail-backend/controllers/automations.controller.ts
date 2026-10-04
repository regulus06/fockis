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

import {
  AutomationsService,
} from '../services/automations.service';

import {
  CreateAutomationDto,
} from '../dto/fockis-mail.dto';

import {
  userIdFrom,
  workspaceFrom,
} from '../services/helpers';

@Controller('fockis-mail/automations')
export class AutomationsController {
  constructor(
    private readonly service: AutomationsService,
  ) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  @Get(':id')
  get(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.service.get(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.service.create(
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Creates a persistent automation and
   * its corresponding journey.
   *
   * The frontend sends the selected template's
   * steps as `steps` or `nodes`.
   */
  @Post('from-template')
  createFromTemplate(
    @Req() req: any,
    @Body()
    body: {
      templateId?: string;
      name: string;
      trigger: string;
      steps?: any[];
      nodes?: any[];
      edges?: any[];
    },
  ) {
    return this.service.createFromTemplate(
      body,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    dto: Partial<CreateAutomationDto>,
  ) {
    return this.service.update(
      id,
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  @Post(':id/duplicate')
  duplicate(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.service.duplicate(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.service.remove(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }
}