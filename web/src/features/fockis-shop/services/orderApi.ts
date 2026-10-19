import { FOCKIS_API_URL } from "../../../config/fockisConfig";
import type { Order } from "../types/order.types";

/**
 * Fockis Shop — Order API
 *
 * Backend endpoints:
 * GET /fockis-shop/orders
 * GET /fockis-shop/orders/:orderId
 *
 * The backend identifies the customer from the authenticated session/JWT.
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

const ORDERS_PATH = "/fockis-shop/orders";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAuthToken(): string | null {
  const tokenKeys = [
    "access_token",
    "accessToken",
    "token",
    "authToken",
    "jwt",
    "fockis_token",
    "fockis_auth_token",
  ];

  let bestToken: string | null = null;
  let bestIssuedAt = -1;
  let bestPriority = Number.MAX_SAFE_INTEGER;

  for (let index = 0; index < tokenKeys.length; index += 1) {
    const token = localStorage.getItem(tokenKeys[index])?.trim();
    if (!token) continue;

    let issuedAt = 0;

    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
        ) as { exp?: unknown; iat?: unknown };

        if (typeof payload.exp === "number" && payload.exp <= Math.floor(Date.now() / 1000)) {
          continue;
        }

        if (typeof payload.iat === "number") {
          issuedAt = payload.iat;
        }
      }
    } catch {
      // Non-JWT tokens are still allowed; the server validates them.
    }

    if (
      issuedAt > bestIssuedAt ||
      (issuedAt === bestIssuedAt && index < bestPriority)
    ) {
      bestToken = token;
      bestIssuedAt = issuedAt;
      bestPriority = index;
    }
  }

  return bestToken;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body: unknown = await response.json();
      if (isRecord(body)) {
        if (typeof body.message === "string") return body.message;
        if (Array.isArray(body.message)) return body.message.join(", ");
        if (typeof body.error === "string") return body.error;
      }
    } catch {
      // Fall through to the status message.
    }
  } else {
    try {
      const text = await response.text();
      if (text) return text;
    } catch {
      // Fall through to the status message.
    }
  }

  return `Request failed with status ${response.status}`;
}

async function request<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers({ Accept: "application/json" });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = buildUrl(path);
  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("UNAUTHORIZED");
    if (response.status === 403) throw new Error("FORBIDDEN");
    if (response.status === 404) throw new Error("ORDER_NOT_FOUND");
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (!text) return undefined as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("The order API returned an unexpected response.");
    }
  }

  return (await response.json()) as T;
}

function firstDefined(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function unwrapOne(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (isRecord(value.data)) return value.data;
  if (isRecord(value.order)) return value.order;
  return value;
}

function unwrapOrderList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  for (const key of ["orders", "items", "results", "data"]) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      for (const nestedKey of ["orders", "items", "results"]) {
        if (Array.isArray(candidate[nestedKey])) {
          return candidate[nestedKey] as unknown[];
        }
      }
    }
  }

  return [];
}

function normalizeAddress(value: unknown): UnknownRecord {
  const address = isRecord(value) ? value : {};

  return {
    ...address,
    fullName: asString(firstDefined(address, ["fullName", "name", "recipientName"])),
    line1: asString(firstDefined(address, ["line1", "street", "addressLine1", "address"])),
    line2: asString(firstDefined(address, ["line2", "apartment", "addressLine2"])),
    city: asString(address.city),
    state: asString(firstDefined(address, ["state", "region", "province"])),
    postalCode: asString(firstDefined(address, ["postalCode", "zipCode", "zip"])),
    country: asString(address.country),
  };
}

function normalizeItem(value: unknown, index: number): UnknownRecord {
  const item = isRecord(value) ? value : {};
  const quantity = Math.max(1, asNumber(item.quantity, 1));
  const unitPrice = asNumber(
    firstDefined(item, ["unitPrice", "price", "unit_price", "pricePerUnit"]),
    0,
  );
  const lineTotal = asNumber(
    firstDefined(item, ["lineTotal", "totalPrice", "line_total", "total"]),
    unitPrice * quantity,
  );

  return {
    ...item,
    id: asString(firstDefined(item, ["id", "_id", "productId", "product_id"]), `item-${index}`),
    productId: asString(firstDefined(item, ["productId", "product_id", "id", "_id"])),
    productName: asString(firstDefined(item, ["productName", "name", "title"]), "Product"),
    productEmoji: asString(item.productEmoji, "📦"),
    quantity,
    unitPrice,
    lineTotal,
    sellerId: asString(firstDefined(item, ["sellerId", "seller", "seller_id"])),
    storeId: asString(firstDefined(item, ["storeId", "store", "store_id"])),
    storeName: asString(firstDefined(item, ["storeName", "storeTitle"]), "Store"),
    status: asString(item.status, "processing"),
    trackingNumber: asString(firstDefined(item, ["trackingNumber", "tracking_number"])),
  };
}

function normalizeOrder(value: unknown): Order {
  const raw = unwrapOne(value);
  if (!isRecord(raw)) {
    throw new Error("The order API returned an invalid order.");
  }

  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.orderItems)
      ? raw.orderItems
      : Array.isArray(raw.products)
        ? raw.products
        : [];

  const items = rawItems.map(normalizeItem);

  const existingGroups = Array.isArray(raw.sellerGroups)
    ? raw.sellerGroups
    : Array.isArray(raw.seller_groups)
      ? raw.seller_groups
      : [];

  const sellerGroups: UnknownRecord[] = existingGroups
    .filter(isRecord)
    .map((group, groupIndex) => {
      const groupItems = Array.isArray(group.items) ? group.items : [];
      return {
        ...group,
        id: asString(firstDefined(group, ["id", "_id", "storeId"]), `group-${groupIndex}`),
        storeName: asString(firstDefined(group, ["storeName", "name"]), "Store"),
        status: asString(group.status, "processing"),
        trackingNumber: asString(firstDefined(group, ["trackingNumber", "tracking_number"])),
        items: groupItems.map(normalizeItem),
      };
    });

  if (sellerGroups.length === 0 && items.length > 0) {
    const groups = new Map<string, UnknownRecord>();

    for (const item of items) {
      const key = asString(item.storeId || item.sellerId, "default-store");
      let group = groups.get(key);

      if (!group) {
        group = {
          id: key,
          storeName: asString(item.storeName, "Store"),
          status: asString(item.status, "processing"),
          trackingNumber: asString(item.trackingNumber),
          items: [],
        };
        groups.set(key, group);
      }

      (group.items as UnknownRecord[]).push(item);
    }

    sellerGroups.push(...groups.values());
  }

  const subtotal = asNumber(
    firstDefined(raw, ["subtotal", "subTotal", "itemsSubtotal"]),
    items.reduce((sum, item) => sum + asNumber(item.lineTotal), 0),
  );
  const shippingTotal = asNumber(
    firstDefined(raw, ["shippingTotal", "shippingCost", "shipping", "shippingAmount"]),
    0,
  );
  const taxTotal = asNumber(
    firstDefined(raw, ["taxTotal", "tax", "taxAmount"]),
    0,
  );
  const total = asNumber(
    firstDefined(raw, ["total", "totalAmount", "grandTotal", "amountTotal"]),
    subtotal + shippingTotal + taxTotal,
  );

  const placedAt = firstDefined(raw, [
    "placedAt",
    "createdAt",
    "orderDate",
    "created_at",
    "dateCreated",
  ]);

  const normalized: UnknownRecord = {
    ...raw,
    id: asString(firstDefined(raw, ["id", "_id", "orderId"])),
    orderNumber: asString(firstDefined(raw, ["orderNumber", "number", "reference"]), "Order"),
    placedAt: asString(placedAt),
    items,
    sellerGroups,
    subtotal,
    shippingTotal,
    taxTotal,
    total,
    shippingAddress: normalizeAddress(
      firstDefined(raw, ["shippingAddress", "shipping_address", "deliveryAddress"]),
    ),
    paymentStatus: asString(firstDefined(raw, ["paymentStatus", "payment_status", "status"]), "pending"),
    invoiceNumber: asString(firstDefined(raw, ["invoiceNumber", "invoice", "invoice_number"])),
    paymentIntentId: asString(firstDefined(raw, ["paymentIntentId", "paymentIntent", "payment_intent_id"])),
    deliveryMethod: asString(firstDefined(raw, ["deliveryMethod", "shippingMethod", "delivery_method"])),
    carrier: asString(firstDefined(raw, ["carrier", "shippingCarrier"])),
    trackingNumber: asString(firstDefined(raw, ["trackingNumber", "tracking_number"])),
  };

  return normalized as unknown as Order;
}

// ============================================================================
// LIST CURRENT USER ORDERS
// ============================================================================

export async function listMyOrders(): Promise<Order[]> {
  const result = await request<unknown>(ORDERS_PATH);
  return unwrapOrderList(result).map(normalizeOrder);
}

// ============================================================================
// GET ORDER BY ID
// ============================================================================

export async function getOrderById(orderId: string): Promise<Order | null> {
  const normalizedId = orderId?.trim();
  if (!normalizedId) return null;

  try {
    const result = await request<unknown>(
      `${ORDERS_PATH}/${encodeURIComponent(normalizedId)}`,
    );

    if (result == null) return null;
    return normalizeOrder(result);
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

export const orderApi = {
  listMyOrders,
  getOrderById,
};

export default orderApi;
