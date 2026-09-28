/**

* Store domain types.
*
* Relationship:
* User -> Business -> Store -> Products
*
* A Store is the public-facing storefront; a Business is the
* legal/owning entity behind it.
  */

export interface StoreLocation {
country: string;
countryCode: string;
countryFlag: string;
city: string;
state?: string;
}

export interface StoreShippingSummary {
localDelivery: boolean;
nationalDelivery: boolean;
internationalShipping: boolean;
pickupAvailable: boolean;
freeDeliveryThreshold?: number | null;
}

export interface StorePolicySummary {
returns: string;
refunds: string;
cancellations: string;
shipping: string;
customerSupport: string;
}

export interface StoreRatingSummary {
average: number;
totalReviews: number;
}

export type StoreStatus =
| "active"
| "pending_review"
| "suspended"
| "closed";

export interface Store {
id: string;
slug: string;
businessId: string;

name: string;
description: string;

logoUrl?: string;
bannerUrl?: string;
emoji?: string;

verified: boolean;
status: StoreStatus;

location: StoreLocation;

categories: string[];
tags: string[];

rating: StoreRatingSummary;

shipping: StoreShippingSummary;
policies: StorePolicySummary;

productCount: number;
orderCount?: number;

createdAt: string;
updatedAt: string;
}

export interface StoreReview {
id: string;
storeId: string;
authorId: string;
authorName: string;
rating: 1 | 2 | 3 | 4 | 5;
body: string;
createdAt: string;
}

export interface StoreListFilters {
categorySlug?: string;
countryCode?: string;
query?: string;

location?:
| "local"
| "national"
| "international"
| "all";

minRating?: number;

verifiedOnly?: boolean;

sort?:
| "relevance"
| "rating"
| "newest"
| "most_orders";

page?: number;
pageSize?: number;
}
