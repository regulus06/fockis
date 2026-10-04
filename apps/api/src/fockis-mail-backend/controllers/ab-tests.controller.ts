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

import { AbTestsService } from '../services/ab-tests.service';

import {
  CreateAbTestDto,
  UpdateAbTestDto,
} from '../dto/fockis-mail.dto';

import {
  userIdFrom,
  workspaceFrom,
} from '../services/helpers';

@Controller('fockis-mail/analytics/ab-tests')
export class AbTestsController {
  constructor(
    private readonly service: AbTestsService,
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
    @Body() dto: CreateAbTestDto,
  ) {
    return this.service.create(
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAbTestDto,
  ) {
    return this.service.update(
      id,
      dto,
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