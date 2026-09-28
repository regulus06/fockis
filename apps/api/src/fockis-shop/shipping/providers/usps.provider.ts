import { Injectable, Logger } from "@nestjs/common";

import {
CarrierShipmentResult,
CarrierTrackingResult,
CreateCarrierShipmentInput,
} from "../interfaces/carrier.interface";

@Injectable()
export class UspsProvider {
private readonly logger = new Logger(UspsProvider.name);

/**

* Create a USPS shipment.
*
* TODO:
* Connect this method to the official USPS API.
  */
  async createShipment(
  input: CreateCarrierShipmentInput,
  ): Promise<CarrierShipmentResult> {
  this.logger.log(
  `Creating USPS shipment for ${input.destination.name}`,
  );

throw new Error(

  "USPS API integration is not configured yet.",
);

}

/**

* Retrieve tracking information from USPS.
*
* TODO:
* Replace this with the official USPS Tracking API.
  */
  async getTracking(
  trackingNumber: string,
  ): Promise<CarrierTrackingResult> {
  this.logger.log(
  `Requesting USPS tracking for ${trackingNumber}`,
  );

throw new Error(

  "USPS Tracking API integration is not configured yet.",
);

}
}
