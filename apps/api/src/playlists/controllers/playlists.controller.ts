import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';

// ============================================================
// AUTH
// ============================================================

import { CurrentUser } from '../auth/decorators/current-user.decorator';

import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

// ============================================================
// SERVICES
// ============================================================

import { PlaylistsService } from '../services/playlists.service';
import { ProducersService } from '../services/producers.service';

// ============================================================
// DTOs
// ============================================================

import { AddPlaylistItemDto } from '../auth/dto/add-playlist-item.dto';
import { CreatePlaylistDto } from '../auth/dto/create-playlist.dto';
import { PurchasePlaylistDto } from '../auth/dto/purchase-playlist.dto';
import { QueryPlaylistsDto } from '../auth/dto/query-playlists.dto';
import { UpdatePlaylistDto } from '../auth/dto/update-playlist.dto';

// ============================================================
// HELPERS
// ============================================================

function resolveUploadedCoverUrl(
  file?: Express.Multer.File,
): string | undefined {
  if (!file) {
    return undefined;
  }

  return `/uploads/${file.filename}`;
}

// ============================================================
// CONTROLLER
// ============================================================

@Controller('playlists')
export class PlaylistsController {
  constructor(
    private readonly playlistsService: PlaylistsService,
    private readonly producersService: ProducersService,
  ) {}

  // ============================================================
  // DISCOVERY
  // ============================================================

  @UseGuards(OptionalJwtAuthGuard)
  @Get('featured')
  getFeatured(
    @CurrentUser() user?: { userId: string },
  ) {
    return this.playlistsService.getFeatured({
      userId: user?.userId,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('premium')
  getPremium(
    @CurrentUser() user?: { userId: string },
  ) {
    return this.playlistsService.getPremium({
      userId: user?.userId,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  search(
    @Query() query: QueryPlaylistsDto,
    @CurrentUser() user?: { userId: string },
  ) {
    return this.playlistsService.search(query, {
      userId: user?.userId,
    });
  }

  // ============================================================
  // CURRENT USER
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get('me/library')
  getMyLibrary(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryPlaylistsDto,
  ) {
    return this.playlistsService.getMyLibrary(
      user.userId,
      query,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/favorites')
  getMyFavorites(
    @CurrentUser() user: { userId: string },
  ) {
    return this.playlistsService.getMyFavorites(
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/favorite-producers')
  getMyFavoriteProducers(
    @CurrentUser() user: { userId: string },
  ) {
    return this.producersService.getMyFavoriteProducers(
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/recent')
  getMyRecentlyPlayed(
    @CurrentUser() user: { userId: string },
  ) {
    return this.playlistsService.getMyRecentlyPlayed(
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/created')
  getMyPlaylists(
    @CurrentUser() user: { userId: string },
  ) {
    return this.playlistsService.getMyPlaylists(
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/stats')
  getMyCreatorStats(
    @CurrentUser() user: { userId: string },
  ) {
    return this.playlistsService.getMyCreatorStats(
      user.userId,
    );
  }

  // ============================================================
  // GET PLAYLIST BY ID
  // ============================================================

  @UseGuards(OptionalJwtAuthGuard)
  @Get('id/:id')
  getById(
    @Param('id') id: string,
    @CurrentUser() user?: { userId: string },
  ) {
    return this.playlistsService.getById(
      id,
      {
        userId: user?.userId,
      },
    );
  }

  // ============================================================
  // CREATE PLAYLIST
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('coverImageFile'),
  )
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreatePlaylistDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const coverImageUrl =
      resolveUploadedCoverUrl(file);

    return this.playlistsService.create(
      user.userId,
      dto,
      coverImageUrl,
    );
  }

  // ============================================================
  // GET PLAYLIST BY SLUG
  // ============================================================

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  getBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: { userId: string },
  ) {
    return this.playlistsService.getBySlug(
      slug,
      {
        userId: user?.userId,
      },
    );
  }

  // ============================================================
  // UPDATE PLAYLIST
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('coverImageFile'),
  )
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const coverImageUrl =
      resolveUploadedCoverUrl(file);

    return this.playlistsService.update(
      user.userId,
      id,
      dto,
      coverImageUrl,
    );
  }

  // ============================================================
  // DELETE PLAYLIST
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.playlistsService.remove(
      user.userId,
      id,
    );
  }

  // ============================================================
  // PUBLISH
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  publish(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.playlistsService.publish(
      user.userId,
      id,
    );
  }

  // ============================================================
  // UNPUBLISH
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/unpublish')
  unpublish(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.playlistsService.unpublish(
      user.userId,
      id,
    );
  }

  // ============================================================
  // DUPLICATE
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.playlistsService.duplicate(
      user.userId,
      id,
    );
  }

  // ============================================================
  // ADD TRACK
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/tracks')
  addTrack(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: AddPlaylistItemDto,
  ) {
    return this.playlistsService.addTrack(
      user.userId,
      id,
      dto,
    );
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get(':id/analytics')
  getAnalytics(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.playlistsService.getAnalytics(
      user.userId,
      id,
    );
  }

  // ============================================================
  // PURCHASE / UNLOCK
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/unlock')
  unlock(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() _dto: PurchasePlaylistDto,
  ) {
    return this.playlistsService.unlock(
      user.userId,
      id,
    );
  }

  // ============================================================
  // LIBRARY
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/library')
  addToLibrary(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.playlistsService.addToLibrary(
      user.userId,
      id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/library')
  removeFromLibrary(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.playlistsService.removeFromLibrary(
      user.userId,
      id,
    );
  }

  // ============================================================
  // FAVORITES
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/favorite')
  favorite(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.playlistsService.favorite(
      user.userId,
      id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/favorite')
  unfavorite(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.playlistsService.unfavorite(
      user.userId,
      id,
    );
  }

  // ============================================================
  // RECORD PLAY
  // ============================================================

  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/plays')
  recordPlay(
    @Param('id') id: string,
    @Body('trackId') trackId: string,
    @CurrentUser() user?: { userId: string },
  ) {
    return this.playlistsService.recordPlay(
      user?.userId,
      id,
      trackId,
    );
  }
}