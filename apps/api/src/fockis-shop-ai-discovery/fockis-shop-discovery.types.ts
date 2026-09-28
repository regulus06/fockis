export type FockisShopDiscoveryTool =
  | "search_fockis_products"
  | "search_fockis_stores"
  | "search_fockis_businesses";

export interface FockisShopDiscoveryQuery {
  tool: FockisShopDiscoveryTool;

  query?: string;

  city?: string;

  state?: string;

  country?: string;

  category?: string;

  type?: string;

  minPrice?: number;

  maxPrice?: number;

  limit?: number;
}

export interface FockisShopPublicLocation {
  city?: string;
  state?: string;
  country?: string;
}

export interface FockisShopPublicAddress {
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface FockisShopPublicContact {
  email?: string;
  phone?: string;
  website?: string;
  address?: FockisShopPublicAddress;
}

export interface FockisShopPublicHours {
  [key: string]: unknown;
}

export interface FockisShopPublicSocialLinks {
  [key: string]: string;
}

export interface FockisShopDiscoveryStore {
  id?: string;
  name?: string;
  slug?: string;
  verified?: boolean;

  location?: FockisShopPublicLocation;

  contact?: FockisShopPublicContact;
}

export interface FockisShopDiscoveryMetadata {
  category?: string;

  brand?: string;

  rating?: number;

  totalReviews?: number;

  discount?: number;

  discountPrice?: number;

  displayLocations?: string[];

  slug?: string;

  categories?: string[];

  verified?: boolean;

  followers?: number;

  contact?: FockisShopPublicContact;

  hours?: FockisShopPublicHours;

  socialLinks?: FockisShopPublicSocialLinks;
}

export interface FockisShopDiscoveryUrls {
  product?: string;
  marketplace?: string;
  store?: string;
  business?: string;
}

export interface FockisShopDiscoveryResultItem {
  id: string;

  type:
    | "product"
    | "store"
    | "business";

  title: string;

  description?: string;

  price?: number;

  stock?: number;

  image?: string;

  location?: FockisShopPublicLocation;

  urls?: FockisShopDiscoveryUrls;

  store?: FockisShopDiscoveryStore;

  metadata?: FockisShopDiscoveryMetadata;
}

export interface FockisShopDiscoveryResult {
  tool: FockisShopDiscoveryTool;

  query: string;

  count: number;

  results: FockisShopDiscoveryResultItem[];

  searchedLiveDatabase: boolean;
}