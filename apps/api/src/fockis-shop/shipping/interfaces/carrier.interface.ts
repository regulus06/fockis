export type Carrier =
| "usps"
| "ups"
| "fedex"
| "dhl";

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

export interface CarrierTrackingResult {
trackingNumber: string;

carrier: Carrier;

status: ShipmentStatus;

location?: string;

estimatedDelivery?: Date;

history?: {
status: ShipmentStatus;
location?: string;
date?: Date;
}[];

updatedAt?: Date;
}

export interface ShippingAddress {
name: string;
company?: string;

address1: string;
address2?: string;

city: string;
state?: string;
postalCode: string;
country: string;

phone?: string;
email?: string;
}

export interface PackageDetails {
weight: number;
weightUnit: "lb" | "kg";

length?: number;
width?: number;
height?: number;

dimensionUnit?: "in" | "cm";
}

export interface CreateCarrierShipmentInput {
carrier: Carrier;

origin: ShippingAddress;

destination: ShippingAddress;

package: PackageDetails;

serviceLevel?: string;

reference?: string;
}

export interface CarrierShipmentResult {
carrier: Carrier;

trackingNumber: string;

labelUrl?: string;

labelData?: string;

estimatedDelivery?: Date;

status: ShipmentStatus;
}
