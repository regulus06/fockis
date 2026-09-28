import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { BehaviorService } from './behavior.service';

@Controller('behavior')
export class BehaviorController {
  constructor(private service: BehaviorService) {}

  @Post()
  track(@Body() body: any) {
    return this.service.track(body);
  }

  @Post('watch-time')
  watch(@Body() body: any) {
    return this.service.trackWatchTime(
      body.userId,
      body.contentId,
      body.seconds,
    );
  }

  @Get()
  get(@Query('userId') userId: string) {
    return this.service.getUserBehavior(userId);
  }

  @Get('score')
  score(@Query('contentId') contentId: string) {
    return this.service.getContentScore(contentId);
  }
}