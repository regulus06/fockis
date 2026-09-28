import {
IsArray,
IsDateString,
IsIn,
IsNumber,
IsObject,
IsOptional,
IsString,
Min,
ValidateNested,
} from "class-validator";

import {
Type,
} from "class-transformer";

export type OrderPaymentMethod =
| "card"
| "moncash"
| "natcash"
| "cod";

/* ============================================================================
ORDER ITEM
============================================================================ */

export class OrderItemDto {
/*

* Optional cart-line identifier.
* This is metadata only and is never used as the authoritative product ID.
  */
  @IsOptional()
  @IsString()
  id?: string;

/*

* The backend uses this to load the authoritative Product.
  */
  @IsString()
  productId!: string;

/*

* Seller/store values supplied by the frontend are snapshots/hints.
* OrdersService validates them when supplied and otherwise derives them
* from the authoritative Product record.
  */
  @IsOptional()
  @IsString()
  sellerId?: string;

@IsOptional()
@IsString()
storeId?: string;

/*

* Product/store display metadata.
  */
  @IsOptional()
  @IsString()
  productName?: string;

@IsOptional()
@IsString()
name?: string;

@IsOptional()
@IsString()
title?: string;

@IsOptional()
@IsString()
productSlug?: string;

@IsOptional()
@IsString()
storeName?: string;

@IsOptional()
@IsString()
storeSlug?: string;

/*

* Client-side price snapshots.
*
* These are NOT authoritative.
* OrdersService must always resolve the actual price from Product.
  */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

@IsOptional()
@IsNumber()
@Min(0)
price?: number;

@IsOptional()
@IsNumber()
@Min(0)
maxQuantity?: number;

@IsOptional()
@IsDateString()
addedAt?: string;

@IsOptional()
@IsString()
productImage?: string;

@IsOptional()
@IsNumber()
@Min(0)
weight?: number;

/*

* Customer-selected quantity.
  */
  @IsNumber()
  @Min(1)
  quantity!: number;

/*

* Optional frontend calculation.
* The backend recalculates the authoritative value.
  */
  @IsOptional()
  @IsNumber()
  @Min(0)
  itemTotal?: number;

/*

* Optional structured metadata from the cart.
  */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
  }

/* ============================================================================
SHIPPING ADDRESS
============================================================================ */

export class ShippingAddressDto {
@IsString()
fullName!: string;

@IsOptional()
@IsString()
email?: string;

@IsString()
phone!: string;

/*

* Frontend checkout address format.
  */
  @IsOptional()
  @IsString()
  line1?: string;

@IsOptional()
@IsString()
line2?: string;

@IsOptional()
@IsString()
postalCode?: string;

@IsOptional()
@IsString()
countryCode?: string;

/*

* Existing backend-normalized address format.
  */
  @IsOptional()
  @IsString()
  houseOrApartmentNumber?: string;

@IsOptional()
@IsString()
neighborhood?: string;

@IsOptional()
@IsString()
street?: string;

@IsOptional()
@IsString()
apartment?: string;

@IsString()
city!: string;

@IsOptional()
@IsString()
state?: string;

@IsOptional()
@IsString()
zipCode?: string;

@IsString()
country!: string;
}

/* ============================================================================
CREATE ORDER
============================================================================ */

export class CreateOrderDto {
@IsArray()
@ValidateNested({
each: true,
})
@Type(() => OrderItemDto)
items!: OrderItemDto[];

/*

* Checkout totals are supplied as checkout snapshots.
*
* OrdersService must independently calculate authoritative product
* pricing before creating the order.
  */
  @IsNumber()
  @Min(0)
  subtotal!: number;

@IsNumber()
@Min(0)
shippingCost!: number;

@IsNumber()
@Min(0)
tax!: number;

@IsOptional()
@IsNumber()
@Min(0)
discount?: number;

/*

* Customer-selected gratuity.
  */
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

@IsNumber()
@Min(0)
totalAmount!: number;

@ValidateNested()
@Type(() => ShippingAddressDto)
shippingAddress!: ShippingAddressDto;

@IsOptional()
@ValidateNested()
@Type(() => ShippingAddressDto)
billingAddress?: ShippingAddressDto;

@IsOptional()
@IsString()
deliveryMethod?: string;

@IsString()
@IsIn([
"card",
"moncash",
"natcash",
"cod",
])
paymentMethod!: OrderPaymentMethod;

/*

* This is accepted for frontend compatibility only.
* The backend must determine the actual payment status.
  */
  @IsOptional()
  @IsIn([
  "paid",
  "pending",
  "failed",
  "cancelled",
  ])
  paymentStatus?:
  | "paid"
  | "pending"
  | "failed"
  | "cancelled";

@IsOptional()
@IsString()
paymentIntentId?: string;

@IsOptional()
@IsString()
moncashTransactionId?: string;

@IsOptional()
@IsString()
natcashTransactionId?: string;

@IsOptional()
@IsString()
currency?: string;

@IsOptional()
@IsNumber()
@Min(0)
exchangeRate?: number;
}
