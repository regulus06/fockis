import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import { Model, Types } from "mongoose";

import { randomUUID } from "crypto";

import { EventEmitter2 } from "@nestjs/event-emitter";

import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
} from "../schemas/order.schema";

import {
  User,
  UserDocument,
} from "../../../users/user.schema";

import {
  Product,
  ProductDocument,
} from "../../products/schemas/product.schema";

import {
  InventoryService,
} from "../../inventory/inventory.service";

import {
  CreateOrderDto,
} from "../dto/create-order.dto";

import {
  UpdateOrderStatusDto,
} from "../dto/update-order-status.dto";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    private readonly inventoryService: InventoryService,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  /* ==========================================================================
     ID HELPERS
  ========================================================================== */

  private normalizeId(
    value: unknown,
  ): string {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value).trim();
  }

  private requireValidObjectId(
    value: unknown,
    label: string,
  ): string {
    const normalized =
      this.normalizeId(value);

    if (
      !normalized ||
      !Types.ObjectId.isValid(normalized)
    ) {
      throw new BadRequestException(
        `Invalid ${label}`,
      );
    }

    return normalized;
  }

  private toObjectId(
    value: unknown,
    label: string,
  ): Types.ObjectId {
    const normalized =
      this.requireValidObjectId(
        value,
        label,
      );

    return new Types.ObjectId(
      normalized,
    );
  }

  /* ==========================================================================
     CREATE ORDER
  ========================================================================== */

  async createOrder(
    customerId: string,
    dto: CreateOrderDto,
  ) {
    const normalizedCustomerId =
      this.requireValidObjectId(
        customerId,
        "customer ID",
      );

    const customerObjectId =
      new Types.ObjectId(
        normalizedCustomerId,
      );

    const user =
      await this.userModel.findById(
        customerObjectId,
      );

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    if (
      !dto.items ||
      dto.items.length === 0
    ) {
      throw new BadRequestException(
        "Order must contain at least one item",
      );
    }

    if (!dto.shippingAddress) {
      throw new BadRequestException(
        "Shipping address is required",
      );
    }

    const address =
      dto.shippingAddress;

    if (!address.fullName?.trim()) {
      throw new BadRequestException(
        "Recipient full name is required",
      );
    }

    if (!address.phone?.trim()) {
      throw new BadRequestException(
        "Phone number is required",
      );
    }

    if (
      !address.houseOrApartmentNumber?.trim()
    ) {
      throw new BadRequestException(
        "House or apartment number is required",
      );
    }

    if (!address.city?.trim()) {
      throw new BadRequestException(
        "City is required",
      );
    }

    if (!address.country?.trim()) {
      throw new BadRequestException(
        "Country is required",
      );
    }

    /* =========================================================================
       COUNTRY VALIDATION
    ========================================================================= */

    const normalizedCountry =
      address.country
        .trim()
        .toLowerCase();

    const isUnitedStates = [
      "united states",
      "united states of america",
      "usa",
      "us",
    ].includes(normalizedCountry);

    const isHaiti = [
      "haiti",
      "ht",
    ].includes(normalizedCountry);

    if (isUnitedStates) {
      if (!address.street?.trim()) {
        throw new BadRequestException(
          "Street address is required for United States deliveries",
        );
      }

      if (!address.state?.trim()) {
        throw new BadRequestException(
          "State is required for United States deliveries",
        );
      }

      if (!address.zipCode?.trim()) {
        throw new BadRequestException(
          "ZIP code is required for United States deliveries",
        );
      }
    }

    if (isHaiti) {
      if (!address.neighborhood?.trim()) {
        throw new BadRequestException(
          "Neighborhood or local area is required for Haiti deliveries",
        );
      }

      if (!address.state?.trim()) {
        throw new BadRequestException(
          "Department is required for Haiti deliveries",
        );
      }
    }

    if (
      !isUnitedStates &&
      !isHaiti
    ) {
      if (
        !address.street?.trim() &&
        !address.neighborhood?.trim()
      ) {
        throw new BadRequestException(
          "Please provide either a street address or neighborhood/local area",
        );
      }
    }

    /* =========================================================================
       PAYMENT METHOD
    ========================================================================= */

    const paymentMethod =
      String(
        dto.paymentMethod ?? "",
      )
        .trim()
        .toLowerCase();

    const validPaymentMethods = [
      "card",
      "moncash",
      "natcash",
      "cod",
    ];

    if (
      !validPaymentMethods.includes(
        paymentMethod,
      )
    ) {
      throw new BadRequestException(
        "Invalid payment method",
      );
    }

    if (
      !isHaiti &&
      [
        "moncash",
        "natcash",
        "cod",
      ].includes(paymentMethod)
    ) {
      throw new BadRequestException(
        "This payment method is only available for Haiti deliveries",
      );
    }

    if (
      paymentMethod === "card" &&
      !dto.paymentIntentId
    ) {
      throw new BadRequestException(
        "Stripe payment information is required",
      );
    }

    /* =========================================================================
       ORDER DATA
    ========================================================================= */

    const orderItems: any[] = [];

    let calculatedSubtotal = 0;

    let calculatedProductDiscount = 0;

    const sellerGroups = new Map<
      string,
      {
        sellerId: string;
        storeId: string;
        itemIds: Types.ObjectId[];
      }
    >();

    const reservedItems: Array<{
      productId: string;
      sellerId: string;
      quantity: number;
    }> = [];

    try {
      for (const item of dto.items) {
        /* =====================================================================
           NORMALIZE REQUEST IDS

           These are deliberately converted to guaranteed strings before
           being passed to Mongoose. This prevents string | undefined from
           reaching Types.ObjectId or Types.ObjectId.isValid.
        ===================================================================== */

        const itemProductId =
          this.normalizeId(
            item.productId,
          );

        const itemSellerId =
          this.normalizeId(
            item.sellerId,
          );

        const itemStoreId =
          this.normalizeId(
            item.storeId,
          );

        if (
          !itemProductId ||
          !Types.ObjectId.isValid(
            itemProductId,
          )
        ) {
          throw new BadRequestException(
            `Invalid product ID: ${itemProductId || "missing"}`,
          );
        }

        if (
          !itemSellerId ||
          !Types.ObjectId.isValid(
            itemSellerId,
          )
        ) {
          throw new BadRequestException(
            `Invalid seller ID: ${itemSellerId || "missing"}`,
          );
        }

        if (
          itemStoreId &&
          !Types.ObjectId.isValid(
            itemStoreId,
          )
        ) {
          throw new BadRequestException(
            `Invalid store ID: ${itemStoreId}`,
          );
        }

        if (
          !Number.isInteger(
            item.quantity,
          ) ||
          item.quantity < 1
        ) {
          throw new BadRequestException(
            "Product quantity must be at least 1",
          );
        }

        /* =====================================================================
           LOAD PRODUCT
        ===================================================================== */

        const product =
          await this.productModel.findById(
            itemProductId,
          );

        if (!product) {
          throw new NotFoundException(
            `Product ${itemProductId} not found`,
          );
        }

        if (!product.isActive) {
          throw new BadRequestException(
            `Product ${product.name} is no longer available`,
          );
        }

        /* =====================================================================
           PRODUCT SELLER REFERENCE
        ===================================================================== */

        const productSellerId =
          this.normalizeId(
            product.seller,
          );

        if (
          !productSellerId ||
          !Types.ObjectId.isValid(
            productSellerId,
          )
        ) {
          throw new BadRequestException(
            `Product ${product.name} does not have a valid seller`,
          );
        }

        /* =====================================================================
           PRODUCT STORE REFERENCE
        ===================================================================== */

        const productStoreId =
          this.normalizeId(
            product.storeId,
          );

        if (
          !productStoreId ||
          !Types.ObjectId.isValid(
            productStoreId,
          )
        ) {
          throw new BadRequestException(
            `Product ${product.name} does not have a valid store`,
          );
        }

        /* =====================================================================
           GUARANTEED OBJECT IDS
        ===================================================================== */

        const productSellerObjectId =
          new Types.ObjectId(
            productSellerId,
          );

        const productStoreObjectId =
          new Types.ObjectId(
            productStoreId,
          );

        const productObjectId =
          new Types.ObjectId(
            itemProductId,
          );

        /* =====================================================================
           VERIFY SELLER
        ===================================================================== */

        if (
          productSellerId !==
          itemSellerId
        ) {
          throw new BadRequestException(
            `Seller does not own product ${product.name}`,
          );
        }

        /* =====================================================================
           VERIFY STORE
        ===================================================================== */

        if (
          itemStoreId &&
          itemStoreId !==
          productStoreId
        ) {
          throw new BadRequestException(
            `Product ${product.name} does not belong to the selected store`,
          );
        }

        /* =====================================================================
           RESERVE INVENTORY
        ===================================================================== */

        await this.inventoryService.reserve(
          itemProductId,
          itemSellerId,
          item.quantity,
        );

        reservedItems.push({
          productId:
            itemProductId,

          sellerId:
            itemSellerId,

          quantity:
            item.quantity,
        });

        /* =====================================================================
           SERVER-SIDE PRICE
        ===================================================================== */

        const basePrice =
          Number(
            product.price ?? 0,
          );

        const discountPercent =
          Number(
            product.discount ?? 0,
          );

        if (
          !Number.isFinite(
            basePrice,
          ) ||
          basePrice < 0
        ) {
          throw new BadRequestException(
            `Invalid price for product ${product.name}`,
          );
        }

        if (
          !Number.isFinite(
            discountPercent,
          ) ||
          discountPercent < 0 ||
          discountPercent > 100
        ) {
          throw new BadRequestException(
            `Invalid discount for product ${product.name}`,
          );
        }

        const discountAmount =
          Number(
            (
              basePrice *
              (
                discountPercent /
                100
              )
            ).toFixed(2),
          );

        const serverPrice =
          Number(
            (
              basePrice -
              discountAmount
            ).toFixed(2),
          );

        const quantity =
          Number(
            item.quantity,
          );

        const itemTotal =
          Number(
            (
              serverPrice *
              quantity
            ).toFixed(2),
          );

        const originalItemTotal =
          Number(
            (
              basePrice *
              quantity
            ).toFixed(2),
          );

        const itemDiscountTotal =
          Number(
            (
              originalItemTotal -
              itemTotal
            ).toFixed(2),
          );

        calculatedSubtotal =
          Number(
            (
              calculatedSubtotal +
              itemTotal
            ).toFixed(2),
          );

        calculatedProductDiscount =
          Number(
            (
              calculatedProductDiscount +
              itemDiscountTotal
            ).toFixed(2),
          );

        /* =====================================================================
           ORDER ITEM
        ===================================================================== */

        const orderItemId =
          new Types.ObjectId();

        orderItems.push({
          _id:
            orderItemId,

          product:
            productObjectId,

          seller:
            productSellerObjectId,

          storeId:
            productStoreObjectId,

          productName:
            product.name,

          productImage:
            product.images?.[0] ??
            "",

          quantity,

          price:
            serverPrice,

          itemTotal,
        });

        /* =====================================================================
           SELLER / STORE GROUP
        ===================================================================== */

        const sellerKey =
          `${productSellerId}_${productStoreId}`;

        let sellerGroup =
          sellerGroups.get(
            sellerKey,
          );

        if (!sellerGroup) {
          sellerGroup = {
            sellerId:
              productSellerId,

            storeId:
              productStoreId,

            itemIds: [],
          };

          sellerGroups.set(
            sellerKey,
            sellerGroup,
          );
        }

        sellerGroup.itemIds.push(
          orderItemId,
        );
      }

      /* =========================================================================
         ORDER NUMBER
      ========================================================================= */

      const orderNumber =
        `FOC-${Date.now()}-${Math.floor(
          Math.random() * 10000,
        )}`;

      /* =========================================================================
         INVOICE NUMBER
      ========================================================================= */

      const invoiceNumber =
        `INV-${randomUUID()}`;

      /* =========================================================================
         SHIPPING ADDRESS
      ========================================================================= */

      const shippingAddress = {
        fullName:
          address.fullName.trim(),

        email:
          address.email?.trim() ||
          user.email ||
          "",

        phone:
          address.phone.trim(),

        houseOrApartmentNumber:
          address.houseOrApartmentNumber.trim(),

        neighborhood:
          address.neighborhood?.trim() ||
          "",

        street:
          address.street?.trim() ||
          "",

        apartment:
          address.apartment?.trim() ||
          "",

        city:
          address.city.trim(),

        state:
          address.state?.trim() ||
          "",

        zipCode:
          address.zipCode?.trim() ||
          "",

        country:
          address.country.trim(),
      };

      /* =========================================================================
         SELLER SHIPMENTS
      ========================================================================= */

      const shipments =
        Array.from(
          sellerGroups.values(),
        ).map(
          (group) => {
            const shipmentSellerId =
              this.toObjectId(
                group.sellerId,
                "shipment seller ID",
              );

            const shipmentStoreId =
              this.toObjectId(
                group.storeId,
                "shipment store ID",
              );

            return {
              seller:
                shipmentSellerId,

              storeId:
                shipmentStoreId,

              itemIds:
                group.itemIds,

              status:
                ShipmentStatus.PENDING,

              carrier:
                "",

              trackingNumber:
                "",

              trackingUrl:
                "",

              estimatedDeliveryDate:
                null,

              shippedAt:
                null,

              deliveredAt:
                null,
            };
          },
        );

      /* =========================================================================
         SHIPPING COST
      ========================================================================= */

      const shippingCost =
        Number(
          dto.shippingCost ?? 0,
        );

      if (
        !Number.isFinite(
          shippingCost,
        ) ||
        shippingCost < 0
      ) {
        throw new BadRequestException(
          "Invalid shipping cost",
        );
      }

      /* =========================================================================
         TAX
      ========================================================================= */

      const tax =
        Number(
          dto.tax ?? 0,
        );

      if (
        !Number.isFinite(
          tax,
        ) ||
        tax < 0
      ) {
        throw new BadRequestException(
          "Invalid tax amount",
        );
      }

      /* =========================================================================
         TOTAL
      ========================================================================= */

      const calculatedTotalAmount =
        Number(
          (
            calculatedSubtotal +
            shippingCost +
            tax
          ).toFixed(2),
        );

      /* =========================================================================
         PAYMENT STATUS
      ========================================================================= */

      const isPaymentConfirmed =
        dto.paymentStatus ===
          "paid" &&
        Boolean(
          dto.paymentIntentId,
        );

      const paymentStatus =
        isPaymentConfirmed
          ? PaymentStatus.PAID
          : PaymentStatus.PENDING;

      const orderStatus =
        isPaymentConfirmed
          ? OrderStatus.PAID
          : OrderStatus.PENDING;

      /* =========================================================================
         CURRENCY
      ========================================================================= */

      const currency =
        dto.currency?.trim() ||
        (
          isHaiti &&
          paymentMethod !== "card"
            ? "HTG"
            : "USD"
        );

      /* =========================================================================
         EXCHANGE RATE
      ========================================================================= */

      const exchangeRate =
        Number(
          dto.exchangeRate ?? 1,
        );

      if (
        !Number.isFinite(
          exchangeRate,
        ) ||
        exchangeRate <= 0
      ) {
        throw new BadRequestException(
          "Invalid exchange rate",
        );
      }

      /* =========================================================================
         ORDER DATA
      ========================================================================= */

      const now =
        new Date();

      const orderData = {
        orderNumber,

        invoiceNumber,

        customer:
          customerObjectId,

        customerName:
          `${user.firstName || ""} ${
            user.lastName || ""
          }`.trim(),

        customerEmail:
          user.email ??
          "",

        customerPhone:
          user.phone ??
          "",

        items:
          orderItems,

        shippingAddress,

        billingAddress:
          shippingAddress,

        subtotal:
          calculatedSubtotal,

        shippingCost,

        tax,

        discount:
          calculatedProductDiscount,

        totalAmount:
          calculatedTotalAmount,

        deliveryMethod:
          dto.deliveryMethod ??
          "standard",

        paymentMethod,

        paymentStatus,

        paymentIntentId:
          dto.paymentIntentId ??
          "",

        moncashTransactionId:
          dto.moncashTransactionId ??
          "",

        natchTransactionId:
          dto.natcashTransactionId ??
          "",

        currency,

        exchangeRate,

        status:
          orderStatus,

        shipments,

        orderDate:
          now,

        paidAt:
          isPaymentConfirmed
            ? now
            : null,

        month:
          now.toLocaleString(
            "default",
            {
              month: "long",
            },
          ),

        year:
          now.getFullYear(),
      };

      const order =
        await this.orderModel.create(
          orderData,
        ) as OrderDocument;

      /* =========================================================================
         EVENTS
      ========================================================================= */

      this.eventEmitter.emit(
        "order.created",
        order,
      );

      if (
        order.paymentStatus ===
        PaymentStatus.PAID
      ) {
        this.eventEmitter.emit(
          "order.paid",
          order,
        );
      }

      return order;
    } catch (error) {
      /* =========================================================================
         RELEASE INVENTORY
      ========================================================================= */

      for (
        const reserved of reservedItems
      ) {
        try {
          const inventoryService =
            this.inventoryService as any;

          if (
            typeof inventoryService.release ===
            "function"
          ) {
            await inventoryService.release(
              reserved.productId,
              reserved.sellerId,
              reserved.quantity,
            );
          }
        } catch {
          // Preserve the original checkout error.
        }
      }

      throw error;
    }
  }

  /* ==========================================================================
     CUSTOMER ORDERS
  ========================================================================== */

  async findMyOrders(
    userId: string,
  ) {
    const normalizedUserId =
      this.requireValidObjectId(
        userId,
        "user ID",
      );

    const userObjectId =
      new Types.ObjectId(
        normalizedUserId,
      );

    return this.orderModel
      .find({
        customer:
          userObjectId,
      })
      .populate("customer")
      .populate("items.product")
      .populate("items.seller")
      .populate("items.storeId")
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /* ==========================================================================
     ALL ORDERS
  ========================================================================== */

  async findAll() {
    return this.orderModel
      .find()
      .populate("customer")
      .populate("items.product")
      .populate("items.seller")
      .populate("items.storeId")
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /* ==========================================================================
     SELLER ORDERS
  ========================================================================== */

  async findSellerOrders(
    sellerId: string,
  ) {
    const normalizedSellerId =
      this.normalizeId(
        sellerId,
      );

    if (
      !normalizedSellerId ||
      !Types.ObjectId.isValid(
        normalizedSellerId,
      )
    ) {
      return [];
    }

    const sellerObjectId =
      new Types.ObjectId(
        normalizedSellerId,
      );

    return this.orderModel
      .find({
        items: {
          $elemMatch: {
            seller:
              sellerObjectId,
          },
        },
      })
      .populate("customer")
      .populate("items.product")
      .populate("items.seller")
      .populate("items.storeId")
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /* ==========================================================================
     SELLER STORE ORDERS
  ========================================================================== */

  async findSellerStoreOrders(
    sellerId: string,
    storeId: string,
  ) {
    const normalizedSellerId =
      this.normalizeId(
        sellerId,
      );

    const normalizedStoreId =
      this.normalizeId(
        storeId,
      );

    if (
      !normalizedSellerId ||
      !Types.ObjectId.isValid(
        normalizedSellerId,
      ) ||
      !normalizedStoreId ||
      !Types.ObjectId.isValid(
        normalizedStoreId,
      )
    ) {
      return [];
    }

    const sellerObjectId =
      new Types.ObjectId(
        normalizedSellerId,
      );

    const storeObjectId =
      new Types.ObjectId(
        normalizedStoreId,
      );

    return this.orderModel
      .find({
        items: {
          $elemMatch: {
            seller:
              sellerObjectId,

            storeId:
              storeObjectId,
          },
        },
      })
      .populate("customer")
      .populate("items.product")
      .populate("items.seller")
      .populate("items.storeId")
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /* ==========================================================================
     SINGLE ORDER
  ========================================================================== */

  async findOne(
    id: string,
    userId?: string,
  ) {
    const normalizedOrderId =
      this.requireValidObjectId(
        id,
        "order ID",
      );

    const normalizedUserId =
      userId
        ? this.requireValidObjectId(
            userId,
            "user ID",
          )
        : undefined;

    const order =
      await this.orderModel
        .findById(
          normalizedOrderId,
        )
        .populate("customer")
        .populate("items.product")
        .populate("items.seller")
        .populate("items.storeId")
        .exec();

    if (!order) {
      throw new NotFoundException(
        "Order not found",
      );
    }

    if (normalizedUserId) {
      const isCustomer =
        order.customer?._id?.toString() ===
        normalizedUserId;

      const isSeller =
        order.items.some(
          (item: any) =>
            item.seller?._id?.toString() ===
            normalizedUserId,
        );

      if (
        !isCustomer &&
        !isSeller
      ) {
        throw new BadRequestException(
          "You are not authorized to view this order",
        );
      }
    }

    return order;
  }

  /* ==========================================================================
     UPDATE ORDER STATUS
  ========================================================================== */

  async updateStatus(
    id: string,
    sellerId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const normalizedOrderId =
      this.requireValidObjectId(
        id,
        "order ID",
      );

    const normalizedSellerId =
      this.requireValidObjectId(
        sellerId,
        "seller ID",
      );

    const order =
      await this.orderModel.findById(
        normalizedOrderId,
      );

    if (!order) {
      throw new NotFoundException(
        "Order not found",
      );
    }

    const sellerShipment =
      order.shipments.find(
        (shipment) =>
          shipment.seller.toString() ===
          normalizedSellerId,
      );

    if (!sellerShipment) {
      throw new BadRequestException(
        "You are not authorized to update this order",
      );
    }

    const currentStatus =
      order.status;

    const nextStatus =
      dto.status;

    /* =========================================================================
       PAYMENT PROTECTION
    ========================================================================= */

    if (
      nextStatus ===
      OrderStatus.PAID
    ) {
      throw new BadRequestException(
        "Payment confirmation must be completed by the payment system. Sellers cannot manually mark an order as paid.",
      );
    }

    const fulfillmentStatuses = [
      OrderStatus.PROCESSING,
      OrderStatus.READY_TO_SHIP,
      OrderStatus.SHIPPED,
      OrderStatus.IN_TRANSIT,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];

    if (
      fulfillmentStatuses.includes(
        nextStatus,
      ) &&
      order.paymentStatus !==
        PaymentStatus.PAID
    ) {
      throw new BadRequestException(
        "This order cannot be processed or shipped until payment has been confirmed.",
      );
    }

    /* =========================================================================
       VALID SELLER TRANSITIONS
    ========================================================================= */

    const allowedTransitions:
      Record<
        string,
        string[]
      > = {
        [OrderStatus.PENDING]: [
          OrderStatus.CANCELLED,
        ],

        [OrderStatus.PAID]: [
          OrderStatus.PROCESSING,
          OrderStatus.CANCELLED,
        ],

        [OrderStatus.PROCESSING]: [
          OrderStatus.READY_TO_SHIP,
        ],

        [OrderStatus.READY_TO_SHIP]: [
          OrderStatus.SHIPPED,
        ],

        [OrderStatus.SHIPPED]: [
          OrderStatus.IN_TRANSIT,
          OrderStatus.OUT_FOR_DELIVERY,
          OrderStatus.DELIVERED,
        ],

        [OrderStatus.IN_TRANSIT]: [
          OrderStatus.OUT_FOR_DELIVERY,
          OrderStatus.DELIVERED,
        ],

        [OrderStatus.OUT_FOR_DELIVERY]: [
          OrderStatus.DELIVERED,
        ],

        [OrderStatus.DELIVERED]: [],

        [OrderStatus.CANCELLED]: [],

        [OrderStatus.REFUNDED]: [],

        [OrderStatus.RETURN_REQUESTED]: [
          OrderStatus.RETURNED,
        ],

        [OrderStatus.RETURNED]: [],
      };

    const allowed =
      allowedTransitions[
        currentStatus
      ] ?? [];

    if (
      !allowed.includes(
        nextStatus,
      )
    ) {
      throw new BadRequestException(
        `Cannot change order status from "${currentStatus}" to "${nextStatus}"`,
      );
    }

    /* =========================================================================
       UPDATE SELLER SHIPMENT
    ========================================================================= */

    switch (nextStatus) {
      case OrderStatus.PROCESSING:
        sellerShipment.status =
          ShipmentStatus.PROCESSING;
        break;

      case OrderStatus.READY_TO_SHIP:
        sellerShipment.status =
          ShipmentStatus.READY_TO_SHIP;
        break;

      case OrderStatus.SHIPPED:
        sellerShipment.status =
          ShipmentStatus.SHIPPED;

        sellerShipment.shippedAt =
          new Date();
        break;

      case OrderStatus.IN_TRANSIT:
        sellerShipment.status =
          ShipmentStatus.IN_TRANSIT;
        break;

      case OrderStatus.OUT_FOR_DELIVERY:
        sellerShipment.status =
          ShipmentStatus.OUT_FOR_DELIVERY;
        break;

      case OrderStatus.DELIVERED:
        sellerShipment.status =
          ShipmentStatus.DELIVERED;

        sellerShipment.deliveredAt =
          new Date();
        break;

      case OrderStatus.CANCELLED:
        sellerShipment.status =
          ShipmentStatus.CANCELLED;
        break;

      default:
        break;
    }

    /* =========================================================================
       EXPLICIT SHIPMENT STATUS OVERRIDE
    ========================================================================= */

    if (dto.shipmentStatus) {
      sellerShipment.status =
        dto.shipmentStatus;
    }

    /* =========================================================================
       TRACKING INFORMATION
    ========================================================================= */

    if (
      dto.trackingNumber !==
      undefined
    ) {
      const trackingNumber =
        String(
          dto.trackingNumber,
        ).trim();

      sellerShipment.trackingNumber =
        trackingNumber;

      order.trackingNumber =
        trackingNumber;
    }

    if (
      dto.carrier !==
      undefined
    ) {
      const carrier =
        String(
          dto.carrier,
        ).trim();

      sellerShipment.carrier =
        carrier;

      order.carrier =
        carrier;
    }

    if (
      dto.trackingUrl !==
      undefined
    ) {
      sellerShipment.trackingUrl =
        String(
          dto.trackingUrl,
        ).trim();
    }

    /* =========================================================================
       ORDER STATUS
    ========================================================================= */

    order.status =
      nextStatus as OrderStatus;

    /* =========================================================================
       ORDER DATES
    ========================================================================= */

    if (
      nextStatus ===
      OrderStatus.SHIPPED
    ) {
      order.shippedAt =
        new Date();
    }

    if (
      nextStatus ===
      OrderStatus.DELIVERED
    ) {
      order.deliveredAt =
        new Date();
    }

    if (
      nextStatus ===
      OrderStatus.CANCELLED
    ) {
      order.cancelledAt =
        new Date();
    }

    await order.save();

    /* =========================================================================
       EVENTS
    ========================================================================= */

    this.eventEmitter.emit(
      "order.status.updated",
      order,
    );

    if (
      nextStatus ===
      OrderStatus.PROCESSING
    ) {
      this.eventEmitter.emit(
        "order.processing",
        order,
      );
    }

    if (
      nextStatus ===
      OrderStatus.READY_TO_SHIP
    ) {
      this.eventEmitter.emit(
        "order.ready_to_ship",
        order,
      );
    }

    if (
      nextStatus ===
      OrderStatus.SHIPPED
    ) {
      this.eventEmitter.emit(
        "order.shipped",
        order,
      );
    }

    if (
      nextStatus ===
      OrderStatus.DELIVERED
    ) {
      this.eventEmitter.emit(
        "order.delivered",
        order,
      );
    }

    return order;
  }

  /* ==========================================================================
     CONFIRM PAYMENT
  ========================================================================== */

  async confirmPayment(
    id: string,
    paymentIntentId?: string,
  ) {
    const normalizedOrderId =
      this.requireValidObjectId(
        id,
        "order ID",
      );

    const order =
      await this.orderModel.findById(
        normalizedOrderId,
      );

    if (!order) {
      throw new NotFoundException(
        "Order not found",
      );
    }

    if (
      order.paymentStatus ===
      PaymentStatus.PAID
    ) {
      return order;
    }

    order.paymentStatus =
      PaymentStatus.PAID;

    order.status =
      OrderStatus.PAID;

    order.paidAt =
      new Date();

    if (paymentIntentId) {
      order.paymentIntentId =
        paymentIntentId;
    }

    await order.save();

    this.eventEmitter.emit(
      "order.paid",
      order,
    );

    this.eventEmitter.emit(
      "payment.confirmed",
      order,
    );

    return order;
  }
}