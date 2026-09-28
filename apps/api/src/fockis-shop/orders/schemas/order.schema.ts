import {
Prop,
Schema,
SchemaFactory,
} from "@nestjs/mongoose";

import {
Document,
Types,
} from "mongoose";

/* ============================================================================
ORDER DOCUMENT
============================================================================ */

export type OrderDocument =
Order & Document;

/* ============================================================================
ORDER STATUS
============================================================================ */

export enum OrderStatus {
PENDING = "pending",
PAID = "paid",
PROCESSING = "processing",
READY_TO_SHIP = "ready_to_ship",
SHIPPED = "shipped",
IN_TRANSIT = "in_transit",
OUT_FOR_DELIVERY = "out_for_delivery",
DELIVERED = "delivered",
CANCELLED = "cancelled",
REFUNDED = "refunded",
RETURN_REQUESTED = "return_requested",
RETURNED = "returned",
}

/* ============================================================================
PAYMENT STATUS
============================================================================ */

export enum PaymentStatus {
PENDING = "pending",
PAID = "paid",
FAILED = "failed",
REFUNDED = "refunded",
PARTIALLY_REFUNDED = "partially_refunded",
}

/* ============================================================================
SHIPMENT STATUS
============================================================================ */

export enum ShipmentStatus {
PENDING = "pending",
PROCESSING = "processing",
READY_TO_SHIP = "ready_to_ship",
SHIPPED = "shipped",
IN_TRANSIT = "in_transit",
OUT_FOR_DELIVERY = "out_for_delivery",
DELIVERED = "delivered",
EXCEPTION = "exception",
CANCELLED = "cancelled",
}

/* ============================================================================
ORDER ITEM
============================================================================ */

@Schema({
_id: true,
})
export class OrderItem {
@Prop({
type: Types.ObjectId,
ref: "Product",
required: true,
})
product!: Types.ObjectId;

@Prop({
type: Types.ObjectId,
ref: "User",
required: true,
})
seller!: Types.ObjectId;

@Prop({
type: Types.ObjectId,
ref: "Store",
required: true,
})
storeId!: Types.ObjectId;

@Prop({
required: true,
default: "",
})
productName!: string;

@Prop({
default: "",
})
productImage!: string;

/*

* Cart snapshot metadata.
*
* These fields preserve useful information from checkout without
* becoming the source of truth for pricing, inventory, seller,
* or store ownership.
  */

@Prop({
default: "",
})
cartItemId!: string;

@Prop({
default: "",
})
productSlug!: string;

@Prop({
default: "",
})
storeName!: string;

@Prop({
default: "",
})
storeSlug!: string;

@Prop({
min: 0,
default: 0,
})
unitPrice!: number;

/*

* Price supplied by the frontend at checkout.
*
* This is retained only as a historical snapshot.
* The `price` field remains the authoritative order price.
  */
  @Prop({
  min: 0,
  default: 0,
  })
  clientPrice!: number;

@Prop({
min: 0,
default: 0,
})
maxQuantity!: number;

@Prop({
type: Date,
default: null,
})
addedAt!: Date | null;

@Prop({
min: 0,
default: 0,
})
weight!: number;

@Prop({
type: Object,
default: {},
})
metadata!: Record<string, unknown>;

@Prop({
required: true,
min: 1,
})
quantity!: number;

/*

* Authoritative backend price.
  */
  @Prop({
  required: true,
  min: 0,
  })
  price!: number;

/*

* Backend-calculated quantity × authoritative price.
  */
  @Prop({
  required: true,
  min: 0,
  })
  itemTotal!: number;
  }

export const OrderItemSchema =
SchemaFactory.createForClass(
OrderItem,
);

/* ============================================================================
ORDER ADDRESS
============================================================================ */

@Schema({
_id: false,
})
export class OrderAddress {
@Prop({
required: true,
default: "",
})
fullName!: string;

@Prop({
default: "",
})
email!: string;

@Prop({
required: true,
default: "",
})
phone!: string;

@Prop({
required: true,
default: "",
})
houseOrApartmentNumber!: string;

@Prop({
default: "",
})
neighborhood!: string;

@Prop({
default: "",
})
street!: string;

@Prop({
default: "",
})
apartment!: string;

@Prop({
required: true,
default: "",
})
city!: string;

@Prop({
default: "",
})
state!: string;

@Prop({
default: "",
})
zipCode!: string;

@Prop({
required: true,
default: "US",
})
country!: string;
}

export const OrderAddressSchema =
SchemaFactory.createForClass(
OrderAddress,
);

/* ============================================================================
ORDER SHIPMENT
============================================================================ */

@Schema({
_id: true,
timestamps: true,
})
export class OrderShipment {
@Prop({
type: Types.ObjectId,
ref: "User",
required: true,
})
seller!: Types.ObjectId;

@Prop({
type: Types.ObjectId,
ref: "Store",
required: true,
})
storeId!: Types.ObjectId;

@Prop({
type: [Types.ObjectId],
default: [],
})
itemIds!: Types.ObjectId[];

@Prop({
type: String,
enum: ShipmentStatus,
default: ShipmentStatus.PENDING,
})
status!: ShipmentStatus;

@Prop({
type: String,
default: "",
})
carrier!: string;

@Prop({
type: String,
default: "",
})
trackingNumber!: string;

@Prop({
type: String,
default: "",
})
trackingUrl!: string;

@Prop({
type: Date,
default: null,
})
estimatedDeliveryDate!: Date | null;

@Prop({
type: Date,
default: null,
})
shippedAt!: Date | null;

@Prop({
type: Date,
default: null,
})
deliveredAt!: Date | null;
}

export const OrderShipmentSchema =
SchemaFactory.createForClass(
OrderShipment,
);

/* ============================================================================
ORDER
============================================================================ */

@Schema({
timestamps: true,
})
export class Order {
@Prop({
required: true,
unique: true,
index: true,
})
orderNumber!: string;

@Prop({
required: true,
unique: true,
index: true,
})
invoiceNumber!: string;

@Prop({
type: Types.ObjectId,
ref: "User",
required: true,
index: true,
})
customer!: Types.ObjectId;

@Prop({
default: "",
})
customerName!: string;

@Prop({
default: "",
})
customerEmail!: string;

@Prop({
default: "",
})
customerPhone!: string;

@Prop({
type: [OrderItemSchema],
default: [],
})
items!: OrderItem[];

@Prop({
type: OrderAddressSchema,
required: true,
})
shippingAddress!: OrderAddress;

@Prop({
type: OrderAddressSchema,
required: true,
})
billingAddress!: OrderAddress;

@Prop({
required: true,
min: 0,
default: 0,
})
subtotal!: number;

@Prop({
required: true,
min: 0,
default: 0,
})
shippingCost!: number;

@Prop({
required: true,
min: 0,
default: 0,
})
tax!: number;

@Prop({
required: true,
min: 0,
default: 0,
})
discount!: number;

@Prop({
required: true,
min: 0,
default: 0,
})
tipAmount!: number;

@Prop({
required: true,
min: 0,
})
totalAmount!: number;

@Prop({
default: "standard",
})
deliveryMethod!: string;

@Prop({
required: true,
})
paymentMethod!: string;

@Prop({
type: String,
enum: PaymentStatus,
default: PaymentStatus.PENDING,
})
paymentStatus!: PaymentStatus;

@Prop({
default: "",
})
paymentIntentId!: string;

@Prop({
default: "",
})
moncashTransactionId!: string;

/*

* Correct spelling for new orders.
  */
  @Prop({
  default: "",
  })
  natcashTransactionId!: string;

/*

* Legacy field retained so existing orders remain compatible.
  */
  @Prop({
  default: "",
  })
  natchTransactionId!: string;

@Prop({
default: "USD",
})
currency!: string;

@Prop({
min: 0,
default: 1,
})
exchangeRate!: number;

@Prop({
type: String,
enum: OrderStatus,
default: OrderStatus.PENDING,
index: true,
})
status!: OrderStatus;

@Prop({
type: [OrderShipmentSchema],
default: [],
})
shipments!: OrderShipment[];

@Prop({
default: "",
})
trackingNumber!: string;

@Prop({
default: "",
})
carrier!: string;

@Prop({
type: Date,
default: null,
})
paidAt!: Date | null;

@Prop({
type: Date,
default: null,
})
shippedAt!: Date | null;

@Prop({
type: Date,
default: null,
})
deliveredAt!: Date | null;

@Prop({
type: Date,
default: null,
})
cancelledAt!: Date | null;

@Prop({
type: Date,
default: null,
})
orderDate!: Date | null;

@Prop({
default: "",
})
month!: string;

@Prop({
default: 0,
})
year!: number;
}

export const OrderSchema =
SchemaFactory.createForClass(
Order,
);

/* ============================================================================
INDEXES
============================================================================ */

OrderSchema.index({
customer: 1,
createdAt: -1,
});

OrderSchema.index({
"items.seller": 1,
createdAt: -1,
});

OrderSchema.index({
"items.storeId": 1,
createdAt: -1,
});

OrderSchema.index({
status: 1,
createdAt: -1,
});

OrderSchema.index({
paymentStatus: 1,
createdAt: -1,
});

OrderSchema.index({
paymentMethod: 1,
createdAt: -1,
});
