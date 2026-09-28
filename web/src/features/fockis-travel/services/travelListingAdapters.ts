import type {
  TravelListing,
  ListingType,
} from './listingsApi';

import type { StayCardProps } from '../components/StayCard';
import type { CarCardProps } from '../components/CarCard';
import type { RestaurantCardProps } from '../components/RestaurantCard';
import type { ExperienceCardProps } from '../components/ExperienceCard';
import type { TransferCardProps } from '../components/TransferCard';
import type {
  MeetingRoomCardProps,
  MeetingRoomTime,
} from '../components/MeetingRoomCard';
import type { DestinationCardProps } from '../components/DestinationCard';

/**
 * Fockis Travel listing metadata.
 *
 * The main Listing document contains common fields.
 * Card-specific information normally lives inside metadata.
 *
 * Business/partner information can also be returned by the backend
 * alongside the listing, so the image resolver below intentionally
 * supports both structures.
 */

type Metadata = Record<string, unknown>;

function metadata(listing: TravelListing): Metadata {
  if (
    listing.metadata &&
    typeof listing.metadata === 'object'
  ) {
    return listing.metadata;
  }

  return {};
}

function stringValue(
  value: unknown,
  fallback = '',
): string {
  return typeof value === 'string'
    ? value
    : fallback;
}

function numberValue(
  value: unknown,
  fallback = 0,
): number {
  return typeof value === 'number'
    ? value
    : fallback;
}

function booleanValue(
  value: unknown,
  fallback = false,
): boolean {
  return typeof value === 'boolean'
    ? value
    : fallback;
}

function stringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === 'string',
  );
}

function listingId(
  listing: TravelListing,
): string {
  return listing._id || listing.id || '';
}

/**
 * Safely reads a property from an arbitrary object.
 */
function objectValue(
  value: unknown,
): Record<string, unknown> | null {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}

/**
 * Extract a usable image string from an arbitrary object.
 */
function firstImageValue(
  value: unknown,
): string {
  const record = objectValue(value);

  if (!record) {
    return '';
  }

  const candidates = [
    record.coverImage,
    record.coverPhoto,
    record.cover,
    record.image,
    record.imageUrl,
    record.photo,
    record.photoUrl,
    record.thumbnail,
    record.thumbnailUrl,
    record.logo,
    record.logoUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
}

/**
 * Resolve the image that should be displayed on Travel cards.
 *
 * Priority:
 *
 * 1. listing.coverImage
 * 2. listing.coverPhoto
 * 3. listing.images[0]
 * 4. listing.image
 * 5. listing.imageUrl
 * 6. metadata.coverImage
 * 7. metadata.coverPhoto
 * 8. metadata.image
 * 9. metadata.imageUrl
 * 10. nested partner/business coverImage
 *
 * This is important because partner-created businesses store their
 * uploaded cover photo separately from the listing images.
 */
function image(
  listing: TravelListing,
): string {
  const listingRecord =
    objectValue(listing);

  const meta =
    metadata(listing);

  if (listingRecord) {
    const directImage =
      firstImageValue(listingRecord);

    if (directImage) {
      return directImage;
    }
  }

  const listingImages =
    Array.isArray(listing.images)
      ? listing.images
      : [];

  for (const item of listingImages) {
    if (
      typeof item === 'string' &&
      item.trim()
    ) {
      return item.trim();
    }

    const nestedImage =
      firstImageValue(item);

    if (nestedImage) {
      return nestedImage;
    }
  }

  const metadataCandidates = [
    meta.coverImage,
    meta.coverPhoto,
    meta.cover,
    meta.image,
    meta.imageUrl,
    meta.photo,
    meta.photoUrl,
    meta.thumbnail,
    meta.thumbnailUrl,
  ];

  for (const candidate of metadataCandidates) {
    if (
      typeof candidate === 'string' &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  /**
   * Some API responses return:
   *
   * {
   *   listing: {...},
   *   partner: {
   *     coverImage: "/uploads/..."
   *   }
   * }
   *
   * or:
   *
   * {
   *   business: {
   *     coverImage: "/uploads/..."
   *   }
   * }
   */
  const nestedBusinessKeys = [
    'partner',
    'business',
    'organization',
    'owner',
    'merchant',
    'provider',
  ];

  for (const key of nestedBusinessKeys) {
    const nested =
      firstImageValue(
        listingRecord?.[key],
      );

    if (nested) {
      return nested;
    }

    const metadataNested =
      firstImageValue(
        meta[key],
      );

    if (metadataNested) {
      return metadataNested;
    }
  }

  return '';
}

function location(
  listing: TravelListing,
): string {
  const city = listing.city || '';
  const country = listing.country || '';

  if (city && country) {
    return `${city}, ${country}`;
  }

  return city || country;
}

/* ============================================================================
   STAY
============================================================================ */

export function toStayCardProps(
  listing: TravelListing,
  isSaved = false,
): StayCardProps {
  return {
    id: listingId(listing),

    name: listing.name,

    location: location(listing),

    image: image(listing),

    rating: numberValue(
      listing.rating,
      0,
    ),

    amenities:
      listing.amenities?.length
        ? listing.amenities.join(' · ')
        : stringArray(
            metadata(listing).amenities,
          ).join(' · '),

    price: numberValue(
      listing.price,
      0,
    ),

    currency:
      listing.currency || '$',

    isSaved,
  };
}

/* ============================================================================
   CAR
============================================================================ */

export function toCarCardProps(
  listing: TravelListing,
): CarCardProps {
  const meta = metadata(listing);

  const transmission =
    stringValue(
      meta.transmission,
      'Automatic',
    ) === 'Manual'
      ? 'Manual'
      : 'Automatic';

  return {
    id: listingId(listing),

    name: listing.name,

    category:
      stringValue(
        meta.category,
        'Rental car',
      ),

    image: image(listing),

    emoji:
      stringValue(
        meta.emoji,
        '🚗',
      ),

    seats: numberValue(
      meta.seats,
      5,
    ),

    transmission,

    hasAC: booleanValue(
      meta.hasAC,
      true,
    ),

    bags:
      typeof meta.bags === 'number'
        ? meta.bags
        : undefined,

    pricePerDay: numberValue(
      listing.price,
      0,
    ),

    currency:
      listing.currency || '$',

    badges:
      stringArray(
        meta.badges,
      ),
  };
}

/* ============================================================================
   RESTAURANT
============================================================================ */

export function toRestaurantCardProps(
  listing: TravelListing,
): RestaurantCardProps {
  const meta = metadata(listing);

  const availableTimes =
    stringArray(
      meta.availableTimes,
    );

  return {
    id: listingId(listing),

    name: listing.name,

    cuisine:
      stringValue(
        meta.cuisine,
        'Restaurant',
      ),

    location: location(listing),

    image: image(listing),

    rating: numberValue(
      listing.rating,
      0,
    ),

    priceRange:
      stringValue(
        meta.priceRange,
        '',
      ) || undefined,

    availableTimes,
  };
}

/* ============================================================================
   EXPERIENCE
============================================================================ */

export function toExperienceCardProps(
  listing: TravelListing,
): ExperienceCardProps {
  const meta = metadata(listing);

  return {
    id: listingId(listing),

    name: listing.name,

    duration:
      stringValue(
        meta.duration,
        'Flexible',
      ),

    image: image(listing),

    price: numberValue(
      listing.price,
      0,
    ),

    currency:
      listing.currency || '$',

    rating:
      typeof listing.rating === 'number'
        ? listing.rating
        : undefined,
  };
}

/* ============================================================================
   TRANSFER
============================================================================ */

export function toTransferCardProps(
  listing: TravelListing,
): TransferCardProps {
  const meta = metadata(listing);

  const metaText =
    stringValue(
      meta.meta,
      '',
    ) ||
    [
      stringValue(
        meta.vehicle,
        '',
      ),

      stringValue(
        meta.passengers,
        '',
      )
        ? `${stringValue(meta.passengers)} passengers`
        : '',

      stringValue(
        meta.duration,
        '',
      ),
    ]
      .filter(Boolean)
      .join(' · ');

  return {
    id: listingId(listing),

    name: listing.name,

    icon:
      stringValue(
        meta.icon,
        '🚐',
      ),

    meta:
      metaText ||
      location(listing),

    price: numberValue(
      listing.price,
      0,
    ),

    currency:
      listing.currency || '$',
  };
}

/* ============================================================================
   MEETING ROOM
============================================================================ */

function meetingTimes(
  value: unknown,
): MeetingRoomTime[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): MeetingRoomTime | null => {
      if (typeof item === 'string') {
        return {
          time: item,
        };
      }

      if (
        item &&
        typeof item === 'object'
      ) {
        const record =
          item as Record<
            string,
            unknown
          >;

        const time =
          stringValue(
            record.time,
            '',
          );

        if (!time) {
          return null;
        }

        return {
          time,

          taken:
            typeof record.taken ===
            'boolean'
              ? record.taken
              : undefined,
        };
      }

      return null;
    })
    .filter(
      (
        item,
      ): item is MeetingRoomTime =>
        item !== null,
    );
}

export function toMeetingRoomCardProps(
  listing: TravelListing,
): MeetingRoomCardProps {
  const meta = metadata(listing);

  const hourlyPrice =
    numberValue(
      meta.hourlyPrice,
      listing.price,
    );

  const halfDayPrice =
    numberValue(
      meta.halfDayPrice,
      hourlyPrice * 4,
    );

  const fullDayPrice =
    numberValue(
      meta.fullDayPrice,
      hourlyPrice * 8,
    );

  return {
    id: listingId(listing),

    name: listing.name,

    image: image(listing),

    capacity: numberValue(
      meta.capacity,
      1,
    ),

    layouts:
      stringArray(
        meta.layouts,
      ),

    amenities:
      listing.amenities?.length
        ? listing.amenities
        : stringArray(
            meta.amenities,
          ),

    hourlyPrice,

    halfDayPrice,

    fullDayPrice,

    times: meetingTimes(
      meta.times,
    ),

    currency:
      listing.currency || '$',
  };
}

/* ============================================================================
   DESTINATION
============================================================================ */

export function toDestinationCardProps(
  listing: TravelListing,
  wide = false,
): DestinationCardProps {
  const meta = metadata(listing);

  const slug =
    stringValue(
      meta.slug,
      listing.city
        ? listing.city
            .toLowerCase()
            .replace(
              /\s+/g,
              '-',
            )
        : listingId(listing),
    );

  const count =
    stringValue(
      meta.count,
      'Explore',
    );

  return {
    slug,

    name:
      stringValue(
        meta.destinationName,
        listing.city || listing.name,
      ),

    flag:
      stringValue(
        meta.flag,
        '',
      ) || undefined,

    count,

    image: image(listing),

    wide,
  };
}

/* ============================================================================
   HELPERS
============================================================================ */

export function getListingType(
  listing: TravelListing,
): ListingType {
  return listing.type;
}

export function getListingMetadata(
  listing: TravelListing,
): Metadata {
  return metadata(listing);
}