import {
api,
} from "../../../api/api";

import type {
Order,
} from "../types/Order";

/* ============================================================================
BASE URL
============================================================================ */

const BASE_URL = "/marketplace/orders";

/* ============================================================================
PAYMENT TYPES
============================================================================ */

export type PaymentMethod =
| "card"
| "moncash"
| "natcash"
| "cod";

export type PaymentStatus =
| "paid"
| "pending"
| "failed"
| "cancelled";

/* ============================================================================
ORDER STATUS
============================================================================ */

export type OrderStatus =
| "pending"
| "processing"
| "ready_to_ship"
| "shipped"
| "delivered"
| "cancelled"
| "refunded"
| string;

/* ============================================================================
CREATE ORDER REQUEST
============================================================================ */

export type CreateOrderRequest = {
items: Array<{
productId: string;
sellerId: string;

storeId?: string;

quantity: number;

/*
 * Compatibility field.
 *
 * The backend should NOT trust this price.
 * The backend should load the product from
 * MongoDB and calculate the real price.
 */
price: number;

}>;

/*

* Frontend estimates.
*
* The backend should recalculate the authoritative
* subtotal, discount, shipping, tax and total.
  */
  subtotal: number;

shippingCost: number;

tax: number;

discount?: number;

totalAmount: number;

/* ==========================================================================
SHIPPING ADDRESS
========================================================================== */

shippingAddress: {
fullName: string;

email?: string;

phone: string;

street: string;

houseOrApartmentNumber?: string;

neighborhood?: string;

address?: string;

apartment?: string;

city: string;

state?: string;

zipCode?: string;

country: string;

};

/* ==========================================================================
DELIVERY
========================================================================== */

deliveryMethod?: string;

/* ==========================================================================
PAYMENT
========================================================================== */

paymentMethod: PaymentMethod;

paymentStatus?: PaymentStatus;

/*

* Stripe PaymentIntent ID.
*
* Empty for:
* * MonCash
* * NatCash
* * Cash on Delivery
    */
    paymentIntentId?: string;

/*

* MonCash transaction/payment reference.
  */
  moncashTransactionId?: string;

/*

* NatCash transaction/payment reference.
  */
  natcashTransactionId?: string;
  };

/* ============================================================================
UPDATE ORDER STATUS REQUEST
============================================================================ */

export type UpdateOrderStatusRequest = {
/*

* Examples:
*
* processing
* ready_to_ship
* shipped
* delivered
* cancelled
  */
  status: OrderStatus;

/* ==========================================================================
SHIPPING / TRACKING
========================================================================== */

/*

* Seller-entered carrier.
*
* Examples:
* USPS
* UPS
* FedEx
* DHL
* Canada Post
* Other
* Seller's own carrier name
  */
  carrier?: string;

/*

* Seller-entered tracking number.
  */
  trackingNumber?: string;

/*

* Optional direct tracking URL.
*
* This is useful for:
* * USPS
* * UPS
* * FedEx
* * DHL
* * Custom carriers
    */
    trackingUrl?: string;

/*

* Current shipment status.
*
* Examples:
* label_created
* shipped
* in_transit
* out_for_delivery
* delivered
* exception
  */
  shipmentStatus?: string;
  };

/* ============================================================================
ORDER API
============================================================================ */

export const orderApi = {
/* ==========================================================================
CREATE ORDER
========================================================================== */

createOrder: async (
data: CreateOrderRequest,
): Promise<Order> => {
const response =
await api.post<Order>(
BASE_URL,
data,
);

return response.data;

},

/* ==========================================================================
CUSTOMER ORDERS
========================================================================== */

getOrders: async (): Promise<Order[]> => {
const response =
await api.get<Order[]>(
BASE_URL,
);


return response.data;
},

/* ==========================================================================
SELLER ORDERS
========================================================================== */

getSellerOrders: async (): Promise<Order[]> => {
const response =
await api.get<Order[]>(
`${BASE_URL}/seller`,
);

return response.data;

},

/* ==========================================================================
SELLER STORE ORDERS
========================================================================== */

getSellerStoreOrders: async (
storeId: string,
): Promise<Order[]> => {
if (!storeId) {
throw new Error(
"Store ID is required.",
);
}

const response =
  await api.get<Order[]>(
    `${BASE_URL}/seller/store/${storeId}`,
  );

return response.data;

},

/* ==========================================================================
SINGLE ORDER
========================================================================== */

getOrderById: async (
id: string,
): Promise<Order> => {
if (!id) {
throw new Error(
"Order ID is required.",
);
}

const response =
  await api.get<Order>(
    `${BASE_URL}/${id}`,
  );

return response.data;

},

/* ==========================================================================
UPDATE ORDER STATUS
========================================================================== */

updateStatus: async (
id: string,
data: UpdateOrderStatusRequest,
): Promise<Order> => {
if (!id) {
throw new Error(
"Order ID is required.",
);
}

if (!data) {
  throw new Error(
    "Order status update data is required.",
  );
}

if (!data.status) {
  throw new Error(
    "Order status is required.",
  );
}

const response =
  await api.patch<Order>(
    `${BASE_URL}/${id}/status`,
    data,
  );

return response.data;

},
};
