/**
 * ============================================================================
 * FOCKIS TRAVEL — DISCOVERY CATALOG
 * ============================================================================
 *
 * Static navigation content for the Travel home and Explore pages: the
 * category shortcuts and the Popular Destinations discovery links.
 *
 * These are NOT listings. Every entry is a link into a real results page
 * (existing category pages, or /travel/explore which queries
 * GET /travel/listings). Photos are editorial travel photography served by
 * Unsplash — the same image host the Travel feature already used.
 * ============================================================================
 */

export type TravelCategoryId =
  | "stays"
  | "rentals"
  | "restaurants"
  | "cars"
  | "experiences"
  | "events"
  | "meetings"
  | "business";

export interface TravelCategory {
  id: TravelCategoryId;
  label: string;
  /** Backend listing type (listing.schema.ts LISTING_TYPES). */
  listingType: string;
  /** Where the shortcut opens. Always an existing route. */
  to: string;
  image: string;
}

export function unsplash(id: string, width = 640, height?: number): string {
  const size = height ? `&h=${height}` : "";
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}${size}&q=75`;
}

export const TRAVEL_HERO_IMAGE = "1570077188670-e3a8d69ac5ff";

export const TRAVEL_CATEGORIES: TravelCategory[] = [
  {
    id: "stays",
    label: "Stays",
    listingType: "stay",
    to: "/travel/stays",
    image: unsplash("1566073771259-6a8506099945", 240, 240),
  },
  {
    id: "rentals",
    label: "Vacation Rentals",
    listingType: "rental",
    to: "/travel/explore?type=rental",
    image: unsplash("1564013799919-ab600027ffc6", 240, 240),
  },
  {
    id: "restaurants",
    label: "Restaurants",
    listingType: "restaurant",
    to: "/travel/restaurants",
    image: unsplash("1517248135467-4c7edcad34c4", 240, 240),
  },
  {
    id: "cars",
    label: "Cars",
    listingType: "car",
    to: "/travel/cars",
    image: unsplash("1494976388531-d1058494cdd8", 240, 240),
  },
  {
    id: "experiences",
    label: "Experiences",
    listingType: "experience",
    to: "/travel/experiences",
    image: unsplash("1530789253388-582c481c54b0", 240, 240),
  },
  {
    id: "events",
    label: "Events",
    listingType: "event",
    to: "/travel/explore?type=event",
    image: unsplash("1492684223066-81342ee5ff30", 240, 240),
  },
  {
    id: "meetings",
    label: "Meetings",
    listingType: "meeting",
    to: "/travel/meetings",
    image: unsplash("1517502884422-41eaead166d4", 240, 240),
  },
  {
    id: "business",
    label: "Business Travel",
    listingType: "",
    to: "/travel/business",
    image: unsplash("1436491865332-7a61a109cc05", 240, 240),
  },
];

export function getTravelCategory(id: string): TravelCategory | undefined {
  return TRAVEL_CATEGORIES.find((category) => category.id === id);
}

export function getCategoryByListingType(type: string): TravelCategory | undefined {
  return TRAVEL_CATEGORIES.find((category) => category.listingType === type);
}

export interface PopularDestination {
  city: string;
  country: string;
  image: string;
}

export const POPULAR_DESTINATIONS: PopularDestination[] = [
  { city: "Paris", country: "France", image: "1502602898657-3e91760cbb34" },
  { city: "Bali", country: "Indonesia", image: "1537996194471-e657df975ab4" },
  { city: "New York", country: "USA", image: "1496442226666-8d4d0e62e6e9" },
  { city: "London", country: "United Kingdom", image: "1513635269975-59663e0ac1ad" },
  { city: "Rome", country: "Italy", image: "1552832230-c0197dd311b5" },
  { city: "Cancún", country: "Mexico", image: "1510097467424-192d713fd8b2" },
];

export function destinationSearchUrl(destination: PopularDestination): string {
  const params = new URLSearchParams({ q: destination.city });
  return `/travel/explore?${params.toString()}`;
}
