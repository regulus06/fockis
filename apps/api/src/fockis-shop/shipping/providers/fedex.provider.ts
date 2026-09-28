import { Injectable, Logger } from "@nestjs/common";

import {
CarrierShipmentResult,
CarrierTrackingResult,
CreateCarrierShipmentInput,
} from "../interfaces/carrier.interface";

@Injectable()
export class FedexProvider {
private readonly logger = new Logger(FedexProvider.name);

/**

* Create a FedEx shipment.
*
* TODO:
* Connect this method to the official FedEx API.
  */
  async createShipment(
  input: CreateCarrierShipmentInput,
  ): Promise<CarrierShipmentResult> {
  this.logger.log(
  `Creating FedEx shipment for ${input.destination.name}`,
  );

throw new Error(

  "FedEx API integration is not configured yet.",
);

}

/**

* Retrieve tracking information from FedEx.
*
* TODO:
* Replace this with the official FedEx Tracking API.
  */
  async getTracking(
  trackingNumber: string,
  ): Promise<CarrierTrackingResult> {
  this.logger.log(
  `Requesting FedEx tracking for ${trackingNumber}`,
  );

throw new Error(

  "FedEx Tracking API integration is not configured yet.",
);

}
}
