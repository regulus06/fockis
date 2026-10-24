import {
  Controller,
  Get,
  Header,
  Query,
  Req,
} from '@nestjs/common';

import { Request } from 'express';
import { FeedService } from './feed.service';

/**
 * Authenticated feed endpoint.
 *
 * GET /feed?page=1&limit=20&mode=for-you&session=<optional-session-id>
 *          [&cursor=<nextCursor>]   (following / friends / latest only)
 *          [&excludeEvents=<id,id>] (events already shown this session)
 *          [&lat=<lat>&lng=<lng>]   (viewer location, only if permitted)
 *
 * The response's `events` array holds recommended events to show between
 * this page's posts; `feed` is unchanged.
 *
 * Supported modes are handled by FeedService/feed-ranking.ts:
 * - for-you
 * - following
 * - friends
 * - latest
 *
 * Authentication is supplied by the application's global JwtAuthGuard.
 */
@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async getFeed(
    @Req() request: Request & {
      user?: {
        id?: string;
        _id?: string;
        userId?: string;
        sub?: string;
      };
    },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('mode') mode?: string,
    @Query('session') session?: string,
    @Query('cursor') cursor?: string,
    @Query('excludeEvents') excludeEvents?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const authenticatedUser = request.user;
    const viewerId =
      authenticatedUser?.userId ??
      authenticatedUser?.id ??
      authenticatedUser?._id ??
      authenticatedUser?.sub;

    return this.feedService.getFeed({
      viewerId: viewerId ? String(viewerId) : undefined,
      page: this.parsePositiveInteger(page, 1),
      limit: this.parsePositiveInteger(limit, 20),
      mode,
      session,
      cursor,
      excludeEvents,
      ...this.parseLocation(lat, lng),
    });
  }

  private parseLocation(
    lat: string | undefined,
    lng: string | undefined,
  ): { latitude?: number; longitude?: number } {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (
      lat === undefined ||
      lng === undefined ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return {};
    }

    return { latitude, longitude };
  }

  private parsePositiveInteger(
    value: string | undefined,
    fallback: number,
  ): number {
    if (value === undefined || value.trim() === '') {
      return fallback;
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      return fallback;
    }

    return parsed;
  }
}
