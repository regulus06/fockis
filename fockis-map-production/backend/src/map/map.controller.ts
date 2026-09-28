import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { MapManagementGuard } from "./map.guard";
import { MapService } from "./map.service";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { CreateAddressRequestDto } from "./dto/create-address-request.dto";

@Controller("map")
@UseGuards(AuthGuard("jwt"))
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get("addresses")
  list(
    @Query("countryCode") countryCode?: string,
    @Query("q") q?: string,
  ) {
    return this.mapService.list(countryCode, q);
  }

  @Get("addresses/:id")
  get(@Param("id") id: string) {
    return this.mapService.get(id);
  }

  @Post("addresses")
  @UseGuards(MapManagementGuard)
  create(@Body() dto: CreateAddressDto, @Req() req: any) {
    return this.mapService.create(dto, req.user);
  }

  @Patch("addresses/:id")
  @UseGuards(MapManagementGuard)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.mapService.update(id, dto);
  }

  @Post("addresses/:id/deactivate")
  @UseGuards(MapManagementGuard)
  deactivate(@Param("id") id: string) {
    return this.mapService.deactivate(id);
  }

  @Post("addresses/:id/units")
  @UseGuards(MapManagementGuard)
  addUnit(
    @Param("id") id: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.mapService.addUnit(id, dto);
  }

  @Post("address-requests")
  createRequest(@Body() dto: CreateAddressRequestDto, @Req() req: any) {
    return this.mapService.createRequest(dto, req.user);
  }

  @Get("address-requests/me")
  myRequests(@Req() req: any) {
    return this.mapService.myRequests(req.user);
  }
}
