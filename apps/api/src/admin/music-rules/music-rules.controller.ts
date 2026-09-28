import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  MusicRulesService,
} from './music-rules.service';

import {
  UpdateMusicRulesDto,
} from './dto/update-music-rules.dto';

import {
  SuperAdminGuard,
} from '../safety/super-admin.guard';

@Controller('admin/music/rules')
@UseGuards(SuperAdminGuard)
export class MusicRulesController {

  constructor(
    private readonly musicRulesService:
      MusicRulesService,
  ) {}

  @Get()
  async getRules() {
    return this.musicRulesService.getRules();
  }

  @Put()
  async updateRules(
    @Body() dto: UpdateMusicRulesDto,
    @Req() request: any,
  ) {

    const userId =
      request?.user?._id ||
      request?.user?.id ||
      request?.user?.userId;

    return this.musicRulesService.updateRules(
      dto,
      userId
        ? String(userId)
        : undefined,
    );
  }

  @Post('reset')
  async resetRules(
    @Req() request: any,
  ) {

    const userId =
      request?.user?._id ||
      request?.user?.id ||
      request?.user?.userId;

    return this.musicRulesService.resetRules(
      userId
        ? String(userId)
        : undefined,
    );
  }
}