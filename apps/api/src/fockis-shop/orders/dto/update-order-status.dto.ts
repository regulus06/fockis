import {
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

import {
  OrderStatus,
  ShipmentStatus,
} from "../schemas/order.schema";

/* ============================================================================
   UPDATE ORDER STATUS DTO

   SELLERS CAN:
   - Move their shipment through seller-controlled fulfillment states.
   - Add tracking information.
   - Set a carrier.

   CARRIER TRACKING WILL AUTOMATICALLY HANDLE:
   - IN_TRANSIT
   - OUT_FOR_DELIVERY
   - DELIVERED
   - EXCEPTION

   The backend still accepts shipmentStatus for compatibility, but automatic
   carrier tracking should be the source of truth once tracking is registered.
============================================================================ */

export class UpdateOrderStatusDto {
  /* ==========================================================================
     ORDER STATUS
  ========================================================================== */

  @IsEnum(OrderStatus)
  status!: OrderStatus;

  /* ==========================================================================
     TRACKING NUMBER

     Example:
     9400111899223856928493
  ========================================================================== */

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  /* ==========================================================================
     SHIPPING CARRIER

     Examples:
     - USPS
     - UPS
     - FedEx
     - DHL
     - Canada Post
     - Other
  ========================================================================== */

  @IsOptional()
  @IsString()
  carrier?: string;

  /* ==========================================================================
     TRACKING URL

     Optional direct tracking URL.

     If omitted, the backend can generate one when the carrier is known.
  ========================================================================== */

  @IsOptional()
  @IsString()
  trackingUrl?: string;

  /* ==========================================================================
     SHIPMENT STATUS

     Optional compatibility field.

     Once carrier tracking is connected, carrier webhooks should update
     shipment status automatically instead of sellers manually changing
     tracking statuses.
  ========================================================================== */

  @IsOptional()
  @IsEnum(ShipmentStatus)
  shipmentStatus?: ShipmentStatus;
}
