
import { Injectable } from "@nestjs/common";

import { ShippingService } from "../shipping/services/shipping.service";

@Injectable()
export class OrderShippingListener {
  constructor(
    private readonly shippingService: ShippingService,
  ) {}

  async onOrderPaid(order: any) {
    if (!order || !order._id) {
      return null;
    }

    const shippingAddress =
      order.shippingAddress || {};

    return this.shippingService.create({
      orderId: String(order._id),

      country: (
        shippingAddress.country ||
        "usa"
      )
        .toLowerCase()
        .trim(),

      city: (
        shippingAddress.city ||
        ""
      ).trim(),

      weight:
        order.totalWeight ||
        1,
    });
  }
}