
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { ShippingService } from "../services/shipping.service";

type AuthenticatedRequest = Request & {
  user?: {
    _id?: string | { toString(): string };
    id?: string | { toString(): string };
    sub?: string;
  };
};

type ShippoParcelBody = {
  length?: number;
  width?: number;
  height?: number;
  distanceUnit?: "in" | "cm" | "ft" | "mm" | "m";
  weight?: number;
  massUnit?: "lb" | "oz" | "kg" | "g";
};

type CheckoutDestinationBody = {
  fullName?: string;
  street?: string;
  apartment?: string;
  neighborhood?: string;
  houseOrApartmentNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  email?: string;
  phone?: string;
};

@Controller("fockis-shop/shipping")
export class ShippingController {
  constructor(
    private readonly service: ShippingService,
  ) {}

  /**
   * Legacy shipping estimate.
   * Retained for existing checkout integrations.
   */
  @Post("estimate")
  async calculateShipping(
    @Body()
    body: {
      country?: string;
      weight?: number;
    },
  ) {
    const country =
      typeof body?.country === "string"
        ? body.country.trim()
        : "";

    if (!country) {
      throw new BadRequestException(
        "Shipping country is required.",
      );
    }

    const weight = body?.weight ?? 1;

    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      throw new BadRequestException(
        "Package weight must be a positive number.",
      );
    }

    return this.service.calculateShipping(
      country,
      weight,
    );
  }

  /**
   * Live Shippo rates before checkout payment.
   * Does not create an order or purchase a label.
   */
  @Post("shippo/checkout-rates")
  async getCheckoutShippoRates(
    @Body()
    body: {
      storeId?: string;
      destination?: CheckoutDestinationBody;
      parcel?: ShippoParcelBody;
    },
  ) {
    const storeId = this.requireId(
      body?.storeId,
      "Store ID",
    );

    const destination = body?.destination;
    const parcel = body?.parcel;

    if (!destination) {
      throw new BadRequestException(
        "Delivery address is required.",
      );
    }

    if (!parcel) {
      throw new BadRequestException(
        "Parcel dimensions and weight are required.",
      );
    }

    const normalizedParcel =
      this.validateParcel(parcel);

    return this.service.getCheckoutShippoRates(
      storeId,
      {
        fullName: this.requireString(
          destination.fullName,
          "Recipient name",
        ),
        street: this.requireString(
          destination.street,
          "Street address",
        ),
        ...(destination.apartment?.trim()
          ? {
              apartment:
                destination.apartment.trim(),
            }
          : {}),
        ...(destination.neighborhood?.trim()
          ? {
              neighborhood:
                destination.neighborhood.trim(),
            }
          : {}),
        ...(destination.houseOrApartmentNumber?.trim()
          ? {
              houseOrApartmentNumber:
                destination.houseOrApartmentNumber.trim(),
            }
          : {}),
        city: this.requireString(
          destination.city,
          "City",
        ),
        state: this.requireString(
          destination.state,
          "State",
        ),
        zipCode: this.requireString(
          destination.zipCode,
          "Postal code",
        ),
        country: this.requireString(
          destination.country,
          "Country",
        ),
        email: this.requireString(
          destination.email,
          "Email",
        ),
        ...(destination.phone?.trim()
          ? {
              phone: destination.phone.trim(),
            }
          : {}),
      },
      normalizedParcel,
    );
  }

  /**
   * Seller shipping rates for an existing paid order.
   * Retains the existing fulfillment workflow.
   */
  @Post("shippo/rates")
  async getShippoRates(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      orderId?: string;
      shipmentId?: string;
      parcel?: ShippoParcelBody;
    },
  ) {
    const sellerId = this.getSellerId(req);

    const orderId = this.requireId(
      body?.orderId,
      "Order ID",
    );

    const shipmentId = this.requireId(
      body?.shipmentId,
      "Shipment ID",
    );

    if (!body?.parcel) {
      throw new BadRequestException(
        "Parcel dimensions and weight are required.",
      );
    }

    return this.service.getShippoRates(
      sellerId,
      orderId,
      shipmentId,
      this.validateParcel(body.parcel),
    );
  }

  /**
   * Purchase a label using a previously saved seller rate.
   */
  @Post("shippo/label")
  async purchaseShippoLabel(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      orderId?: string;
      shipmentId?: string;
      rateId?: string;
    },
  ) {
    const sellerId = this.getSellerId(req);

    const orderId = this.requireId(
      body?.orderId,
      "Order ID",
    );

    const shipmentId = this.requireId(
      body?.shipmentId,
      "Shipment ID",
    );

    const rateId = this.requireId(
      body?.rateId,
      "Shippo rate ID",
    );

    return this.service.purchaseShippoLabel(
      sellerId,
      orderId,
      shipmentId,
      rateId,
    );
  }

  /**
   * Validate and normalize parcel information.
   */
  private validateParcel(
    parcel: ShippoParcelBody,
  ) {
    const length = this.requirePositiveNumber(
      parcel.length,
      "length",
    );

    const width = this.requirePositiveNumber(
      parcel.width,
      "width",
    );

    const height = this.requirePositiveNumber(
      parcel.height,
      "height",
    );

    const weight = this.requirePositiveNumber(
      parcel.weight,
      "weight",
    );

    const distanceUnit =
      parcel.distanceUnit ?? "in";

    const massUnit =
      parcel.massUnit ?? "lb";

    const validDistanceUnits = [
      "in",
      "cm",
      "ft",
      "mm",
      "m",
    ] as const;

    const validMassUnits = [
      "lb",
      "oz",
      "kg",
      "g",
    ] as const;

    if (
      !(validDistanceUnits as readonly string[])
        .includes(distanceUnit)
    ) {
      throw new BadRequestException(
        "Distance unit must be in, cm, ft, mm, or m.",
      );
    }

    if (
      !(validMassUnits as readonly string[])
        .includes(massUnit)
    ) {
      throw new BadRequestException(
        "Mass unit must be lb, oz, kg, or g.",
      );
    }

    return {
      length,
      width,
      height,
      weight,
      distanceUnit,
      massUnit,
    };
  }

  private requireId(
    value: unknown,
    label: string,
  ): string {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      throw new BadRequestException(
        `${label} is required.`,
      );
    }

    return value.trim();
  }

  private requireString(
    value: unknown,
    label: string,
  ): string {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      throw new BadRequestException(
        `${label} is required.`,
      );
    }

    return value.trim();
  }

  private requirePositiveNumber(
    value: unknown,
    label: string,
  ): number {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      throw new BadRequestException(
        `Parcel ${label} must be a positive number.`,
      );
    }

    return value;
  }

  private getSellerId(
    req: AuthenticatedRequest,
  ): string {
    const user = req.user;

    const rawSellerId =
      user?._id ??
      user?.id ??
      user?.sub;

    if (
      rawSellerId === undefined ||
      rawSellerId === null ||
      !String(rawSellerId).trim()
    ) {
      throw new UnauthorizedException(
        "A signed-in seller is required to use Shippo shipping.",
      );
    }

    return String(rawSellerId).trim();
  }
}
