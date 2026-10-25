import { api } from "../../../api/api";
import type { Order } from "../types/Order";

/**
 * Fockis Shop order API.
 *
 * IMPORTANT:
 * This service intentionally uses /fockis-shop/orders.
 * Do not change this back to /marketplace/orders.
 */
const BASE_URL = "/fockis-shop/orders";

export type PaymentMethod = "card" | "moncash" | "natcash" | "cod";

export type PaymentStatus =
  | "paid"
  | "pending"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "return_requested"
  | "returned"
  | string;

export type CreateOrderRequest = {
  items: Array<{
    productId: string;
    sellerId: string;
    storeId?: string;
    quantity: number;

    /**
     * Compatibility/display field only.
     * The backend must calculate the authoritative price from the database.
     */
    price: number;
  }>;

  subtotal: number;
  shippingCost: number;
  tax: number;
  discount?: number;
  totalAmount: number;

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

  deliveryMethod?: string;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paymentIntentId?: string;
  moncashTransactionId?: string;
  natcashTransactionId?: string;
};

export type UpdateOrderStatusRequest = {
  status: OrderStatus;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shipmentStatus?: string;
};

/**
 * Shipping address fields used when correcting a recipient address
 * before purchasing a Shippo shipping label.
 */
export type UpdateShippingAddressRequest = {
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

type ApiOrderResponse =
  | Order[]
  | {
      data?: Order[];
      orders?: Order[];
      results?: Order[];
    };

function normalizeOrders(response: ApiOrderResponse): Order[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.orders)) return response.orders;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export const orderApi = {
  /** Create a Fockis Shop order. */
  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await api.post<Order>(BASE_URL, data);
    return response.data;
  },

  /** Fetch the signed-in customer's Fockis Shop orders. */
  getOrders: async (): Promise<Order[]> => {
    const response = await api.get<ApiOrderResponse>(BASE_URL);
    return normalizeOrders(response.data);
  },

  /**
   * Fetch seller orders.
   * If a store ID is supplied, use the store-specific Fockis Shop endpoint.
   */
  getSellerOrders: async (storeId?: string): Promise<Order[]> => {
    const endpoint = storeId
      ? `${BASE_URL}/seller/store/${encodeURIComponent(storeId)}`
      : `${BASE_URL}/seller`;

    const response = await api.get<ApiOrderResponse>(endpoint);
    return normalizeOrders(response.data);
  },

  /** Explicit store-specific alias, for existing callers. */
  getSellerStoreOrders: async (storeId: string): Promise<Order[]> => {
    if (!storeId?.trim()) {
      throw new Error("Store ID is required.");
    }

    const response = await api.get<ApiOrderResponse>(
      `${BASE_URL}/seller/store/${encodeURIComponent(storeId)}`,
    );

    return normalizeOrders(response.data);
  },

  /** Fetch one Fockis Shop order by ID. */
  getOrderById: async (id: string): Promise<Order> => {
    if (!id?.trim()) {
      throw new Error("Order ID is required.");
    }

    const response = await api.get<Order>(
      `${BASE_URL}/${encodeURIComponent(id)}`,
    );

    return response.data;
  },

  /** Update fulfillment status and optional shipment tracking information. */
  updateStatus: async (
    id: string,
    data: UpdateOrderStatusRequest,
  ): Promise<Order> => {
    if (!id?.trim()) {
      throw new Error("Order ID is required.");
    }

    if (!data || !data.status) {
      throw new Error("Order status is required.");
    }

    const response = await api.patch<Order>(
      `${BASE_URL}/${encodeURIComponent(id)}/status`,
      data,
    );

    return response.data;
  },

  /**
   * Correct the recipient's shipping address before purchasing a label.
   *
   * Requires the backend route:
   * PATCH /fockis-shop/orders/:id/shipping-address
   *
   * The backend must verify seller authorization and reject changes
   * when shipment fulfillment or label purchase has already occurred.
   */
  updateShippingAddress: async (
    id: string,
    data: UpdateShippingAddressRequest,
  ): Promise<Order> => {
    if (!id?.trim()) {
      throw new Error("Order ID is required.");
    }

    if (!data) {
      throw new Error("Shipping address is required.");
    }

    const requiredFields: Array<keyof UpdateShippingAddressRequest> = [
      "fullName",
      "phone",
      "street",
      "city",
      "country",
    ];

    for (const field of requiredFields) {
      if (!String(data[field] ?? "").trim()) {
        throw new Error(
          `Shipping address field "${field}" is required.`,
        );
      }
    }

    if (
      data.country.trim().toLowerCase() === "us" ||
      data.country.trim().toLowerCase() === "usa" ||
      data.country.trim().toLowerCase() === "united states" ||
      data.country.trim().toLowerCase() === "united states of america"
    ) {
      if (!data.state?.trim()) {
        throw new Error("State is required for US shipping addresses.");
      }

      if (!data.zipCode?.trim()) {
        throw new Error("ZIP code is required for US shipping addresses.");
      }
    }

    const response = await api.patch<Order>(
      `${BASE_URL}/${encodeURIComponent(id)}/shipping-address`,
      data,
    );

    return response.data;
  },
};
