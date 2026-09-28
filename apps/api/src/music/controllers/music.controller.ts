import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { MusicService } from '../services/music.service';
import { MusicEntitlementService } from '../services/music-entitlement.service';
import { MusicRankingService } from '../services/music-ranking.service';
import { MusicMediaProcessingService } from '../services/music-media-processing.service';

import { CreateMusicDto } from '../dto/create-music.dto';
import { UpdateMusicDto } from '../dto/update-music.dto';
import { MusicQueryDto } from '../dto/music-query.dto';

import { MusicOwnerGuard } from '../guards/music-owner.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Public } from '../../auth/public.decorator';

@Controller('music')
export class MusicController {
  constructor(
    private readonly musicService: MusicService,
    private readonly entitlementService: MusicEntitlementService,
    private readonly rankingService: MusicRankingService,
    private readonly mediaProcessingService: MusicMediaProcessingService,
  ) {}

  // ===========================================================================
  // MUSIC HOME
  // ===========================================================================

  @Public()
  @Get()
  async home() {
    const [
      featuredResult,
      trending,
      topMusic,
      topVideos,
      topEarning,
      rising,
      newReleases,
      free,
    ] = await Promise.all([
      this.musicService.query({
        sort: 'trending',
        limit: 12,
        offset: 0,
      } as MusicQueryDto),

      this.rankingService.trending(5),
      this.rankingService.topMusic(5),
      this.rankingService.topVideos(5),
      this.rankingService.topEarning(5),
      this.rankingService.rising(5),
      this.rankingService.newReleases(12),
      this.rankingService.freeMusic(12),
    ]);

    return {
      items: featuredResult.items,
      total: featuredResult.total,
      limit: featuredResult.limit,
      offset: featuredResult.offset,

      featured: featuredResult.items,
      trending,
      topMusic,
      topVideos,
      topEarning,
      rising,
      newReleases,
      free,
    };
  }

  // ===========================================================================
  // CHARTS
  // ===========================================================================

  @Public()
  @Get('charts')
  async charts(
    @Query('type') type = 'trending',
    @Query('limit') limitParam = '5',
  ) {
    const parsedLimit = Math.min(
      Math.max(Number(limitParam) || 5, 1),
      100,
    );

    switch (type) {
      case 'top_music':
        return {
          type,
          items: await this.rankingService.topMusic(
            parsedLimit,
          ),
        };

      case 'top_videos':
        return {
          type,
          items: await this.rankingService.topVideos(
            parsedLimit,
          ),
        };

      case 'top_earning':
        return {
          type,
          items: await this.rankingService.topEarning(
            parsedLimit,
          ),
        };

      case 'rising':
        return {
          type,
          items: await this.rankingService.rising(
            parsedLimit,
          ),
        };

      case 'new':
      case 'newest':
        return {
          type: 'new',
          items: await this.rankingService.newReleases(
            parsedLimit,
          ),
        };

      case 'free':
        return {
          type,
          items: await this.rankingService.freeMusic(
            parsedLimit,
          ),
        };

      case 'trending':
      default:
        return {
          type: 'trending',
          items: await this.rankingService.trending(
            parsedLimit,
          ),
        };
    }
  }

  // ===========================================================================
  // EXPLORE
  // ===========================================================================

  @Public()
  @Get('explore')
  async explore(
    @Query() query: MusicQueryDto,
  ) {
    return this.musicService.query(query);
  }

  // ===========================================================================
  // TRACKS
  // ===========================================================================

  @Public()
  @Get('tracks')
  async tracks(
    @Query() query: MusicQueryDto,
  ) {
    return this.musicService.query({
      ...query,
      type: query.type ?? 'song',
    } as MusicQueryDto);
  }

  // ===========================================================================
  // VIDEOS
  // ===========================================================================

  @Public()
  @Get('videos')
  async videos(
    @Query() query: MusicQueryDto,
  ) {
    return this.musicService.query({
      ...query,
      type: query.type ?? 'music_video',
    } as MusicQueryDto);
  }

  // ===========================================================================
  // ALBUMS
  // ===========================================================================

  @Public()
  @Get('albums')
  async albums(
    @Query() query: MusicQueryDto,
  ) {
    return this.musicService.query({
      ...query,
      type: 'album',
    } as MusicQueryDto);
  }

  // ===========================================================================
  // CREATE
  // ===========================================================================

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: any,
    @Body() dto: CreateMusicDto,
  ) {
    const userId =
      this.getAuthenticatedUserId(req);

    const content =
      await this.musicService.create(
        userId,
        dto,
      );

    if (
      String(content.status).toLowerCase() ===
      'processing'
    ) {
      this.startBackgroundProcessing(
        content,
      );
    }

    return this.serializeContent(
      content,
    );
  }

  // ===========================================================================
  // PROCESS
  // ===========================================================================

  @Post(':id/process')
  @UseGuards(
    JwtAuthGuard,
    MusicOwnerGuard,
  )
  async process(
    @Param('id') id: string,
  ) {
    const content =
      await this.musicService.findById(
        id,
      );

    this.startBackgroundProcessing(
      content,
    );

    return {
      success: true,
      message:
        'Music media processing has been started.',
      contentId: String(
        content._id,
      ),
    };
  }

  // ===========================================================================
  // FIND ONE
  // ===========================================================================

  @Public()
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const content =
      await this.musicService.findById(
        id,
      );

    const userId =
      req.user?.id ??
      req.user?._id ??
      req.user?.userId ??
      null;

    const access =
      await this.entitlementService.resolveAccess(
        id,
        userId,
      );

    return {
      content:
        this.serializeContent(
          content,
        ),
      access,
    };
  }

  // ===========================================================================
  // UPDATE
  // ===========================================================================

  @Patch(':id')
  @UseGuards(
    JwtAuthGuard,
    MusicOwnerGuard,
  )
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateMusicDto,
  ) {
    const userId =
      this.getAuthenticatedUserId(req);

    const result =
      await this.musicService.update(
        id,
        userId,
        dto,
      );

    return {
      ...this.serializeContent(
        result.content,
      ),

      mediaChanged:
        result.mediaChanged,
    };
  }

  // ===========================================================================
  // DELETE
  // ===========================================================================

  @Delete(':id')
  @UseGuards(
    JwtAuthGuard,
    MusicOwnerGuard,
  )
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId =
      this.getAuthenticatedUserId(req);

    await this.musicService.delete(
      id,
      userId,
    );

    return {
      success: true,
      contentId: id,
      message:
        'Music content deleted successfully.',
    };
  }

  // ===========================================================================
  // PREVIEW PLAY
  // ===========================================================================

  @Public()
  @Post(':id/preview')
  async trackPreviewPlay(
    @Param('id') id: string,
  ) {
    await this.musicService.recordPlay(
      id,
    );

    return {
      success: true,
    };
  }

  // ===========================================================================
  // ACCESS
  // ===========================================================================

  @Get(':id/access')
  @UseGuards(JwtAuthGuard)
  async getAccess(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId =
      this.getAuthenticatedUserId(req);

    const access =
      await this.entitlementService.resolveAccess(
        id,
        userId,
      );

    console.log(
      '[MusicAccess] Access resolved:',
      {
        contentId: id,
        userId,
        level: access?.level,
        reason: access?.reason,
        accessType: access?.accessType,
      },
    );

    return access;
  }

  // ===========================================================================
  // SHARE
  // ===========================================================================

  @Public()
  @Post(':id/share')
  async share(
    @Param('id') id: string,
  ) {
    await this.musicService.recordShare(
      id,
    );

    return {
      success: true,
    };
  }

  // ===========================================================================
  // SERIALIZE CONTENT
  // ===========================================================================

  private serializeContent(
    content: any,
  ): any {
    if (!content) {
      return content;
    }

    const raw =
      typeof content.toObject === 'function'
        ? content.toObject()
        : {
            ...content,
          };

    // -------------------------------------------------------------------------
    // COVER IMAGE
    // -------------------------------------------------------------------------

    const coverStorageKey =
      String(
        raw.coverImage?.storageKey ?? '',
      ).trim();

    const coverImageUrl =
      coverStorageKey
        ? `/uploads/${coverStorageKey}`
        : undefined;

    // -------------------------------------------------------------------------
    // SERIALIZED RESPONSE
    // -------------------------------------------------------------------------

    const serialized = {
      ...raw,

      coverImageUrl,

      thumbnailUrl:
        coverImageUrl,

      media: raw.media
        ? {
            ...raw.media,
          }
        : raw.media,

      previewMedia:
        raw.previewMedia
          ? {
              ...raw.previewMedia,
            }
          : raw.previewMedia,
    };

    // -------------------------------------------------------------------------
    // NEVER EXPOSE PROTECTED MEDIA STORAGE KEYS
    // -------------------------------------------------------------------------

    if (serialized.media) {
      delete serialized.media.storageKey;
    }

    if (serialized.previewMedia) {
      delete serialized.previewMedia.storageKey;
    }

    // -------------------------------------------------------------------------
    // COVER STORAGE KEY IS INTERNAL
    // -------------------------------------------------------------------------

    delete serialized.coverImage;

    return serialized;
  }

  // ===========================================================================
  // BACKGROUND PROCESSING
  // ===========================================================================

  private startBackgroundProcessing(
    content: any,
  ): void {
    const contentId =
      String(
        content?._id ??
          content?.id ??
          '',
      ).trim();

    if (!contentId) {
      console.error(
        '[MusicController] Cannot start processing without content ID.',
      );

      return;
    }

    console.log(
      `[MusicController] Starting background media processing for ${contentId}`,
    );

    void this.mediaProcessingService
      .process(content)
      .then(() => {
        console.log(
          `[MusicController] Background media processing completed for ${contentId}`,
        );
      })
      .catch((error) => {
        console.error(
          `[MusicController] Background media processing failed for ${contentId}:`,
          error,
        );
      });
  }

  // ===========================================================================
  // AUTHENTICATED USER
  // ===========================================================================

  private getAuthenticatedUserId(
    req: any,
  ): string {
    const userId =
      String(
        req.user?.id ??
          req.user?._id ??
          req.user?.userId ??
          req.user?.sub ??
          '',
      ).trim();

    if (!userId) {
      throw new Error(
        'Authenticated user ID is missing.',
      );
    }

    return userId;
  }
}