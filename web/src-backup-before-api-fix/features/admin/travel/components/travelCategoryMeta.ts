// Not part of your original file tree, but small enough to keep as a plain
// constants module rather than duplicating this map in every component that
// needs to render a service chip. Feel free to fold it into
// travelAdmin.types.ts or an existing shared constants file instead.

import type { TravelListingType } from "../types/travelAdmin.types";

export const TRAVEL_CATEGORY_META: Record<
  TravelListingType,
  { label: string; icon: string }
> = {
  stay: { label: "Hotels & Stays", icon: "🏨" },
  rental: { label: "Vacation Rentals", icon: "🏠" },
  meeting: { label: "Meeting Spaces", icon: "💼" },
  event: { label: "Events", icon: "🎉" },
  restaurant: { label: "Restaurants", icon: "🍽️" },
  car: { label: "Car Rental", icon: "🚗" },
  flight: { label: "Flights", icon: "✈️" },
  transfer: { label: "Transportation", icon: "🚐" },
  experience: { label: "Experiences", icon: "🏝️" },
  attraction: { label: "Attractions", icon: "🎟️" },
  thing: { label: "Things To Do", icon: "🗺️" },
};

export function getCategoryMeta(category: string) {
  return (
    TRAVEL_CATEGORY_META[category as TravelListingType] ?? {
      label: category,
      icon: "📍",
    }
  );
}
