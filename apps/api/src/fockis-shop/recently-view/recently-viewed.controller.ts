import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";

import {
  RecentlyViewedService,
} from "./recently-viewed.service";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";


@Controller(
  "marketplace/recently-viewed",
)
@UseGuards(JwtAuthGuard)
export class RecentlyViewedController {

  constructor(
    private readonly recentlyViewedService:
      RecentlyViewedService,
  ) {}


  @Post(":productId")
  addRecentlyViewed(

    @Param("productId")
    productId: string,

    @Req()
    req: any,

  ) {

    const userId =
      req.user?._id ??
      req.user?.id ??
      req.user?.userId;

    return this.recentlyViewedService
      .addRecentlyViewed(
        userId,
        productId,
      );
  }


  @Get()
  getRecentlyViewed(
    @Req()
    req: any,
  ) {

    const userId =
      req.user?._id ??
      req.user?.id ??
      req.user?.userId;

    return this.recentlyViewedService
      .getRecentlyViewed(
        userId,
      );
  }


  @Delete()
  clearRecentlyViewed(
    @Req()
    req: any,
  ) {

    const userId =
      req.user?._id ??
      req.user?.id ??
      req.user?.userId;

    return this.recentlyViewedService
      .clearRecentlyViewed(
        userId,
      );
  }
}