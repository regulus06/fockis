import {
BadRequestException,
Body,
Controller,
Get,
Param,
Patch,
Post,
Req,
UseGuards,
} from "@nestjs/common";

import { Types } from "mongoose";

import { OrdersService } from "../services/orders.service";
import { CreateOrderDto } from "../dto/create-order.dto";
import { UpdateOrderStatusDto } from "../dto/update-order-status.dto";
import { JwtAuthGuard } from "../../../auth/jwt-auth.guard";

@Controller("fockis-shop/orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
constructor(
private readonly ordersService: OrdersService,
) {}

private getUserId(req: any): string {
const userId =
req?.user?.id ??
req?.user?.userId ??
req?.user?.sub;

console.log(
  "[OrdersController] Authenticated user:",
  req?.user,
);

console.log(
  "[OrdersController] Resolved user ID:",
  userId,
);

if (
  !userId ||
  !Types.ObjectId.isValid(String(userId))
) {
  throw new BadRequestException(
    "Invalid user authentication. The authenticated user ID must be a valid MongoDB ObjectId.",
  );
}

return String(userId);

}

@Post()
async createOrder(
@Req() req: any,
@Body() dto: CreateOrderDto,
) {
const customerId = this.getUserId(req);

console.log(
  "[OrdersController] Creating Fockis Shop order for customer:",
  customerId,
);

return this.ordersService.createOrder(
  customerId,
  dto,
);

}

@Get()
async findMyOrders(
@Req() req: any,
) {
const customerId = this.getUserId(req);

console.log(
  "[OrdersController] Loading Fockis Shop orders:",
  customerId,
);

return this.ordersService.findMyOrders(
  customerId,
);
}

@Get("all")
async findAll() {
console.log(
"[OrdersController] Loading all Fockis Shop orders",
);

return this.ordersService.findAll();

}

@Get("seller")
async findSellerOrders(
@Req() req: any,
) {
const sellerId = this.getUserId(req);

console.log(
  "[OrdersController] Loading seller orders for:",
  sellerId,
);

const orders =
  await this.ordersService.findSellerOrders(
    sellerId,
  );

console.log(
  "[OrdersController] Seller orders found:",
  orders.length,
);

return orders;

}

@Get("seller/store/:storeId")
async findSellerStoreOrders(
@Req() req: any,
@Param("storeId") storeId: string,
) {
const sellerId = this.getUserId(req);

if (
  !Types.ObjectId.isValid(storeId)
) {
  throw new BadRequestException(
    "Invalid store ID",
  );
}

console.log(
  "[OrdersController] Loading seller store orders:",
  {
    sellerId,
    storeId,
  },
);

return this.ordersService.findSellerStoreOrders(
  sellerId,
  storeId,
);

}

@Get(":id")
async findOne(
@Req() req: any,
@Param("id") id: string,
) {
const userId = this.getUserId(req);

if (
  !Types.ObjectId.isValid(id)
) {
  throw new BadRequestException(
    "Invalid order ID",
  );
}

return this.ordersService.findOne(
  id,
  userId,
);

}

@Patch(":id/status")
async updateStatus(
@Req() req: any,
@Param("id") id: string,
@Body() dto: UpdateOrderStatusDto,
) {
const sellerId = this.getUserId(req);

if (
  !Types.ObjectId.isValid(id)
) {
  throw new BadRequestException(
    "Invalid order ID",
  );
}

console.log(
  "[OrdersController] Updating Fockis Shop order status:",
  {
    orderId: id,
    sellerId,
    nextStatus: dto.status,
    shipmentStatus:
      dto.shipmentStatus,
  },
);

return this.ordersService.updateStatus(
  id,
  sellerId,
  dto,
);

}
}
