import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Shipment } from "../schemas/shipment.schema";

import {
  Carrier,
  ShipmentStatus,
} from "../interfaces/carrier.interface";

import { CarrierService } from "./carrier.service";

@Injectable()
export class ShippingService {
  constructor(
    @InjectModel(Shipment.name)
    private readonly shippingModel: Model<Shipment>,

    private readonly carrierService: CarrierService,
  ) {}

  // ============================================================
  // CREATE SHIPMENT
  // ============================================================

  async create(data: {
    orderId: string;
    country: string;
    city?: string;
    weight?: number;
    trackingNumber?: string;
    estimatedDelivery?: Date;
  }) {
    if (!data?.orderId) {
      throw new BadRequestException(
        "Order ID is required.",
      );
    }

    if (!Types.ObjectId.isValid(data.orderId)) {
      throw new BadRequestException(
        "Invalid order ID.",
      );
    }

    if (!data.country?.trim()) {
      throw new BadRequestException(
        "Shipping country is required.",
      );
    }

    const weight = data.weight ?? 1;

    if (weight <= 0) {
      throw new BadRequestException(
        "Package weight must be greater than zero.",
      );
    }

    // ============================================================
    // NORMALIZE COUNTRY
    // ============================================================

    const country = data.country
      .trim()
      .toLowerCase();

    // ============================================================
    // SELECT CARRIER
    // ============================================================

    const carrier: Carrier =
      this.carrierService.selectCarrier({
        country,
        weight,
      });

    // ============================================================
    // GENERATE TRACKING NUMBER
    // ============================================================

    const trackingNumber =
      data.trackingNumber?.trim() ||
      this.carrierService.generateTracking(
        carrier,
      );

    // ============================================================
    // ESTIMATED DELIVERY
    // ============================================================

    const estimatedDelivery =
      data.estimatedDelivery ||
      this.calculateEstimatedDelivery(
        country,
      );

    // ============================================================
    // INITIAL HISTORY
    // ============================================================

    const history = [
      {
        status: "pending" as ShipmentStatus,
        location:
          data.city || country,
        date: new Date(),
      },
    ];

    // ============================================================
    // CREATE SHIPMENT
    // ============================================================

    return this.shippingModel.create({
      order: new Types.ObjectId(
        data.orderId,
      ),

      carrier,

      trackingNumber,

      status: "pending",

      weight,

      country,

      city:
        data.city || undefined,

      estimatedDelivery,

      history,
    });
  }

  // ============================================================
  // SHIP
  // ============================================================

  async ship(id: string) {
    const shipment =
      await this.findShipment(id);

    shipment.status = "shipped";

    shipment.history = [
      ...(shipment.history || []),
      {
        status: "shipped",
        location:
          shipment.city ||
          shipment.country,
        date: new Date(),
      },
    ];

    return shipment.save();
  }

  // ============================================================
  // DELIVER
  // ============================================================

  async deliver(id: string) {
    const shipment =
      await this.findShipment(id);

    shipment.status = "delivered";

    shipment.history = [
      ...(shipment.history || []),
      {
        status: "delivered",
        location:
          shipment.city ||
          shipment.country,
        date: new Date(),
      },
    ];

    return shipment.save();
  }

  // ============================================================
  // FIND SHIPMENT BY ID
  // ============================================================

  async findById(id: string) {
    return this.findShipment(id);
  }

  // ============================================================
  // FIND SHIPMENTS BY ORDER
  // ============================================================

  async findByOrder(
    orderId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        orderId,
      )
    ) {
      throw new BadRequestException(
        "Invalid order ID.",
      );
    }

    return this.shippingModel
      .find({
        order:
          new Types.ObjectId(
            orderId,
          ),
      })
      .sort({
        createdAt: -1,
      });
  }

  // ============================================================
  // FIND ALL SHIPMENTS
  // ============================================================

  async findAll() {
    return this.shippingModel
      .find()
      .sort({
        createdAt: -1,
      });
  }

  // ============================================================
  // UPDATE SHIPMENT STATUS
  // ============================================================

  async updateStatus(
    id: string,
    status: ShipmentStatus,
    location?: string,
  ) {
    const shipment =
      await this.findShipment(id);

    shipment.status = status;

    shipment.history = [
      ...(shipment.history || []),
      {
        status,
        location:
          location ||
          shipment.city ||
          shipment.country,
        date: new Date(),
      },
    ];

    return shipment.save();
  }

  // ============================================================
  // CALCULATE SHIPPING PRICE
  // ============================================================

  async calculateShipping(
    country: string,
    weight = 1,
  ) {
    if (!country?.trim()) {
      throw new BadRequestException(
        "Shipping country is required.",
      );
    }

    if (weight <= 0) {
      throw new BadRequestException(
        "Package weight must be greater than zero.",
      );
    }

    const normalizedCountry =
      country
        .trim()
        .toLowerCase();

    // ============================================================
    // FOCKIS SHOP SHIPPING RATES
    // ============================================================

    const baseRates: Record<
      string,
      number
    > = {
      usa: 5,
      us: 5,
      "united states": 5,
      "united states of america": 5,

      canada: 7,

      uk: 6,
      "united kingdom": 6,

      france: 6,

      default: 12,
    };

    const rate =
      baseRates[
        normalizedCountry
      ] ??
      baseRates.default;

    const isDomestic =
      normalizedCountry === "usa" ||
      normalizedCountry === "us" ||
      normalizedCountry ===
        "united states" ||
      normalizedCountry ===
        "united states of america";

    // ============================================================
    // SELECT CARRIER
    // ============================================================

    const carrier =
      this.carrierService.selectCarrier({
        country:
          normalizedCountry,
        weight,
      });

    // ============================================================
    // CALCULATE PRICE
    // ============================================================

    const price =
      rate +
      weight * 1.2;

    return {
      country,

      weight,

      price: Number(
        price.toFixed(2),
      ),

      eta: isDomestic
        ? "2-4 days"
        : "5-10 days",

      carrier,
    };
  }

  // ============================================================
  // PRIVATE: FIND SHIPMENT
  // ============================================================

  private async findShipment(
    id: string,
  ): Promise<Shipment> {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new BadRequestException(
        "Invalid shipment ID.",
      );
    }

    const shipment =
      await this.shippingModel.findById(
        id,
      );

    if (!shipment) {
      throw new NotFoundException(
        "Shipment not found.",
      );
    }

    return shipment;
  }

  // ============================================================
  // PRIVATE: ESTIMATED DELIVERY
  // ============================================================

  private calculateEstimatedDelivery(
    country: string,
  ): Date {
    const normalizedCountry =
      country
        .trim()
        .toLowerCase();

    const isDomestic =
      normalizedCountry === "usa" ||
      normalizedCountry === "us" ||
      normalizedCountry ===
        "united states" ||
      normalizedCountry ===
        "united states of america";

    const days = isDomestic
      ? 4
      : 10;

    const estimated =
      new Date();

    estimated.setDate(
      estimated.getDate() +
        days,
    );

    return estimated;
  }
}