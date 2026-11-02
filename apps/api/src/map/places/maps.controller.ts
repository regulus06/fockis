import { Body, Controller, Delete, Get, Header, NotFoundException, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Public } from "../../auth/public.decorator";
import { GeoService, type TravelMode } from "../geo/geo.service";
import { PlanFlightDto, PlanRouteDto, RequestVerificationDto, SaveLocationDto, SaveRouteDto, ShareLocationDto, UpdateLocationDto } from "./places.dto";
import { PlacesService } from "./places.service";

function userIdOf(req: Request): string {
  const user = (req as any).user ?? {};
  return String(user.id || user.userId || user._id || user.sub || "");
}

const num = (v?: string) => (v === undefined || v === "" ? NaN : Number(v));

/**
 * Fockis Maps API (the official address registry stays in MapController).
 *   /map/config, /map/search, /map/reverse, /map/route
 *   /map/places … (the user's Smart Addresses), /map/p-shared/:token
 *   /map/saved-routes …
 */
@Controller("map")
@UseGuards(JwtAuthGuard)
export class MapsController {
  constructor(
    private readonly geo: GeoService,
    private readonly places: PlacesService,
  ) {}

  /* ------------------------------------------------------------ providers */

  @Public()
  @Get("config")
  @Header("Cache-Control", "public, max-age=300")
  config() {
    return this.geo.config();
  }

  @Get("search")
  search(@Req() req: Request, @Query("q") q: string, @Query("lat") lat?: string, @Query("lon") lon?: string, @Query("cc") cc?: string) {
    const near = Number.isFinite(num(lat)) && Number.isFinite(num(lon)) ? { lat: num(lat), lon: num(lon) } : undefined;
    return this.geo.search(userIdOf(req), q, near, cc);
  }

  @Get("reverse")
  reverse(@Query("lat") lat: string, @Query("lon") lon: string) {
    return this.geo.reverse(num(lat), num(lon));
  }

  @Post("flight")
  flight(@Body() dto: PlanFlightDto) {
    return this.geo.flight(dto.origin, dto.destination, { departure: dto.departure, arrival: dto.arrival, language: dto.language });
  }

  @Post("route")
  route(@Body() dto: PlanRouteDto) {
    return this.geo.route(dto.origin, dto.destination, dto.mode as TravelMode, {
      alternatives: dto.alternatives,
      avoidHighways: dto.avoidHighways,
      language: dto.language,
    });
  }

  @Get("businesses")
  businesses(@Query("south") south: string, @Query("west") west: string, @Query("north") north: string, @Query("east") east: string, @Query("category") category?: string) {
    return this.geo.businessesInBounds({ south: num(south), west: num(west), north: num(north), east: num(east) }, category);
  }

  @Get("tiles/traffic/:z/:x/:y")
  async traffic(@Param("z") z: string, @Param("x") x: string, @Param("y") y: string, @Res() res: Response) {
    const tile = await this.geo.trafficTile(Number(z), Number(x), Number(String(y).replace(/\.png$/, "")));
    if (!tile) {
      res.status(204).end();
      return;
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "private, max-age=120");
    res.end(tile);
  }

  @Get("street-view")
  async streetView(@Query("lat") lat: string, @Query("lon") lon: string) {
    return (await this.geo.streetView(num(lat), num(lon))) ?? { available: false };
  }

  /* ------------------------------------------------------------ places */

  @Get("places")
  list(@Req() req: Request, @Query("kind") kind?: string) {
    return this.places.list(userIdOf(req), kind);
  }

  @Post("places")
  create(@Req() req: Request, @Body() dto: SaveLocationDto) {
    return this.places.create(userIdOf(req), dto);
  }

  @Get("places/:id")
  get(@Req() req: Request, @Param("id") id: string) {
    return this.places.get(userIdOf(req), id);
  }

  @Patch("places/:id")
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateLocationDto) {
    return this.places.update(userIdOf(req), id, dto);
  }

  @Delete("places/:id")
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.places.remove(userIdOf(req), id);
  }

  /** Send an address back to Fockis staff after "needs info" or "rejected". */
  @Post("places/:id/verification")
  requestVerification(@Req() req: Request, @Param("id") id: string, @Body() dto: RequestVerificationDto) {
    return this.places.requestVerification(userIdOf(req), id, dto.message);
  }

  @Post("places/:id/share")
  share(@Req() req: Request, @Param("id") id: string, @Body() dto: ShareLocationDto) {
    return this.places.share(userIdOf(req), id, dto?.days ?? 30);
  }

  @Delete("places/:id/share")
  unshare(@Req() req: Request, @Param("id") id: string) {
    return this.places.unshare(userIdOf(req), id);
  }

  /** Anyone with the link can open a shared place (the owner chose to share it). */
  @Public()
  @Get("shared/:token")
  shared(@Param("token") token: string) {
    if (!token) throw new NotFoundException();
    return this.places.shared(token);
  }

  /* ------------------------------------------------------------ saved routes */

  @Get("saved-routes")
  listRoutes(@Req() req: Request) {
    return this.places.listRoutes(userIdOf(req));
  }

  @Post("saved-routes")
  saveRoute(@Req() req: Request, @Body() dto: SaveRouteDto) {
    return this.places.saveRoute(userIdOf(req), dto);
  }

  @Delete("saved-routes/:id")
  removeRoute(@Req() req: Request, @Param("id") id: string) {
    return this.places.removeRoute(userIdOf(req), id);
  }
}
