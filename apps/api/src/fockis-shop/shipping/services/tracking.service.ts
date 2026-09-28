import {
BadRequestException,
Injectable,
Logger,
NotFoundException,
} from "@nestjs/common";

import {
Carrier,
CarrierTrackingResult,
ShipmentStatus,
} from "../interfaces/carrier.interface";

import { UpsProvider } from "../providers/ups.provider";
import { UspsProvider } from "../providers/usps.provider";
import { FedexProvider } from "../providers/fedex.provider";
import { DhlProvider } from "../providers/dhl.provider";

@Injectable()
export class TrackingService {
private readonly logger = new Logger(
TrackingService.name,
);

constructor(
private readonly upsProvider: UpsProvider,
private readonly uspsProvider: UspsProvider,
private readonly fedexProvider: FedexProvider,
private readonly dhlProvider: DhlProvider,
) {}

/**

* Get tracking information from the
* appropriate carrier provider.
  */
  async getTrackingUpdate(
  trackingNumber: string,
  carrier: Carrier | string,
  ): Promise<CarrierTrackingResult> {
  if (!trackingNumber?.trim()) {
  throw new BadRequestException(
  "Tracking number is required.",
  );
  }

if (!carrier?.trim()) {
  throw new BadRequestException(
    "Carrier is required.",
  );
}

const normalizedTrackingNumber =
  trackingNumber.trim();

const normalizedCarrier =
  this.normalizeCarrier(carrier);

this.logger.log(
  `Requesting ${normalizedCarrier} tracking for ${normalizedTrackingNumber}`,
);

try {
  switch (normalizedCarrier) {
    case "usps":
      return await this.uspsProvider.getTracking(
        normalizedTrackingNumber,
      );

    case "ups":
      return await this.upsProvider.getTracking(
        normalizedTrackingNumber,
      );

    case "fedex":
      return await this.fedexProvider.getTracking(
        normalizedTrackingNumber,
      );

    case "dhl":
      return await this.dhlProvider.getTracking(
        normalizedTrackingNumber,
      );

    default:
      throw new BadRequestException(
        `Unsupported carrier: ${normalizedCarrier}`,
      );
  }
} catch (error) {
  this.logger.error(
    `Failed to retrieve tracking information for ${normalizedTrackingNumber}.`,
    error instanceof Error
      ? error.stack
      : String(error),
  );

  throw new NotFoundException(
    `Tracking information could not be retrieved for ${normalizedTrackingNumber}.`,
  );
}

}

/**

* Normalize carrier names from the database,
* frontend, or external services.
  */
  private normalizeCarrier(
  carrier: string,
  ): Carrier {
  const normalized = carrier
  .trim()
  .toLowerCase()
  .replace(/[\s_-]+/g, "");

switch (normalized) {

  case "usps":
    return "usps";

  case "ups":
    return "ups";

  case "fedex":
    return "fedex";

  case "dhl":
  case "dhlexpress":
    return "dhl";

  default:
    throw new BadRequestException(
      `Unsupported carrier: ${carrier}`,
    );
}

}

/**

* Check whether a carrier is supported.
  */
  isSupportedCarrier(
  carrier: string,
  ): boolean {
  try {
  this.normalizeCarrier(carrier);

  return true;
  } catch {
  return false;
  }
  }

/**

* Normalize shipment statuses returned
* by external carrier APIs.
  */
  normalizeStatus(
  status: string,
  ): ShipmentStatus {
  const normalized = status
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, "_");

const validStatuses: ShipmentStatus[] = [

  "pending",
  "processing",
  "label_created",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delayed",
  "failed",
  "cancelled",
];

if (
  validStatuses.includes(
    normalized as ShipmentStatus,
  )
) {
  return normalized as ShipmentStatus;
}

throw new BadRequestException(
  `Unsupported shipment status: ${status}`,
);

}
}
