
/* ============================================================================
   SHIPPING STATUS

   Frontend version of the normalized shipment status.
   Do not import backend NestJS/Mongoose schemas into the frontend.
============================================================================ */

export type ShipmentStatus =
  | "pending"
  | "processing"
  | "label_created"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delayed"
  | "failed"
  | "cancelled";

/* ============================================================================
   NORMALIZED CARRIER STATUS

   Every external carrier API should eventually be converted into this
   normalized structure.

   This prevents your OrdersService from depending on a specific carrier API.
============================================================================ */

export interface NormalizedTrackingEvent {
  trackingNumber: string;

  carrier: string;

  status: ShipmentStatus;

  description?: string;

  location?: string;

  eventDate?: Date;

  trackingUrl?: string;

  providerEventId?: string;
}

/* ============================================================================
   REGISTER TRACKING REQUEST
============================================================================ */

export interface RegisterTrackingRequest {
  orderId: string;

  shipmentId: string;

  carrier: string;

  trackingNumber: string;

  trackingUrl?: string;
}

/* ============================================================================
   CARRIER WEBHOOK EVENT
============================================================================ */

export interface CarrierWebhookEvent {
  providerEventId?: string;

  carrier: string;

  trackingNumber: string;

  status: string;

  description?: string;

  location?: string;

  eventDate?: string | Date;

  trackingUrl?: string;
}