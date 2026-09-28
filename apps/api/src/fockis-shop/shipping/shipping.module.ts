import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  Shipment,
  ShipmentSchema,
} from "./schemas/shipment.schema";

import { ShippingService } from "./services/shipping.service";
import { ShippingSyncService } from "./services/shipping-sync.service";
import { TrackingService } from "./services/tracking.service";
import { CarrierService } from "./services/carrier.service";

import { ShippingController } from "./controllers/shipping.controller";

import { UpsProvider } from "./providers/ups.provider";
import { UspsProvider } from "./providers/usps.provider";
import { FedexProvider } from "./providers/fedex.provider";
import { DhlProvider } from "./providers/dhl.provider";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Shipment.name,
        schema: ShipmentSchema,
      },
    ]),
  ],

  controllers: [
    ShippingController,
  ],

  providers: [
    // ==========================================================
    // SHIPPING
    // ==========================================================

    ShippingService,
    ShippingSyncService,
    TrackingService,
    CarrierService,

    // ==========================================================
    // CARRIERS
    // ==========================================================

    UpsProvider,
    UspsProvider,
    FedexProvider,
    DhlProvider,
  ],

  exports: [
    ShippingService,
    TrackingService,
    CarrierService,
  ],
})
export class ShippingModule {}