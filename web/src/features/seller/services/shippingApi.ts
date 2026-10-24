
import { api } from "../../../api/api";

/* ============================================================================
TYPES
============================================================================ */

export interface Shipment {
  _id?: string;
  id?: string;
  orderId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  status?: string;
}

export interface ShippoParcel {
  length: number;
  width: number;
  height: number;
  distanceUnit: "in" | "cm" | "ft" | "mm" | "m";
  weight: number;
  massUnit: "lb" | "oz" | "kg" | "g";
}

export interface ShippoRate {
  rateId: string;
  carrier?: string;
  service?: string;
  amount: string | number;
  currency?: string;
  estimatedDays?: number | null;
}

export interface ShippoRatesResponse {
  orderId: string;
  shipmentId: string;
  shippoShipmentId?: string;
  rates: ShippoRate[];
}

export interface ShippoLabelResponse {
  orderId?: string;
  shipmentId?: string;
  labelUrl?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  transactionId?: string;
  status?: string;
  [key: string]: unknown;
}

/* ============================================================================
ROUTES
============================================================================ */

// These paths must match the NestJS ShippingController routes.
const SHIPPO_RATES_URL = "/fockis-shop/shipping/shippo/rates";
const SHIPPO_LABEL_URL = "/fockis-shop/shipping/shippo/label";

/* ============================================================================
SHIPMENT ID HELPERS
============================================================================ */

export function getShipmentId(
  shipment: Shipment | Shipment[] | null | undefined,
): string | null {
  if (!shipment) return null;

  if (Array.isArray(shipment)) {
    return shipment.length ? getShipmentId(shipment[0]) : null;
  }

  const id = shipment._id ?? shipment.id;
  return id ? String(id) : null;
}

function normalizeShipment(value: unknown): Shipment | null {
  if (value == null) return null;

  if (Array.isArray(value)) {
    return value.length ? normalizeShipment(value[0]) : null;
  }

  if (typeof value !== "object") return null;

  const objectValue = value as Record<string, unknown>;

  if ("data" in objectValue) {
    return normalizeShipment(objectValue.data);
  }

  return {
    _id:
      typeof objectValue._id === "string"
        ? objectValue._id
        : undefined,
    id:
      typeof objectValue.id === "string"
        ? objectValue.id
        : undefined,
    orderId:
      typeof objectValue.orderId === "string"
        ? objectValue.orderId
        : undefined,
    trackingNumber:
      typeof objectValue.trackingNumber === "string"
        ? objectValue.trackingNumber
        : undefined,
    trackingUrl:
      typeof objectValue.trackingUrl === "string"
        ? objectValue.trackingUrl
        : undefined,
    labelUrl:
      typeof objectValue.labelUrl === "string"
        ? objectValue.labelUrl
        : undefined,
    status:
      typeof objectValue.status === "string"
        ? objectValue.status
        : undefined,
  };
}

/* ============================================================================
RESPONSE HELPERS
============================================================================ */

function unwrapResponse<T>(responseData: unknown): T {
  if (
    responseData &&
    typeof responseData === "object" &&
    "data" in responseData
  ) {
    return (responseData as { data: T }).data;
  }

  return responseData as T;
}

function formatApiDetail(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const entry = item as Record<string, unknown>;
          const text =
            typeof entry.text === "string" ? entry.text :
            typeof entry.message === "string" ? entry.message :
            typeof entry.detail === "string" ? entry.detail : "";
          const code = typeof entry.code === "string" ? entry.code : "";
          return [text, code ? `(${code})` : ""].filter(Boolean).join(" ");
        }
        return "";
      })
      .filter(Boolean)
      .join("; ");
  }

  if (value && typeof value === "object") {
    const entry = value as Record<string, unknown>;
    for (const key of ["text", "message", "detail", "description"]) {
      if (typeof entry[key] === "string" && (entry[key] as string).trim()) {
        return (entry[key] as string).trim();
      }
    }
  }

  return "";
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;

  const apiError = error as {
    response?: {
      status?: number;
      data?: {
        message?: unknown;
        details?: unknown;
        error?: unknown;
        statusCode?: number;
      };
    };
    message?: string;
  };

  const data = apiError.response?.data;

  // Prefer Shippo's transaction messages when the API includes them.
  const details = formatApiDetail(data?.details);
  if (details) return details;

  const responseMessage = formatApiDetail(data?.message);
  if (responseMessage) return responseMessage;

  const responseError = formatApiDetail(data?.error);
  if (responseError) return responseError;

  if (apiError.message) return apiError.message;

  const status = apiError.response?.status ?? data?.statusCode;
  return status ? `${fallback} (HTTP ${status})` : fallback;
}

/* ============================================================================
SHIPPING API
============================================================================ */

export const shippingApi = {
  /* ==========================================================================
  CREATE SHIPMENT — EXISTING ENDPOINT
  ========================================================================== */

  createShipment: async (data: {
    orderId: string;
    trackingNumber?: string;
  }): Promise<Shipment | null> => {
    if (!data.orderId) {
      throw new Error("Cannot create shipment: order ID is missing.");
    }

    const response = await api.post("/shipping", data);

    console.log(
      "[shippingApi] Create shipment response:",
      response.data,
    );

    return normalizeShipment(response.data);
  },

  /* ==========================================================================
  MARK SHIPMENT AS SHIPPED — EXISTING ENDPOINT
  ========================================================================== */

  ship: async (shipmentId: string) => {
    if (!shipmentId) {
      throw new Error("Cannot ship order: shipment ID is missing.");
    }

    const response = await api.patch(
      `/shipping/${encodeURIComponent(shipmentId)}/ship`,
    );

    return response.data;
  },

  /* ==========================================================================
  MARK SHIPMENT AS DELIVERED — EXISTING ENDPOINT
  ========================================================================== */

  deliver: async (shipmentId: string) => {
    if (!shipmentId) {
      throw new Error("Cannot deliver order: shipment ID is missing.");
    }

    const response = await api.patch(
      `/shipping/${encodeURIComponent(shipmentId)}/deliver`,
    );

    return response.data;
  },

  /* ==========================================================================
  GET SHIPMENT BY ORDER ID — EXISTING ENDPOINT
  ========================================================================== */

  getShipment: async (
    orderId: string,
  ): Promise<Shipment | null> => {
    if (!orderId) {
      throw new Error("Cannot get shipment: order ID is missing.");
    }

    try {
      const response = await api.get(
        `/shipping/${encodeURIComponent(orderId)}`,
      );

      return normalizeShipment(response.data);
    } catch (error: unknown) {
      const status = (
        error as { response?: { status?: number } } | null
      )?.response?.status;

      if (status === 404) return null;

      throw error;
    }
  },

  /* ==========================================================================
  GET SHIPMENT ID
  ========================================================================== */

  getShipmentId,

  /* ==========================================================================
  SHIPPO — GET LIVE RATES USING TEST-MODE CREDENTIALS
  ========================================================================== */

  getShippoRates: async (data: {
    orderId: string;
    shipmentId: string;
    parcel: ShippoParcel;
  }): Promise<ShippoRatesResponse> => {
    if (!data.orderId || !data.shipmentId) {
      throw new Error(
        "Cannot get shipping rates: order or shipment ID is missing.",
      );
    }

    const { parcel } = data;

    if (
      !parcel ||
      !Number.isFinite(parcel.length) ||
      !Number.isFinite(parcel.width) ||
      !Number.isFinite(parcel.height) ||
      !Number.isFinite(parcel.weight) ||
      parcel.length <= 0 ||
      parcel.width <= 0 ||
      parcel.height <= 0 ||
      parcel.weight <= 0
    ) {
      throw new Error(
        "Enter a valid positive package length, width, height, and weight.",
      );
    }

    try {
      console.log("[shippingApi] Requesting Shippo rates:", {
        orderId: data.orderId,
        shipmentId: data.shipmentId,
        parcel,
      });

      const response = await api.post(SHIPPO_RATES_URL, data);
      const result = unwrapResponse<ShippoRatesResponse>(response.data);

      if (!result || !Array.isArray(result.rates)) {
        throw new Error(
          "The shipping service did not return a valid list of Shippo rates.",
        );
      }

      console.log("[shippingApi] Shippo rates received:", {
        count: result.rates.length,
        orderId: result.orderId,
        shipmentId: result.shipmentId,
      });

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to retrieve Shippo shipping rates.",
      );

      console.error("[shippingApi] Shippo rates request failed:", message);

      throw new Error(message);
    }
  },

  /* ==========================================================================
  SHIPPO — PURCHASE LABEL FOR A SELECTED RATE
  ========================================================================== */

  purchaseShippoLabel: async (data: {
    orderId: string;
    shipmentId: string;
    rateId: string;
  }): Promise<ShippoLabelResponse> => {
    if (!data.orderId || !data.shipmentId || !data.rateId) {
      throw new Error(
        "Cannot purchase a shipping label: order, shipment, or rate ID is missing.",
      );
    }

    try {
      console.log("[shippingApi] Purchasing Shippo label:", {
        orderId: data.orderId,
        shipmentId: data.shipmentId,
        rateId: data.rateId,
      });

      const response = await api.post(SHIPPO_LABEL_URL, data);
      const result = unwrapResponse<ShippoLabelResponse>(response.data);

      console.log("[shippingApi] Shippo label purchase response:", {
        orderId: result?.orderId,
        shipmentId: result?.shipmentId,
        status: result?.status,
        hasLabelUrl: Boolean(result?.labelUrl),
        hasTrackingNumber: Boolean(result?.trackingNumber),
      });

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to purchase the Shippo shipping label.",
      );

      console.error("[shippingApi] Shippo label request failed:", message);

      throw new Error(message);
    }
  },
};
