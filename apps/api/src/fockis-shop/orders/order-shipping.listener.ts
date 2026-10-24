
import { Injectable, Logger } from "@nestjs/common";

import { ShippingService } from "../shipping/services/shipping.service";

@Injectable()
export class OrderShippingListener {
  private readonly logger = new Logger(OrderShippingListener.name);

  constructor(
    private readonly shippingService: ShippingService,
  ) {}

  /**
   * Called when an order is paid.
   *
   * Shipping labels are not purchased automatically here.
   * A seller should request Shippo rates and explicitly purchase
   * a label from the seller's order-management workflow.
   */
  async onOrderPaid(order: any) {
    if (!order?._id) {
      return null;
    }

    const shippingAddress = order.shippingAddress ?? {};

    const country = String(
      shippingAddress.country ?? "US",
    )
      .trim()
      .toUpperCase();

    const weight = Number(order.totalWeight ?? 1);

    try {
      const estimate = await this.shippingService.calculateShipping(
        country,
        Number.isFinite(weight) && weight > 0 ? weight : 1,
      );

      this.logger.log(
        `Shipping estimate prepared for paid order ${String(order._id)}.`,
      );

      return {
        orderId: String(order._id),
        country,
        city: String(shippingAddress.city ?? "").trim(),
        estimate,
        labelPurchased: false,
      };
    } catch (error) {
      this.logger.error(
        `Unable to prepare shipping estimate for order ${String(order._id)}.`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }
}
