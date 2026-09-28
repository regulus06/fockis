export type ShippingMethodType =
| "local_delivery"
| "national_delivery"
| "international"
| "pickup";

export interface ShippingMethodOption {
id: string;

storeId: string;

type: ShippingMethodType;

label: string;

price: number;

estimatedDays: {
min: number;
max: number;
};

freeAbove?: number | null;
}

export interface ShippingEstimate {
storeId: string;

options: ShippingMethodOption[];

selectedOptionId?: string | null;
}
