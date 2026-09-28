import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';

import { WavesService } from './waves.service';

@Controller('waves')
export class WavesController {
  constructor(private readonly wavesService: WavesService) {}

  // =========================
  // CREATE
  // =========================
  @Post()
  createWave(@Body() body: any) {
    return this.wavesService.createWave(body);
  }

  // =========================
  // FEED
  // =========================
  @Get('feed')
  getFeed(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.wavesService.getWaves(Number(limit) || 10, cursor);
  }

  // =========================
  // FOR YOU
  // =========================
  @Get('for-you')
  getForYou(@Query('limit') limit?: string) {
    return this.wavesService.getForYouFeed(Number(limit) || 10);
  }

  // =========================
  // SINGLE
  // =========================
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.wavesService.getWaveById(id);
  }

  // =========================
  // LIKE
  // =========================
  @Post(':id/like')
  like(@Param('id') id: string) {
    return this.wavesService.likeWave(id);
  }

  // =========================
  // VIEW
  // =========================
  @Post(':id/view')
  view(@Param('id') id: string) {
    return this.wavesService.addView(id);
  }

  // =========================
  // SHARE
  // =========================
  @Post(':id/share')
  share(@Param('id') id: string) {
    return this.wavesService.shareWave(id);
  }

  // =========================
  // REPOST (FIXED)
  // =========================
  @Post(':id/repost')
  repost(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.wavesService.repostWave({
      waveId: id,
      userId: body.userId,
      type: body.type || 'profile', // profile | group | feed
      groupId: body.groupId,
    });
  }

  // =========================
  // QUOTE WAVE (optional but recommended)
  // =========================
  @Post(':id/quote')
  quote(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.wavesService.quoteWave({
      waveId: id,
      userId: body.userId,
      text: body.text,
    });
  }
}