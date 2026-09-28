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
  SetMetadata,
  UseGuards,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiTags,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/auth.guard";

import {
  CreateListingDto,
  UpdateListingDto,
} from "./dto";

import { ListingsService } from "./listings.service";

/**
 * ============================================================================
 * PUBLIC ROUTE METADATA
 * ============================================================================
 */

export const IS_PUBLIC_KEY = "isPublic";

export const Public = () =>
  SetMetadata(IS_PUBLIC_KEY, true);

/**
 * ============================================================================
 * LISTINGS CONTROLLER
 * ============================================================================
 */

@ApiTags("listings")
@Controller("travel/listings")
export class ListingsController {
  constructor(
    private readonly service: ListingsService,
  ) {}

  /* ==========================================================================
     PUBLIC SEARCH LISTINGS

     GET /travel/listings
  ========================================================================== */

  @Public()
  @Get()
  search(
    @Query("type") type?: string,
    @Query("category") category?: string,
    @Query("city") city?: string,
    @Query("country") country?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("text") text?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
    @Query("pickupDate") pickupDate?: string,
    @Query("dropoffDate") dropoffDate?: string,
  ) {
    return this.service.search({
      type,
      category,
      city,
      country,
      minPrice,
      maxPrice,
      text,
      limit,
      skip,
      pickupDate,
      dropoffDate,
    });
  }

  /* ==========================================================================
     PUBLIC FIND ONE LISTING

     GET /travel/listings/:id
  ========================================================================== */

  @Public()
  @Get(":id")
  find(
    @Param("id") id: string,
  ) {
    return this.service.findOne(id);
  }

  /* ==========================================================================
     CREATE LISTING

     POST /travel/listings

     The authenticated MongoDB User._id is used as partnerId.
  ========================================================================== */

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(
    @Body() dto: CreateListingDto,
    @Req() req: any,
  ) {
    const userId =
      this.getAuthenticatedUserId(req);

    return this.service.create(
      dto,
      userId,
    );
  }

  /* ==========================================================================
     UPDATE LISTING

     PATCH /travel/listings/:id

     The authenticated partner ID is passed to the service so the service
     can verify ownership before modifying the listing.
  ========================================================================== */

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param("id") id: string,
    @Body() dto: UpdateListingDto,
    @Req() req: any,
  ) {
    const userId =
      this.getAuthenticatedUserId(req);

    return this.service.update(
      id,
      dto,
      userId,
    );
  }

  /* ==========================================================================
     DELETE LISTING

     DELETE /travel/listings/:id

     The authenticated partner ID is passed to the service so the service
     can verify ownership before deactivating the listing.
  ========================================================================== */

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    const userId =
      this.getAuthenticatedUserId(req);

    return this.service.remove(
      id,
      userId,
    );
  }

  /* ==========================================================================
     AUTHENTICATED USER ID

     JwtStrategy may expose the authenticated MongoDB user ID as:

       sub
       id
       userId
       _id

     sub is preferred because it is the canonical JWT subject.
  ========================================================================== */

  private getAuthenticatedUserId(
    req: any,
  ): string {
    const userId =
      req?.user?.sub ??
      req?.user?.id ??
      req?.user?.userId ??
      req?.user?._id;

    if (!userId) {
      throw new Error(
        "Authenticated user ID is missing.",
      );
    }

    return String(userId);
  }
}