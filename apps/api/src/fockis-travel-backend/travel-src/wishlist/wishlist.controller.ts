import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/auth.guard';

import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('travel/wishlist')
export class WishlistController {
  constructor(
    private readonly service: WishlistService,
  ) {}

  /* ==========================================================================
     GET MY WISHLIST

     GET /travel/wishlist
  ========================================================================== */

  @Get()
  list(@Req() req: any) {
    return this.service.list(
      req.user.sub,
    );
  }

  /* ==========================================================================
     ADD TO WISHLIST

     POST /travel/wishlist/:listingId

     Body:
     {
       "note": "Optional note"
     }
  ========================================================================== */

  @Post(':listingId')
  add(
    @Req() req: any,
    @Param('listingId') listingId: string,
    @Body('note') note?: string,
  ) {
    return this.service.add(
      req.user.sub,
      listingId,
      note,
    );
  }

  /* ==========================================================================
     REMOVE FROM WISHLIST

     DELETE /travel/wishlist/:listingId
  ========================================================================== */

  @Delete(':listingId')
  remove(
    @Req() req: any,
    @Param('listingId') listingId: string,
  ) {
    return this.service.remove(
      req.user.sub,
      listingId,
    );
  }
}