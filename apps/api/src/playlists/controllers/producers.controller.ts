import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';

import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import { ProducersService } from '../services/producers.service';

/**
 * Mounted at:
 *
 * /playlists/producers
 *
 * This matches the frontend playlists API.
 */
@Controller('playlists/producers')
export class ProducersController {
  constructor(
    private readonly producersService: ProducersService,
  ) {}

  // ============================================================
  // FEATURED PRODUCERS
  // ============================================================

  @UseGuards(OptionalJwtAuthGuard)
  @Get('featured')
  getFeatured(
    @CurrentUser() user?: { userId: string },
  ) {
    return this.producersService.getFeatured(
      user?.userId,
    );
  }

  // ============================================================
  // FOLLOW PRODUCER
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  follow(
    @CurrentUser() user: { userId: string },
    @Param('id') producerId: string,
  ) {
    return this.producersService.follow(
      user.userId,
      producerId,
    );
  }

  // ============================================================
  // UNFOLLOW PRODUCER
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  unfollow(
    @CurrentUser() user: { userId: string },
    @Param('id') producerId: string,
  ) {
    return this.producersService.unfollow(
      user.userId,
      producerId,
    );
  }

  // ============================================================
  // GET PRODUCER
  // ============================================================

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':username')
  getByUsername(
    @Param('username') username: string,
    @CurrentUser() user?: { userId: string },
  ) {
    return this.producersService.getByUsername(
      username,
      user?.userId,
    );
  }
}