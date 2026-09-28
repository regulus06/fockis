import {
Injectable,
Logger,
} from "@nestjs/common";

export interface TrackingEmailData {
recipientEmail: string;
recipientName?: string;
orderId: string;
trackingNumber: string;
carrier: string;
status: string;
eta?: string;
}

@Injectable()
export class TrackingEmailService {
private readonly logger =
new Logger(TrackingEmailService.name);

// =========================
// SEND TRACKING UPDATE
// =========================
async sendTrackingUpdate(
data: TrackingEmailData,
): Promise<boolean> {
if (!data.recipientEmail) {
this.logger.warn(
"Tracking email skipped: recipient email is missing.",
);

  return false;
}

const customerName =
  data.recipientName || "Customer";

this.logger.log(
  [
    "Tracking notification",
    `To: ${data.recipientEmail}`,
    `Customer: ${customerName}`,
    `Order: ${data.orderId}`,
    `Carrier: ${data.carrier}`,
    `Tracking: ${data.trackingNumber}`,
    `Status: ${data.status}`,
    `ETA: ${data.eta || "Not available"}`,
  ].join(" | "),
);

// =========================
// TODO: REAL EMAIL PROVIDER
// =========================
// Later connect this service to:
//
// - Resend
// - SendGrid
// - Amazon SES
// - Mailgun
// - SMTP
//
// For now, the notification is logged
// so the shipping system can be tested
// without requiring an email provider.

return true;

}

// =========================
// SHIPMENT CREATED
// =========================
async sendShipmentCreatedEmail(
data: TrackingEmailData,
): Promise<boolean> {
return this.sendTrackingUpdate({
...data,
status: "Shipment Created",
});
}

// =========================
// SHIPMENT SHIPPED
// =========================
async sendShippedEmail(
data: TrackingEmailData,
): Promise<boolean> {
return this.sendTrackingUpdate({
...data,
status: "Shipped",
});
}

// =========================
// IN TRANSIT
// =========================
async sendInTransitEmail(
data: TrackingEmailData,
): Promise<boolean> {
return this.sendTrackingUpdate({
...data,
status: "In Transit",
});
}

// =========================
// OUT FOR DELIVERY
// =========================
async sendOutForDeliveryEmail(
data: TrackingEmailData,
): Promise<boolean> {
return this.sendTrackingUpdate({
...data,
status: "Out for Delivery",
});
}

// =========================
// DELIVERED
// =========================
async sendDeliveredEmail(
data: TrackingEmailData,
): Promise<boolean> {
return this.sendTrackingUpdate({
...data,
status: "Delivered",
});
}

// =========================
// DELIVERY DELAYED
// =========================
async sendDeliveryDelayEmail(
data: TrackingEmailData,
): Promise<boolean> {
return this.sendTrackingUpdate({
...data,
status: "Delivery Delayed",
});
}

// =========================
// DELIVERY FAILED
// =========================
async sendDeliveryFailedEmail(
data: TrackingEmailData,
): Promise<boolean> {
return this.sendTrackingUpdate({
...data,
status: "Delivery Attempt Failed",
});
}
}
