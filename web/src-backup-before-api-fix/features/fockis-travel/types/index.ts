/**

* ============================================================================
* FOCKIS TRAVEL — SHARED TYPES
* ============================================================================
*
* Central public type barrel for the Travel feature.
*
* Components, pages, and hooks should import domain types from:
*
* ../types
*
* rather than importing types directly from individual service files.
* ============================================================================
  */

/**

* BOOKINGS
  */
  export type {
  TravelBooking,
  CreateBookingInput,
  } from './booking';

/**

* LISTINGS
  */
  export type {
  ListingType,
  TravelListing,
  ListingSearchParams,
  CreateListingInput,
  } from './listing';

/**

* PARTNERS
*
* These names match the actual exports from services/partnersApi.ts.
  */
  export type {
  Partner,
  PartnerStatus,
  PartnerContact,
  PartnerAddress,
  PartnerBusinessHours,
  PartnerService,
  PartnerDocumentInfo,
  PartnerSocialLinks,

SavePartnerInput,
UpdateProfileInput,
AddServiceInput,
MediaInput,
BookingSettingsInput,
} from './partner';

/**

* PRICE ALERTS
  */
  export type {
  PriceAlert,
  CreatePriceAlertInput,
  } from './priceAlert';

/**

* TRIPS
  */
  export type {
  TravelTrip,
  TravelTripItem,
  CreateTripInput,
  UpdateTripInput,
  TripSearchParams,
  } from './trip';

/**

* WISHLIST
  */
  export type {
  WishlistItem,
  AddWishlistInput,
  } from './wishlist';
