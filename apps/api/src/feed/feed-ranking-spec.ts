import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { FeedService } from './feed.service';

interface FeedRequest {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
  };
}

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * GET /feed?page=1&limit=10&mode=for-you&session=abc
   *
   * mode:    for-you (default) | following | friends | latest
   * session: client-generated id for one scrolling session. For You
   *          pages with the same session are slices of one ranked list.
   */
  @Get()
  async getFeed(
    @Req() req: FeedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('mode') mode?: string,
    @Query('session') session?: string,
  ) {
    return this.feedService.getFeed({
      viewerId: this.getViewerId(req),
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      mode,
      session,
    });
  }

  private getViewerId(req: FeedRequest): string | undefined {
    const id =
      req?.user?.id ??
      req?.user?._id ??
      req?.user?.userId ??
      req?.user?.sub;

    return id ? String(id) : undefined;
  }
}
