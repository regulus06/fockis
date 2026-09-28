import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/auth.guard';

import {
  ReviewService,
} from './reviews.service';

@ApiTags('reviews')
@Controller('travel/reviews')
export class ReviewController {
  constructor(
    private readonly service: ReviewService,
  ) {}

  /* ==========================================================================
     PUBLIC — LIST REVIEWS FOR A LISTING
  ========================================================================== */

  @Get('listing/:listingId')
  @ApiOperation({
    summary: 'Get reviews for a Travel listing',
  })
  list(
    @Param('listingId') listingId: string,
  ) {
    return this.service.list(
      listingId,
    );
  }

  /* ==========================================================================
     AUTHENTICATED — CREATE REVIEW
  ========================================================================== */

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a review for a Travel listing',
  })
  create(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.create(
      request.user.sub,
      data,
    );
  }
}