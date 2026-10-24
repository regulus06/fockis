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

    if (!userId || !Types.ObjectId.isValid(String(userId))) {
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
    return this.ordersService.createOrder(this.getUserId(req), dto);
  }

  @Get()
  async findMyOrders(@Req() req: any) {
    return this.ordersService.findMyOrders(this.getUserId(req));
  }

  @Get("all")
  async findAll() {
    return this.ordersService.findAll();
  }

  @Get("seller")
  async findSellerOrders(@Req() req: any) {
    return this.ordersService.findSellerOrders(this.getUserId(req));
  }

  @Get("seller/store/:storeId")
  async findSellerStoreOrders(
    @Req() req: any,
    @Param("storeId") storeId: string,
  ) {
    if (!Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException("Invalid store ID");
    }

    return this.ordersService.findSellerStoreOrders(
      this.getUserId(req),
      storeId,
    );
  }

  @Get(":id")
  async findOne(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid order ID");
    }

    return this.ordersService.findOne(id, this.getUserId(req));
  }

  @Patch(":id/shipping-address")
  async updateShippingAddress(
    @Req() req: any,
    @Param("id") id: string,
    @Body()
    body: {
      fullName?: string;
      email?: string;
      phone?: string;
      houseOrApartmentNumber?: string;
      neighborhood?: string;
      street?: string;
      apartment?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid order ID");
    }

    return this.ordersService.updateShippingAddress(
      id,
      this.getUserId(req),
      body,
    );
  }

  @Patch(":id/status")
  async updateStatus(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid order ID");
    }

    return this.ordersService.updateStatus(
      id,
      this.getUserId(req),
      dto,
    );
  }
}
