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

/**
 * Fallback package used when a product has no saved weight/dimensions.
 * Values are per unit, in pounds and inches.
 *
 * Set VITE_SHIPPING_STRICT_PARCEL=true to disable the fallback and
 * block checkout instead (the old behavior).
 */
const DEFAULT_ITEM_PACKAGE = {
  weightLb: 1,
  lengthIn: 10,
  widthIn: 8,
  heightIn: 4,
} as const;

const STRICT_PARCEL =
  String(import.meta.env.VITE_SHIPPING_STRICT_PARCEL ?? "").toLowerCase() === "true";

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
  paymentStatus?: "paid" | "pending" | "failed" | "cancelled";
  paymentIntentId?: string;
  moncashTransactionId?: string;
  natcashTransactionId?: string;
}

export interface ShippoCheckoutDestination {
  fullName: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  email: string;
  phone?: string;
}

interface ShippoCheckoutRate {
  rateId: string;
  carrier: string;
  service: string;
  amount: number;
  currency: string;
  estimatedDays: number | null;
}

interface ShippoCheckoutRatesResponse {
  storeId: string;
  shippoShipmentId: string;
  rates: ShippoCheckoutRate[];
}

interface ShippoParcel {
  weight: number;
  massUnit: "lb";
  length: number;
  width: number;
  height: number;
  distanceUnit: "in";
}

type AnyRecord = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const asRecord = (value: unknown): AnyRecord | undefined =>
  value !== null && typeof value === "object" ? (value as AnyRecord) : undefined;

const readNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const positiveNumber = (value: unknown): number | undefined => {
  const n = readNumber(value);
  return n !== undefined && n > 0 ? n : undefined;
};

const readPath = (source: unknown, path: string[]): unknown => {
  let current: unknown = source;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }
  return current;
};

/** First strictly positive number found among the given paths. */
const firstPositive = (source: unknown, paths: string[][]): number | undefined => {
  for (const path of paths) {
    const value = positiveNumber(readPath(source, path));
    if (value !== undefined) return value;
  }
  return undefined;
};

const firstString = (source: unknown, paths: string[][], fallback: string): string => {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  return fallback;
};

/** Expands a field path to every place a cart line may carry it. */
const withPrefixes = (path: string[]): string[][] => [
  path,
  ["shipping", ...path],
  ["package", ...path],
  ["product", ...path],
  ["product", "shipping", ...path],
  ["product", "package", ...path],
];

const expand = (...paths: string[][]): string[][] => paths.flatMap(withPrefixes);

const weightToLb = (value: number, unit: string): number => {
  switch (unit) {
    case "oz": return value / 16;
    case "kg": return value * 2.2046226218;
    case "g": return value / 453.59237;
    case "lb":
    case "lbs":
    default: return value;
  }
};

const dimensionToIn = (value: number, unit: string): number => {
  switch (unit) {
    case "cm": return value / 2.54;
    case "mm": return value / 25.4;
    case "m": return value * 39.37007874;
    case "ft": return value * 12;
    case "in":
    default: return value;
  }
};

/* Field path tables ------------------------------------------------- */

const WEIGHT_KG_PATHS = expand(["weightKg"]);
const WEIGHT_PATHS = expand(
  ["shippingWeight"], ["weight"], ["productWeight"], ["packageWeight"],
);
const WEIGHT_UNIT_PATHS = expand(
  ["shippingWeightUnit"], ["weightUnit"], ["massUnit"], ["packageWeightUnit"],
);

const dimensionPaths = (axis: "length" | "width" | "height"): string[][] => {
  const cap = axis[0].toUpperCase() + axis.slice(1);
  return expand(
    [`shipping${cap}`], [axis], [`package${cap}`],
    ["dimensions", axis], ["packageDimensions", axis],
  );
};
const LENGTH_PATHS = dimensionPaths("length");
const WIDTH_PATHS = dimensionPaths("width");
const HEIGHT_PATHS = dimensionPaths("height");

const DIMENSION_CM_PATHS = {
  length: expand(["dimensionsCm", "length"]),
  width: expand(["dimensionsCm", "width"]),
  height: expand(["dimensionsCm", "height"]),
};

const DIMENSION_UNIT_PATHS = expand(
  ["shippingDimensionUnit"], ["dimensionUnit"], ["distanceUnit"],
  ["dimensions", "unit"], ["packageDimensions", "unit"],
);

/** Resolves one cart line's package in lb / in. Missing values stay undefined. */
function resolveItemPackage(line: unknown): {
  weightLb?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
} {
  const weightKg = firstPositive(line, WEIGHT_KG_PATHS);
  const weightUnit = firstString(line, WEIGHT_UNIT_PATHS, "lb");
  const rawWeight = firstPositive(line, WEIGHT_PATHS);
  const weightLb = weightKg !== undefined
    ? weightKg * 2.2046226218
    : rawWeight !== undefined ? weightToLb(rawWeight, weightUnit) : undefined;

  const dimensionUnit = firstString(line, DIMENSION_UNIT_PATHS, "in");
  const axis = (cmPaths: string[][], rawPaths: string[][]): number | undefined => {
    const cm = firstPositive(line, cmPaths);
    if (cm !== undefined) return cm / 2.54;
    const raw = firstPositive(line, rawPaths);
    return raw !== undefined ? dimensionToIn(raw, dimensionUnit) : undefined;
  };

  return {
    weightLb,
    lengthIn: axis(DIMENSION_CM_PATHS.length, LENGTH_PATHS),
    widthIn: axis(DIMENSION_CM_PATHS.width, WIDTH_PATHS),
    heightIn: axis(DIMENSION_CM_PATHS.height, HEIGHT_PATHS),
  };
}

const hasCompletePackage = (line: unknown): boolean => {
  const pkg = resolveItemPackage(line);
  return [pkg.weightLb, pkg.lengthIn, pkg.widthIn, pkg.heightIn]
    .every((v) => v !== undefined && v > 0);
};

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

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
    if (value?.trim()) {
      return value.trim();
    }
  }
  return null;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body: unknown = await response.json();
      const record = asRecord(body);
      if (record) {
        if (typeof record.message === "string") return record.message;
        if (Array.isArray(record.message)) return record.message.join(", ");
        if (typeof record.error === "string") return record.error;
      }
    } catch {
      // Ignore invalid JSON.
    }
  } else {
    try {
      const text = await response.text();
      if (text) return text;
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
  const token = authenticated ? getAuthToken() : null;
  if (authenticated && !token) {
    throw new Error("UNAUTHORIZED");
  }
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("UNAUTHORIZED");
    if (response.status === 403) throw new Error("FORBIDDEN");
    if (response.status === 404) throw new Error("CHECKOUT_ENDPOINT_NOT_FOUND");
    throw new Error(await extractErrorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text as T;
  }
  return response.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/* Cart / parcel                                                       */
/* ------------------------------------------------------------------ */

function getCartStoreIds(items: CartLineItem[]): string[] {
  const storeIds = new Set<string>();
  for (const item of items) {
    const storeId = String(item.storeId || "").trim();
    if (storeId) {
      storeIds.add(storeId);
    }
  }
  if (storeIds.size === 0) {
    throw new Error(
      "Your cart is missing its seller store ID. Refresh your cart and try again.",
    );
  }
  return Array.from(storeIds);
}

function getItemName(line: AnyRecord): string {
  const product = asRecord(line.product);
  if (typeof line.productName === "string" && line.productName.trim()) {
    return line.productName.trim();
  }
  if (typeof product?.name === "string" && product.name.trim()) {
    return product.name.trim();
  }
  return "an unnamed product";
}

function getItemProductId(line: AnyRecord): string {
  const product = asRecord(line.product);
  return String(line.productId ?? line.id ?? product?._id ?? product?.id ?? "unknown");
}

/**
 * Builds a Shippo parcel for one seller's cart items.
 *
 * Supported product schemas:
 *   weightKg + dimensionsCm { length, width, height }  (kg / cm)
 *   shippingWeight + shippingWeightUnit, shippingLength/Width/Height
 *     + shippingDimensionUnit (defaults lb / in)
 *   weight, length, width, height, dimensions {...}, package {...}
 *
 * Any missing value falls back to DEFAULT_ITEM_PACKAGE unless
 * VITE_SHIPPING_STRICT_PARCEL=true.
 */
function getStoreParcel(items: CartLineItem[]): ShippoParcel {
  let totalWeightLb = 0;
  let maxLengthIn = 0;
  let maxWidthIn = 0;
  let totalHeightIn = 0;

  for (const item of items) {
    const line = item as CartLineItem & AnyRecord;
    const quantity = Math.max(1, Math.floor(readNumber(line.quantity) ?? 1));
    const pkg = resolveItemPackage(line);

    const missing: string[] = [];
    if (pkg.weightLb === undefined) missing.push("weight");
    if (pkg.lengthIn === undefined) missing.push("length");
    if (pkg.widthIn === undefined) missing.push("width");
    if (pkg.heightIn === undefined) missing.push("height");

    if (missing.length) {
      const name = getItemName(line);
      const productId = getItemProductId(line);

      if (STRICT_PARCEL) {
        console.error("[FOCKIS SHIPPING] Missing/invalid parcel data", {
          productName: name,
          productId,
          missing,
          line,
        });
        throw new Error(
          `Shipping package information is missing for "${name}" (product ID: ${productId}): ${missing.join(", ")}. ` +
          "Add the product's weight and length, width, and height, then remove and re-add it to the cart.",
        );
      }

      console.warn(
        `[FOCKIS SHIPPING] "${name}" (${productId}) is missing ${missing.join(", ")}; using default package values. ` +
        "Add shipping weight and dimensions to this product for accurate rates.",
        { productId, missing, defaults: DEFAULT_ITEM_PACKAGE },
      );
    }

    const weightLb = pkg.weightLb ?? DEFAULT_ITEM_PACKAGE.weightLb;
    const lengthIn = pkg.lengthIn ?? DEFAULT_ITEM_PACKAGE.lengthIn;
    const widthIn = pkg.widthIn ?? DEFAULT_ITEM_PACKAGE.widthIn;
    const heightIn = pkg.heightIn ?? DEFAULT_ITEM_PACKAGE.heightIn;

    totalWeightLb += weightLb * quantity;
    maxLengthIn = Math.max(maxLengthIn, lengthIn);
    maxWidthIn = Math.max(maxWidthIn, widthIn);
    totalHeightIn += heightIn * quantity;
  }

  if (
    !Number.isFinite(totalWeightLb) || !Number.isFinite(maxLengthIn) ||
    !Number.isFinite(maxWidthIn) || !Number.isFinite(totalHeightIn) ||
    totalWeightLb <= 0 || maxLengthIn <= 0 || maxWidthIn <= 0 || totalHeightIn <= 0
  ) {
    throw new Error("Valid shipping package weight and dimensions are required to calculate live rates.");
  }

  return {
    weight: Number(totalWeightLb.toFixed(4)),
    massUnit: "lb",
    length: Number(maxLengthIn.toFixed(4)),
    width: Number(maxWidthIn.toFixed(4)),
    height: Number(totalHeightIn.toFixed(4)),
    distanceUnit: "in",
  };
}

/* ------------------------------------------------------------------ */
/* Product hydration                                                   */
/* ------------------------------------------------------------------ */

const PACKAGE_KEYS = [
  "shippingWeight", "shippingWeightUnit", "shippingLength", "shippingWidth",
  "shippingHeight", "shippingDimensionUnit", "weightKg", "weightUnit",
  "dimensionsCm", "shipping", "package", "packageWeight", "packageDimensions",
  "weight", "length", "width", "height", "dimensions", "dimensionUnit",
];

/** Fetch saved package fields for cart lines that do not contain them. */
async function loadProductShipping(productId: string): Promise<AnyRecord | null> {
  if (!/^[a-f\d]{24}$/i.test(productId)) return null;
  const headers = new Headers({ Accept: "application/json" });
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const response = await fetch(
      buildUrl(`/fockis-shop/products/${encodeURIComponent(productId)}`),
      { method: "GET", headers, credentials: "include" },
    );
    if (!response.ok) {
      console.warn("[FOCKIS SHIPPING] Product lookup failed", {
        productId,
        status: response.status,
      });
      return null;
    }

    const body: unknown = await response.json();

    // Unwrap common Nest response wrappers, e.g. { data: { product: ... } }.
    let current = asRecord(body);
    for (let depth = 0; current && depth < 4; depth += 1) {
      const hasPackageFields = PACKAGE_KEYS.some(
        (key) => current && Object.prototype.hasOwnProperty.call(current, key),
      );
      if (hasPackageFields) return current;

      const next = asRecord(current.product ?? current.data ?? current.item ?? current.result);
      if (!next || next === current) break;
      current = next;
    }

    console.warn("[FOCKIS SHIPPING] Product response contained no recognizable package fields", {
      productId,
      keys: current ? Object.keys(current) : [],
    });
    return current ?? null;
  } catch (error) {
    console.warn("[FOCKIS SHIPPING] Product lookup error", { productId, error });
    return null;
  }
}

async function hydrateMissingShipping(items: CartLineItem[]): Promise<CartLineItem[]> {
  return Promise.all(items.map(async (item) => {
    const line = item as CartLineItem & AnyRecord;
    if (hasCompletePackage(line)) return item;

    const existingProduct = asRecord(line.product) ?? {};
    const id = String(line.productId ?? existingProduct._id ?? existingProduct.id ?? "").trim();
    const saved = await loadProductShipping(id);
    if (!saved) {
      console.warn("[FOCKIS SHIPPING] Could not hydrate package fields from product API", {
        productId: id,
        productName: line.productName,
      });
      return item;
    }

    // Saved product data is placed under `product`; resolveItemPackage
    // already searches product.*, product.shipping.*, product.package.*.
    const merged: AnyRecord = {
      ...line,
      product: { ...existingProduct, ...saved },
    };

    const complete = hasCompletePackage(merged);
    const log = complete ? console.info : console.warn;
    log("[FOCKIS SHIPPING] Loaded saved product package fields", {
      productId: id,
      hasCompletePackage: complete,
      ...(complete ? {} : { productKeys: Object.keys(saved) }),
    });

    return merged as unknown as CartLineItem;
  }));
}

/* ------------------------------------------------------------------ */
/* Rates                                                               */
/* ------------------------------------------------------------------ */

function normalizeShippoRate(
  rate: ShippoCheckoutRate,
  storeId: string,
): ShippingMethodOption {
  const days =
    typeof rate.estimatedDays === "number" &&
    Number.isFinite(rate.estimatedDays) &&
    rate.estimatedDays > 0
      ? rate.estimatedDays
      : null;
  const etaLabel = days
    ? `${days} day${days === 1 ? "" : "s"}`
    : "delivery time varies";
  return {
    id: rate.rateId,
    storeId,
    type: "national_delivery",
    label: [rate.carrier, rate.service, etaLabel]
      .filter(Boolean)
      .join(" · "),
    price: rate.amount,
    estimatedDays: {
      min: days ?? 0,
      max: days ?? 0,
    },
  };
}

/**
 * Requests real Shippo checkout rates, separately for each seller.
 * The backend must implement POST /fockis-shop/shipping/shippo/checkout-rates.
 */
export async function getShippingEstimates(
  items: CartLineItem[],
  destination?: ShippoCheckoutDestination,
): Promise<ShippingEstimate[]> {
  if (!items.length) {
    return [];
  }
  if (!destination) {
    throw new Error(
      "Enter your delivery address to calculate live shipping rates.",
    );
  }
  const requiredAddress = [
    destination.fullName,
    destination.street,
    destination.city,
    destination.state,
    destination.zipCode,
    destination.country,
    destination.email,
  ];
  if (requiredAddress.some((value) => !String(value ?? "").trim())) {
    throw new Error(
      "Complete your name, street address, city, state, postal code, country, and email to calculate shipping.",
    );
  }
  const storeIds = getCartStoreIds(items);
  if (
    storeIds.some(
      (storeId) =>
        storeId === "fockis-shop" ||
        !/^[a-f\d]{24}$/i.test(storeId),
    )
  ) {
    throw new Error(
      "A valid seller store ID is missing from your cart. Refresh your cart and try again.",
    );
  }
  const estimates = await Promise.all(
    storeIds.map(async (storeId): Promise<ShippingEstimate> => {
      const storeItems = items.filter(
        (item) => String(item.storeId || "").trim() === storeId,
      );
      const hydratedStoreItems = await hydrateMissingShipping(storeItems);
      const parcel = getStoreParcel(hydratedStoreItems);
      const response = await post<ShippoCheckoutRatesResponse>(
        "/fockis-shop/shipping/shippo/checkout-rates",
        {
          storeId,
          destination,
          parcel,
        },
        true,
      );
      const options = (response.rates ?? [])
        .filter(
          (rate) =>
            Boolean(rate.rateId) &&
            Number.isFinite(rate.amount) &&
            rate.amount >= 0,
        )
        .map((rate) => normalizeShippoRate(rate, storeId));
      if (!options.length) {
        throw new Error(
          `Shippo returned no shipping options for seller ${storeId}. Check the seller's shipping origin and the delivery address.`,
        );
      }
      return {
        storeId,
        options,
        selectedOptionId: options[0].id,
      };
    }),
  );
  return estimates;
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export async function placeOrder(
  requestData: PlaceOrderRequest,
): Promise<Order> {
  if (!requestData.items.length) {
    throw new Error("CART_EMPTY");
  }
  if (!Number.isFinite(requestData.subtotal) || requestData.subtotal < 0) {
    throw new Error("INVALID_SUBTOTAL");
  }
  if (!Number.isFinite(requestData.shippingCost) || requestData.shippingCost < 0) {
    throw new Error("INVALID_SHIPPING_COST");
  }
  if (!Number.isFinite(requestData.tax) || requestData.tax < 0) {
    throw new Error("INVALID_TAX");
  }
  if (!Number.isFinite(requestData.totalAmount) || requestData.totalAmount < 0) {
    throw new Error("INVALID_TOTAL");
  }
  if (requestData.paymentMethod === "card" && !requestData.paymentIntentId) {
    throw new Error("PAYMENT_INTENT_REQUIRED");
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
