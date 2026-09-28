import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { MusicService } from '../services/music.service';
import { MusicQueryDto } from '../dto/music-query.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ProducerService } from '../services/producer.service';

@Controller('music/producers')
export class ProducerMusicController {
  constructor(
    private readonly musicService: MusicService,
    private readonly producerService: ProducerService,
  ) {}

  // ============================================================
  // PRODUCER'S OWN CONTENT
  // ============================================================
  // IMPORTANT:
  // This route MUST come before @Get(':producerId')
  // so "me" is not interpreted as a producerId.
  // ============================================================

  @Get('me/content')
  @UseGuards(JwtAuthGuard)
  async myContent(@Req() req: any) {
    await this.producerService.requireApprovedProducer(
      req.user.id,
    );

    return this.musicService.listForProducer(
      req.user.id,
      true,
    );
  }

  // ============================================================
  // PUBLIC PRODUCER STOREFRONT
  // ============================================================

  @Get(':producerId')
  async storefront(
    @Param('producerId') producerId: string,
    @Query() query: MusicQueryDto,
  ) {
    return this.musicService.query({
      ...query,
      producerId,
    });
  }
}