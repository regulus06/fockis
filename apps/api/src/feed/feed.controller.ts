import {
  Controller,
  Get,
  Header,
  Query,
  Req,
} from '@nestjs/common';

import { Request } from 'express';
import { FeedService } from './feed.service';
import { FeedDiscoveryService } from './feed-discovery.service';

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
    private readonly discovery: FeedDiscoveryService,
  ) {}

  private viewerOf(request: Request & { user?: { id?: string; _id?: string; userId?: string; sub?: string } }): string | undefined {
    const user = request.user;
    const id = user?.userId ?? user?.id ?? user?._id ?? user?.sub;
    return id ? String(id) : undefined;
  }

  /**
   * GET /feed/discover/trending?limit=8
   * Hashtags from recent posts the viewer may see, with real post counts.
   */
  @Get('discover/trending')
  @Header('Cache-Control', 'no-store')
  trending(@Req() request: Request, @Query('limit') limit?: string) {
    return this.discovery.trending(this.viewerOf(request as any), Number(limit) || 8);
  }

  /**
   * GET /feed/discover/people?limit=6&exclude=<id,id>
   * Accounts to follow: mutual connections first, never already-followed,
   * blocked or the viewer. `exclude` = cards already shown or dismissed.
   */
  @Get('discover/people')
  @Header('Cache-Control', 'no-store')
  people(@Req() request: Request, @Query('limit') limit?: string, @Query('exclude') exclude?: string) {
    return this.discovery.people(this.viewerOf(request as any), {
      limit: Number(limit) || 6,
      exclude: String(exclude ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200),
    });
  }

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
