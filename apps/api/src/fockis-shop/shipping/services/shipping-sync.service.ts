import {
Injectable,
Logger,
OnModuleDestroy,
OnModuleInit,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { Shipment } from "../schemas/shipment.schema";
import { TrackingService } from "./tracking.service";

@Injectable()
export class ShippingSyncService
implements OnModuleInit, OnModuleDestroy
{
private readonly logger =
new Logger(ShippingSyncService.name);

private syncInterval?: NodeJS.Timeout;

constructor(
@InjectModel(Shipment.name)
private readonly shipmentModel: Model<Shipment>,

private readonly trackingService: TrackingService,

) {}

/**

* Start automatic tracking synchronization
* when the NestJS module starts.
  */
  onModuleInit() {
  this.startSync();
  }

/**

* Stop the synchronization interval when
* the NestJS application shuts down.
  */
  onModuleDestroy() {
  if (this.syncInterval) {
  clearInterval(this.syncInterval);

  this.syncInterval = undefined;

  this.logger.log(
  "Shipping tracking sync stopped.",
  );
  }
  }

/**

* Start automatic carrier tracking synchronization.
*
* Runs once immediately and then every 30 minutes.
  */
  startSync() {
  if (this.syncInterval) {
  this.logger.warn(
  "Shipping tracking sync is already running.",
  );

  return;
  }

this.logger.log(

  "Shipping tracking sync started.",
);

// Run immediately on startup.
void this.syncTracking();

// Continue every 30 minutes.
this.syncInterval = setInterval(
  () => {
    void this.syncTracking();
  },
  1000 * 60 * 30,
);

}

/**

* Synchronize all active shipments.
  */
  private async syncTracking() {
  try {
  this.logger.log(
  "Syncing carrier tracking updates...",
  );

  const shipments =
  await this.shipmentModel.find({
  status: {
  $in: [
  "shipped",
  "in_transit",
  "out_for_delivery",
  ],
  },

   trackingNumber: {
     $exists: true,
     $nin: [
       null,
       "",
     ],
   },


  });

  if (!shipments.length) {
  this.logger.log(
  "No active shipments require tracking synchronization.",
  );

  return;
  }

  this.logger.log(
  `Found ${shipments.length} shipment(s) to synchronize.`,
  );

  for (const shipment of shipments) {
  await this.syncShipment(
  shipment,
  );
  }
  } catch (error) {
  this.logger.error(
  "Failed to synchronize carrier tracking updates.",

  error instanceof Error
  ? error.stack
  : String(error),
  );
  }
  }

/**

* Synchronize one shipment.
  */
  private async syncShipment(
  shipment: Shipment,
  ) {
  try {
  if (
  !shipment.trackingNumber ||
  !shipment.carrier
  ) {
  this.logger.warn(
  `Skipping shipment ${shipment._id}: missing tracking number or carrier.`,
  );

  return;
  }

  const trackingUpdate =
  await this.trackingService.getTrackingUpdate(
  shipment.trackingNumber,
  shipment.carrier,
  );

  // Update shipment status.
  shipment.set(
  "status",
  trackingUpdate.status,
  );

  // Update current location.
  if (trackingUpdate.location) {
  shipment.set(
  "location",
  trackingUpdate.location,
  );
  }

  // Update estimated delivery date.
  if (
  trackingUpdate.estimatedDelivery
  ) {
  shipment.set(
  "estimatedDelivery",
  trackingUpdate.estimatedDelivery,
  );
  }

  // Replace tracking history if the
  // carrier returned a history list.
  if (
  trackingUpdate.history &&
  trackingUpdate.history.length > 0
  ) {
  shipment.set(
  "history",
  trackingUpdate.history,
  );
  }

  // Always update the database timestamp.
  shipment.set(
  "updatedAt",
  trackingUpdate.updatedAt ||
  new Date(),
  );

  await shipment.save();

  this.logger.log(
  `Shipment ${shipment.trackingNumber} synchronized successfully.`,
  );
  } catch (error) {
  this.logger.error(
  `Failed to sync shipment ${shipment.trackingNumber}.`,

  error instanceof Error
  ? error.stack
  : String(error),
  );
  }
  }
  }
