import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import {
  MusicAnalyticsService,
} from '../services/music-analytics.service';

import {
  AnalyticsQueryDto,
} from '../dto/analytics-query.dto';

import {
  JwtAuthGuard,
} from '../../auth/jwt-auth.guard';

@Controller('music/analytics')
@UseGuards(JwtAuthGuard)
export class MusicAnalyticsController {
  constructor(
    private readonly analyticsService: MusicAnalyticsService,
  ) {}

  /**
   * Record a qualified music play.
   *
   * IMPORTANT:
   * Clicking Play does NOT count as a play.
   *
   * The backend requires the client to report playback progress
   * of at least 50% before creating a MusicPlay event.
   */
  @Post('play')
  async recordQualifiedPlay(
    @Req() req: any,
    @Body()
    body: {
      contentId: string;
      currentTime: number;
      duration: number;
      wasPreview?: boolean;
    },
  ) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Authenticated user is required to record a play.',
      );
    }

    return this.analyticsService.recordQualifiedPlay(
      body.contentId,
      userId,
      body.currentTime,
      body.duration,
      body.wasPreview ?? false,
    );
  }

  /**
   * Producer dashboard analytics.
   *
   * Always scoped to the authenticated producer.
   */
  @Get('dashboard')
  async dashboard(
    @Req() req: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Authenticated user is required.',
      );
    }

    return this.analyticsService.producerDashboard(
      userId,
      query.range,
    );
  }

  /**
   * Analytics for one music content item.
   */
  @Get('content/:contentId')
  async content(
    @Param('contentId') contentId: string,
  ) {
    return this.analyticsService.contentAnalytics(
      contentId,
    );
  }
}