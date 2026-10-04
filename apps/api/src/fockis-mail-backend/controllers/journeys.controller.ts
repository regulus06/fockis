import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';

import {
  JourneysService,
} from '../services/journeys.service';

import {
  CreateJourneyDto,
} from '../dto/fockis-mail.dto';

import {
  userIdFrom,
  workspaceFrom,
} from '../services/helpers';

@Controller('fockis-mail/journeys')
export class JourneysController {
  constructor(
    private readonly service: JourneysService,
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
    @Body() dto: CreateJourneyDto,
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
    @Body()
    dto: Partial<CreateJourneyDto>,
  ) {
    return this.service.update(
      id,
      dto,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  /**
   * Frontend journey editor uses PUT when saving
   * the complete workflow.
   */
  @Put(':id')
  replace(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    dto: Partial<CreateJourneyDto>,
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
    @Body()
    body: { name?: string },
  ) {
    return this.service.duplicate(
      id,
      userIdFrom(req),
      workspaceFrom(req),
      body?.name,
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