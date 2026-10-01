import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type { CartLineItem } from "../types/cart.types";

import type {
  Order,
  OrderShippingAddress,
} from "../types/order.types";

import type {
  ShippingEstimate,
  ShippingMethodOption,
} from "../types/shipping.types";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

export type CheckoutPaymentMethod =
  | "card"
  | "moncash"
  | "natcash"
  | "cod";

export interface PlaceOrderRequest {
  items: CartLineItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  shippingAddress: OrderShippingAddress;
  paymentMethod: CheckoutPaymentMethod;
  currency?: string;
  discount?: number;
  deliveryMethod?: string;
  paymentStatus?:
    | "paid"
    | "pending"
    | "failed"
    | "cancelled";
  paymentIntentId?: string;
  moncashTransactionId?: string;
  natcashTransactionId?: string;
}

interface BackendShippingEstimate {
  country: string;
  weight: number;
  price: number;
  eta: string;
  carrier: string;
}

function getAuthToken(): string | null {
  const keys = [
    "access_token",
    "accessToken",
    "token",
    "authToken",
    "jwt",
    "fockis_token",
    "fockis_auth_token",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

async function extractErrorMessage(
  response: Response,
): Promise<string> {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await response.json();

      if (
        body &&
        typeof body === "object" &&
        typeof body.message === "string"
      ) {
        return body.message;
      }

      if (
        body &&
        typeof body === "object" &&
        Array.isArray(body.message)
      ) {
        return body.message.join(", ");
      }

      if (
        body &&
        typeof body === "object" &&
        typeof body.error === "string"
      ) {
        return body.error;
      }
    } catch {
      // Ignore invalid JSON.
    }
  } else {
    try {
      const text = await response.text();

      if (text) {
        return text;
      }
    } catch {
      // Ignore response parsing errors.
    }
  }

  return `Request failed with status ${response.status}`;
}

async function post<T>(
  path: string,
  body: unknown,
  authenticated = true,
): Promise<T> {
  const token = authenticated
    ? getAuthToken()
    : null;

  if (authenticated && !token) {
    throw new Error("UNAUTHORIZED");
  }

  const headers = new Headers();

  headers.set(
    "Accept",
    "application/json",
  );

  headers.set(
    "Content-Type",
    "application/json",
  );

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const url = buildUrl(path);

  console.log("[CHECKOUT API] POST", url);

  if (path === "/fockis-shop/orders") {
    console.log(
      "[CHECKOUT API] Sending order request:",
      body,
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });

  console.log(
    "[CHECKOUT API] Response:",
    response.status,
    response.statusText,
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    if (response.status === 403) {
      throw new Error("FORBIDDEN");
    }

    if (response.status === 404) {
      throw new Error(
        "CHECKOUT_ENDPOINT_NOT_FOUND",
      );
    }

    throw new Error(
      await extractErrorMessage(response),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    if (!text) {
      return undefined as T;
    }

    return text as T;
  }

  return response.json() as Promise<T>;
}

function parseEta(
  eta: string,
): {
  min: number;
  max: number;
} {
  const normalizedEta = String(
    eta || "",
  ).trim();

  const range = normalizedEta.match(
    /(\d+)\s*-\s*(\d+)/,
  );

  if (range) {
    return {
      min: Number(range[1]),
      max: Number(range[2]),
    };
  }

  const single = normalizedEta.match(
    /(\d+)/,
  );

  if (single) {
    const days = Number(single[1]);

    return {
      min: days,
      max: days,
    };
  }

  return {
    min: 2,
    max: 4,
  };
}

function createShippingOption(
  estimate: BackendShippingEstimate,
  storeId: string,
): ShippingMethodOption {
  const country = String(
    estimate.country || "",
  )
    .trim()
    .toLowerCase();

  const domestic =
    country === "us" ||
    country === "usa" ||
    country === "united states" ||
    country === "united states of america";

  const eta =
    String(estimate.eta || "").trim() ||
    "2-4 days";

  const price =
    Number(estimate.price) || 0;

  return {
    id: "standard",
    storeId,
    type: domestic
      ? "national_delivery"
      : "international",
    label: estimate.carrier
      ? `${estimate.carrier} · ${eta}`
      : `Standard Shipping · ${eta}`,
    price,
    estimatedDays: parseEta(eta),
  };
}

function createShippingEstimate(
  estimate: BackendShippingEstimate,
  storeId: string,
): ShippingEstimate {
  const option = createShippingOption(
    estimate,
    storeId,
  );

  return {
    storeId,
    options: [option],
    selectedOptionId: option.id,
  };
}

function getCartStoreIds(
  items: CartLineItem[],
): string[] {
  const storeIds = new Set<string>();

  for (const item of items) {
    const storeId = String(
      item.storeId || "",
    ).trim();

    if (storeId) {
      storeIds.add(storeId);
    }
  }

  if (storeIds.size === 0) {
    storeIds.add("fockis-shop");
  }

  return Array.from(storeIds);
}

function getShippingCountry(
  items: CartLineItem[],
): string {
  for (const item of items) {
    const value = getNestedString(
      item,
      [
        "country",
        "shippingCountry",
        "countryCode",
        "sellerCountry",
        "storeCountry",
      ],
    );

    if (value) {
      return value;
    }
  }

  return "United States";
}

function calculateCartWeight(
  items: CartLineItem[],
): number {
  let total = 0;

  for (const item of items) {
    const quantity =
      getNestedNumber(
        item,
        ["quantity"],
      ) ?? 1;

    const weight =
      getNestedNumber(
        item,
        [
          "weight",
          "productWeight",
          "shippingWeight",
        ],
      ) ?? 1;

    total +=
      Math.max(0.01, weight) *
      Math.max(1, quantity);
  }

  return Number(
    Math.max(0.01, total).toFixed(2),
  );
}

function getNestedString(
  value: unknown,
  keys: string[],
): string | undefined {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return undefined;
  }

  const record =
    value as Record<string, unknown>;

  for (const key of keys) {
    const candidate =
      record[key];

    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return undefined;
}

function getNestedNumber(
  value: unknown,
  keys: string[],
): number | undefined {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return undefined;
  }

  const record =
    value as Record<string, unknown>;

  for (const key of keys) {
    const candidate =
      record[key];

    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate)
    ) {
      return candidate;
    }

    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      const parsed =
        Number(candidate);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

export async function getShippingEstimates(
  items: CartLineItem[],
): Promise<ShippingEstimate[]> {
  if (!items.length) {
    return [];
  }

  const country =
    getShippingCountry(items);

  const weight =
    calculateCartWeight(items);

  console.log(
    "[CHECKOUT SHIPPING] Request:",
    {
      country,
      weight,
      storeIds: getCartStoreIds(items),
    },
  );

  const backendEstimate =
    await post<BackendShippingEstimate>(
      "/fockis-shop/shipping/estimate",
      {
        country,
        weight,
      },
      true,
    );

  console.log(
    "[CHECKOUT SHIPPING] Backend estimate:",
    backendEstimate,
  );

  const storeIds =
    getCartStoreIds(items);

  const estimates =
    storeIds.map((storeId) =>
      createShippingEstimate(
        backendEstimate,
        storeId,
      ),
    );

  console.log(
    "[CHECKOUT SHIPPING] Normalized estimates:",
    estimates,
  );

  return estimates;
}

export async function placeOrder(
  requestData: PlaceOrderRequest,
): Promise<Order> {
  console.log(
    "[CHECKOUT] placeOrder() reached",
  );

  console.log(
    "[CHECKOUT] Order payload:",
    requestData,
  );

  if (!requestData.items.length) {
    throw new Error("CART_EMPTY");
  }

  if (
    !Number.isFinite(
      requestData.subtotal,
    ) ||
    requestData.subtotal < 0
  ) {
    throw new Error(
      "INVALID_SUBTOTAL",
    );
  }

  if (
    !Number.isFinite(
      requestData.shippingCost,
    ) ||
    requestData.shippingCost < 0
  ) {
    throw new Error(
      "INVALID_SHIPPING_COST",
    );
  }

  if (
    !Number.isFinite(
      requestData.tax,
    ) ||
    requestData.tax < 0
  ) {
    throw new Error(
      "INVALID_TAX",
    );
  }

  if (
    !Number.isFinite(
      requestData.totalAmount,
    ) ||
    requestData.totalAmount < 0
  ) {
    throw new Error(
      "INVALID_TOTAL",
    );
  }

  if (
    requestData.paymentMethod === "card" &&
    !requestData.paymentIntentId
  ) {
    throw new Error(
      "PAYMENT_INTENT_REQUIRED",
    );
  }

  return post<Order>(
    "/fockis-shop/orders",
    requestData,
    true,
  );
}

export const checkoutApi = {
  getShippingEstimates,
  placeOrder,
};

export default checkoutApi;