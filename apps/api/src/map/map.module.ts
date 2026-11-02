import { Module } from "@nestjs/common";

import { MongooseModule } from "@nestjs/mongoose";

import { MapController } from "./map.controller";

import { MapService } from "./map.service";

import {
  MapPermissionGuard,
  MapManagementGuard,
} from "./map.guard";

import {
  FockisAddress,
  FockisAddressSchema,
} from "./schemas/fockis-address.schema";

import {
  AddressRequest,
  AddressRequestSchema,
} from "./schemas/address-request.schema";

import { GeoService } from "./geo/geo.service";
import { PlacesService } from "./places/places.service";
import { MapsController } from "./places/maps.controller";
import { AddressVerificationController } from "./places/address-verification.controller";
import { AddressVerificationService } from "./places/address-verification.service";
import { NotificationsModule } from "../notifications/notifications.module";
import {
  MapCounter,
  MapCounterSchema,
  SavedLocation,
  SavedLocationSchema,
  SavedRoute,
  SavedRouteSchema,
} from "./places/place.schemas";

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      {
        name: FockisAddress.name,
        schema: FockisAddressSchema,
      },
      {
        name: AddressRequest.name,
        schema: AddressRequestSchema,
      },
      { name: SavedLocation.name, schema: SavedLocationSchema },
      { name: MapCounter.name, schema: MapCounterSchema },
      { name: SavedRoute.name, schema: SavedRouteSchema },
    ]),
  ],

  controllers: [
    MapController,
    MapsController,
    AddressVerificationController,
  ],

  providers: [
    MapService,
    MapPermissionGuard,
    MapManagementGuard,
    GeoService,
    PlacesService,
    AddressVerificationService,
  ],

  exports: [
    MapService,
    GeoService,
    PlacesService,
  ],
})
export class MapModule {}