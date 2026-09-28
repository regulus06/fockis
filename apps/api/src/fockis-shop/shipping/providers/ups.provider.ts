import { Injectable, Logger } from "@nestjs/common";

import {
CarrierShipmentResult,
CarrierTrackingResult,
CreateCarrierShipmentInput,
} from "../interfaces/carrier.interface";

@Injectable()
export class UpsProvider {
private readonly logger = new Logger(UpsProvider.name);

/**

* Create a UPS shipment.
*
* TODO:
* Connect this method to the official UPS API.
* The API credentials should come from environment variables.
  */
  async createShipment(
  input: CreateCarrierShipmentInput,
  ): Promise<CarrierShipmentResult> {
  this.logger.log(
  `Creating UPS shipment for ${input.destination.name}`,
  );

throw new Error(

  "UPS API integration is not configured yet.",
);

}

/**

* Retrieve tracking information from UPS.
*
* TODO:
* Replace this with the official UPS Tracking API.
  */
  async getTracking(
  trackingNumber: string,
  ): Promise<CarrierTrackingResult> {
  this.logger.log(
  `Requesting UPS tracking for ${trackingNumber}`,
  );

throw new Error(

  "UPS Tracking API integration is not configured yet.",
);

}
}
