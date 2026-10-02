export type PropertyStatus = "sale" | "rent";
export type PropertyType =
  | "house"
  | "apartment"
  | "condo"
  | "townhouse"
  | "land"
  | "commercial";

export interface PropertyAgent {
  id: string;
  name: string;
  role: "Agent" | "Owner";
  company?: string;
  avatar?: string;
  verified?: boolean;
  responseTime?: string;
  propertiesListed?: number;
  phone?: string;
}

export interface PropertyDetails {
  yearBuilt?: number;
  parking?: string;
  heating?: string;
  cooling?: string;
  stories?: number;
  hoa?: string;
  tax?: string;
  mls?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;

  status: PropertyStatus;
  type: PropertyType;

  price: number;

  address: string;
  city: string;
  state: string;
  zip?: string;
  country?: string;

  beds?: number;
  baths?: number;
  sqft?: number;

  lot?: string;
  acreage?: number;
  zoning?: string;

  images: string[];
  verified?: boolean;
  virtualTour?: boolean;

  features: string[];
  utilities?: string[];

  agent: PropertyAgent;
  details: PropertyDetails;

  latitude?: number;
  longitude?: number;

  createdAt?: string;
  updatedAt?: string;
}