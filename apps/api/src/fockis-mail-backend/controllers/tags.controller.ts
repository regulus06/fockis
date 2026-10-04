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

import { TagsService } from '../services/tags.service';

import {
  userIdFrom,
  workspaceFrom,
} from '../services/helpers';

@Controller('fockis-mail/tags')
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
  ) {}

  @Get()
  list(@Req() req: any) {
    return this.tagsService.list(
      userIdFrom(req),
      workspaceFrom(req),
    );
  }

  @Post()
  create(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      color?: string;
    },
  ) {
    return this.tagsService.create(
      userIdFrom(req),
      workspaceFrom(req),
      body,
    );
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      color?: string;
    },
  ) {
    return this.tagsService.update(
      id,
      userIdFrom(req),
      workspaceFrom(req),
      body,
    );
  }

  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.tagsService.remove(
      id,
      userIdFrom(req),
      workspaceFrom(req),
    );
  }
}