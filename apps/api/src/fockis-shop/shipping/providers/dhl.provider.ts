import { Injectable, Logger } from "@nestjs/common";

import {
CarrierShipmentResult,
CarrierTrackingResult,
CreateCarrierShipmentInput,
} from "../interfaces/carrier.interface";

@Injectable()
export class DhlProvider {
private readonly logger = new Logger(DhlProvider.name);

/**

* Create a DHL shipment.
*
* TODO:
* Connect this method to the official DHL API.
  */
  async createShipment(
  input: CreateCarrierShipmentInput,
  ): Promise<CarrierShipmentResult> {
  this.logger.log(
  `Creating DHL shipment for ${input.destination.name}`,
  );

throw new Error(

  "DHL API integration is not configured yet.",
);

}

/**

* Retrieve tracking information from DHL.
*
* TODO:
* Replace this with the official DHL Tracking API.
  */
  async getTracking(
  trackingNumber: string,
  ): Promise<CarrierTrackingResult> {
  this.logger.log(
  `Requesting DHL tracking for ${trackingNumber}`,
  );

throw new Error(

  "DHL Tracking API integration is not configured yet.",
);

}
}
