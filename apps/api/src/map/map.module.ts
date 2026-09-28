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

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: FockisAddress.name,
        schema: FockisAddressSchema,
      },
      {
        name: AddressRequest.name,
        schema: AddressRequestSchema,
      },
    ]),
  ],

  controllers: [
    MapController,
  ],

  providers: [
    MapService,
    MapPermissionGuard,
    MapManagementGuard,
  ],

  exports: [
    MapService,
  ],
})
export class MapModule {}