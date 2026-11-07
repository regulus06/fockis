import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Public } from "../../auth/public.decorator";
import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { RbacGuard } from "../../admin/rbac/rbac.guard";
import type { Actor } from "../../reports/utils/actor";
import { ReviewPublicPlaceDto, SavePublicPlaceDto, UpdatePublicPlaceDto } from "./public-places.dto";
import { PublicPlacesService } from "./public-places.service";

function userIdOf(req: Request): string {
  const user = (req as any).user ?? {};
  return String(user.id || user.userId || user._id || user.sub || "");
}

const num = (v?: string) => (v === undefined || v === "" ? NaN : Number(v));

/**
 * Places anyone can add to Fockis Maps (shown to everyone after review).
 *   GET    /map/public-places?south=&west=&north=&east=&category=   approved, public
 *   GET    /map/public-places/mine                                  my contributions
 *   GET    /map/public-places/:id                                   approved (or mine)
 *   POST   /map/public-places                                       add (goes to review)
 *   PATCH  /map/public-places/:id                                   edit mine (back to review)
 *   DELETE /map/public-places/:id                                   remove mine
 */
@Controller("map/public-places")
@UseGuards(JwtAuthGuard)
export class PublicPlacesController {
  constructor(private readonly publicPlaces: PublicPlacesService) {}

  @Public()
  @Get()
  inBounds(@Query("south") south: string, @Query("west") west: string, @Query("north") north: string, @Query("east") east: string, @Query("category") category?: string) {
    return this.publicPlaces.inBounds({ south: num(south), west: num(west), north: num(north), east: num(east) }, category);
  }

  @Get("mine")
  mine(@Req() req: Request) {
    return this.publicPlaces.mine(userIdOf(req));
  }

  @Get(":id")
  one(@Req() req: Request, @Param("id") id: string) {
    return this.publicPlaces.getOne(id, userIdOf(req));
  }

  @Post()
  create(@Req() req: Request, @Body() dto: SavePublicPlaceDto) {
    return this.publicPlaces.create(userIdOf(req), dto);
  }

  @Patch(":id")
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdatePublicPlaceDto) {
    return this.publicPlaces.update(userIdOf(req), id, dto);
  }

  @Delete(":id")
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.publicPlaces.withdraw(userIdOf(req), id);
  }
}

/**
 * Review queue for places people add (same permissions as Smart Address review).
 *   GET  /admin/map/public-places?status=pending|approved|rejected|removed&q=&country=&page=
 *   GET  /admin/map/public-places/counts
 *   GET  /admin/map/public-places/:id
 *   POST /admin/map/public-places/:id/review   { action: approve|reject|remove, note }
 */
@Controller("admin/map/public-places")
@UseGuards(RbacGuard)
export class PublicPlacesAdminController {
  constructor(private readonly publicPlaces: PublicPlacesService) {}

  @Get()
  @Permissions(Permission.MAP_ADDRESSES_VIEW)
  list(@Query() query: { status?: string; q?: string; country?: string; page?: string }) {
    return this.publicPlaces.adminList(query);
  }

  @Get("counts")
  @Permissions(Permission.MAP_ADDRESSES_VIEW)
  counts() {
    return this.publicPlaces.counts();
  }

  @Get(":id")
  @Permissions(Permission.MAP_ADDRESSES_VIEW)
  detail(@Param("id") id: string) {
    return this.publicPlaces.adminDetail(id);
  }

  @Post(":id/review")
  @Permissions(Permission.MAP_ADDRESSES_VERIFY)
  review(@Req() req: { user: Actor }, @Param("id") id: string, @Body() dto: ReviewPublicPlaceDto) {
    return this.publicPlaces.review(req.user, id, dto.action, dto.note);
  }
}
