import {
Body,
Controller,
Get,
Param,
Patch,
Post,
} from "@nestjs/common";

import { ShippingService } from "../services/shipping.service";

import type {
ShipmentStatus,
} from "../interfaces/carrier.interface";

@Controller("fockis-shop/shipping")
export class ShippingController {
constructor(
private readonly service: ShippingService,
) {}

// ============================================================
// SHIPPING ESTIMATE
// ============================================================

@Post("estimate")
calculateShipping(
@Body()
body: {
country: string;
weight?: number;
},
) {
return this.service.calculateShipping(
body.country,
body.weight ?? 1,
);
}

// ============================================================
// CREATE SHIPMENT
// ============================================================

@Post()
create(
@Body()
body: {
orderId: string;
country: string;
city?: string;
weight?: number;
trackingNumber?: string;
estimatedDelivery?: Date;
},
) {
return this.service.create(body);
}

// ============================================================
// MARK SHIPPED
// ============================================================

@Patch(":id/ship")
ship(
@Param("id") id: string,
) {
return this.service.ship(id);
}

// ============================================================
// MARK DELIVERED
// ============================================================

@Patch(":id/deliver")
deliver(
@Param("id") id: string,
) {
return this.service.deliver(id);
}

// ============================================================
// GET BY ORDER
// ============================================================

@Get("order/:orderId")
find(
@Param("orderId") orderId: string,
) {
return this.service.findByOrder(orderId);
}

// ============================================================
// ADMIN: ALL SHIPMENTS
// ============================================================

@Get()
getAll() {
return this.service.findAll();
}

// ============================================================
// ADMIN: UPDATE STATUS
// ============================================================

@Patch(":id/status")
updateStatus(
@Param("id") id: string,
@Body("status") status: string,
) {
return this.service.updateStatus(
id,
status as ShipmentStatus,
);
}
}
