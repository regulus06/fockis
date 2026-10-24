
import { api } from "../../../api/api";

const BASE_URL = "/fockis-shop/shipping";

export type ShippoParcel = {
  weight: number;
  massUnit: "lb" | "oz" | "kg" | "g";
  length: number;
  width: number;
  height: number;
  distanceUnit: "in" | "cm" | "ft" | "mm" | "m";
};

export type ShippoRate = {
  rateId: string;
  carrier: string;
  service: string;
  amount: number;
  currency: string;
  estimatedDays: number | null;
};

export type ShippoRatesResponse = {
  orderId: string;
  shipmentId: string;
  shippoShipmentId: string;
  rates: ShippoRate[];
};

export type ShippoLabelResponse = {
  orderId?: string;
  shipmentId: string;
  transactionId: string;
  labelUrl: string;
  trackingNumber: string;
  trackingUrl?: string;
  status: string;
};

export const shippoShippingApi = {
  /**
   * Retrieve current Shippo rates for a seller's order shipment.
   * The server must derive sender and recipient addresses from saved records.
   */
  getRates: async (
    orderId: string,
    shipmentId: string,
    parcel: ShippoParcel,
  ): Promise<ShippoRatesResponse> => {
    if (!orderId?.trim() || !shipmentId?.trim()) {
      throw new Error("Order ID and shipment ID are required.");
    }

    const response = await api.post<ShippoRatesResponse>(
      `${BASE_URL}/shippo/rates`,
      { orderId, shipmentId, parcel },
    );

    return response.data;
  },

  /**
   * Purchase a label for a rate previously returned and saved by the backend.
   * This action may charge the seller's Shippo account.
   */
  purchaseLabel: async (
    orderId: string,
    shipmentId: string,
    rateId: string,
  ): Promise<ShippoLabelResponse> => {
    if (!orderId?.trim() || !shipmentId?.trim() || !rateId?.trim()) {
      throw new Error("Order, shipment, and rate IDs are required.");
    }

    const response = await api.post<ShippoLabelResponse>(
      `${BASE_URL}/shippo/label`,
      { orderId, shipmentId, rateId },
    );

    return response.data;
  },
};
