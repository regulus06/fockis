import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { RepostsService } from './reposts.service';

@Controller('reposts')
export class RepostsController {
  constructor(private readonly repostsService: RepostsService) {}

  // CREATE REPOST
  @Post()
  create(@Body() body: any) {
    return this.repostsService.createRepost(body);
  }

  // GET FEED
  @Get('feed')
  feed() {
    return this.repostsService.getFeedReposts();
  }

  // USER REPOSTS
  @Get('user/:userId')
  user(@Param('userId') userId: string) {
    return this.repostsService.getUserReposts(userId);
  }
}