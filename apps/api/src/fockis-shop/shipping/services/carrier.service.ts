import {
BadRequestException,
Injectable,
} from "@nestjs/common";

import {
Carrier,
} from "../interfaces/carrier.interface";

@Injectable()
export class CarrierService {

/**

* Select the appropriate carrier based on
* destination country and package weight.
*
* Internal carrier codes:
* * usps
* * ups
* * fedex
* * dhl
    */
    selectCarrier(input: {
    country?: string;
    weight?: number;
    }): Carrier {

const country =

  this.normalizeCountry(
    input.country,
  );

const weight =
  Number(input.weight) || 1;

if (weight <= 0) {
  throw new BadRequestException(
    "Package weight must be greater than zero.",
  );
}

/**
 * INTERNATIONAL SHIPMENTS
 *
 * DHL is used as the default
 * international carrier.
 */
if (
  !this.isUnitedStates(country)
) {
  return "dhl";
}

/**
 * DOMESTIC UNITED STATES
 *
 * 0-5 lb     → USPS
 * 5-20 lb    → FedEx
 * Over 20 lb → UPS
 */
if (weight <= 5) {
  return "usps";
}

if (weight <= 20) {
  return "fedex";
}

return "ups";

}

/**

* Generates a simulated tracking number
* for development and testing.
*
* Real tracking numbers should be created
* by the actual carrier API when production
* integrations are connected.
  */
  generateTracking(
  carrier: Carrier,
  ): string {

const random =

  Math.random()
    .toString(36)
    .substring(2, 12)
    .toUpperCase();

switch (carrier) {

  case "usps":
    return `USPS-${random}`;

  case "ups":
    return `1Z-${random}`;

  case "fedex":
    return `FDX-${random}`;

  case "dhl":
    return `DHL-${random}`;

  default:
    throw new BadRequestException(
      `Unsupported carrier: ${carrier}`,
    );
}

}

/**

* Normalize country names and country codes.
  */
  private normalizeCountry(
  country?: string,
  ): string {

return (

  country || "US"
)
  .trim()
  .toLowerCase();

}

/**

* Check whether the shipment is
* domestic within the United States.
  */
  private isUnitedStates(
  country: string,
  ): boolean {

return [

  "us",
  "usa",
  "united states",
  "united states of america",
].includes(country);
}
}
