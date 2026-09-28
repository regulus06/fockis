export interface InventorySettings {
  total: string;
  available: string;
  reserved: string;
  lowStockThreshold: string;
  allowReservations: boolean;
}

export type InventoryStatus = 'disabled' | 'sold-out' | 'low' | 'available';

export interface ListingForm {
  title: string;
  category: string;
  description: string;

  price: string;
  priceUnit: string;

  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  phone: string;
  website: string;

  capacity: string;
  bedrooms: string;
  bathrooms: string;
  beds: string;

  amenities: string[];
  images: string[];

  propertyType: string;
  rentalType: string;

  checkInTime: string;
  checkOutTime: string;

  minimumStay: string;
  maximumStay: string;

  cleaningFee: string;
  securityDeposit: string;

  cancellationPolicy: string;

  instantBooking: boolean;

  houseRules: string[];

  hostName: string;
  hostDescription: string;

  status: 'draft' | 'pending';
}
