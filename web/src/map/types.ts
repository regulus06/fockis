export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type FockisAddressStatus = "ACTIVE" | "INACTIVE";

export type FockisUnit = {
  id: string;
  unitNumber: string;
  floor?: string | null;
  unitType?: "APARTMENT" | "HOUSE" | "ROOM" | "SUITE" | "OFFICE" | "OTHER";
  status: "ACTIVE" | "INACTIVE";
};

export type FockisAddress = {
  id: string;
  fockisAddressId: string;
  country: string;
  countryCode: string;
  departmentOrRegion?: string | null;
  communeOrCity?: string | null;
  neighborhood?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  landmark?: string | null;
  addressLine?: string | null;
  latitude: number;
  longitude: number;
  mapboxPlaceId?: string | null;
  buildingName?: string | null;
  buildingNumber?: string | null;
  status: FockisAddressStatus;
  units: FockisUnit[];
  createdAt: string;
  updatedAt: string;
};

export type AddressRequest = {
  id: string;
  addressId: string;
  unitId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MapMarker = {
  id: string;
  longitude: number;
  latitude: number;
  title: string;
  type: "ADDRESS" | "UNIT" | "PLACE";
};
