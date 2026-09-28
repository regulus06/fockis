import 'reflect-metadata';

import { ConfigModule } from '@nestjs/config';

import {
  connect,
  disconnect,
  model,
  Schema,
  Types,
} from 'mongoose';

import * as bcrypt from 'bcryptjs';

/* ============================================================================
   TRAVEL SEED DATA
============================================================================ */

type SeedListing = {
  name: string;
  title?: string;
  type:
    | 'stay'
    | 'rental'
    | 'meeting'
    | 'event'
    | 'restaurant'
    | 'car'
    | 'flight'
    | 'transfer'
    | 'experience'
    | 'attraction'
    | 'thing';

  city: string;
  country: string;

  price: number;
  currency: string;
  priceUnit: string;

  amenities: string[];
  tags: string[];

  description?: string;

  rating?: number;
  reviewCount?: number;

  images?: string[];

  category?: string;

  metadata?: Record<string, unknown>;
};

const listings: SeedListing[] = [
  /* --------------------------------------------------------------------------
     STAYS
  -------------------------------------------------------------------------- */

  {
    name: 'Karibe Hillside Hotel',
    title: 'Karibe Hillside Hotel',
    type: 'stay',
    city: 'Pétion-Ville',
    country: 'Haiti',
    price: 95,
    currency: 'USD',
    priceUnit: 'night',
    amenities: [
      'Wi-Fi',
      'Pool',
      'Breakfast',
      'Meeting Rooms',
    ],
    tags: [
      'hotel',
      'haiti',
      'business',
      'family',
    ],
    description:
      'Comfortable hillside accommodation in Pétion-Ville, Haiti.',
    rating: 4.8,
    reviewCount: 124,
    images: [],
    category: 'Hotels & Stays',
    metadata: {
      propertyType: 'hotel',
      availableTimes: [],
    },
  },

  {
    name: 'Casa Marina Suites',
    title: 'Casa Marina Suites',
    type: 'stay',
    city: 'Punta Cana',
    country: 'Dominican Republic',
    price: 168,
    currency: 'USD',
    priceUnit: 'night',
    amenities: [
      'Beachfront',
      'Spa',
      'All-Inclusive',
    ],
    tags: [
      'hotel',
      'beach',
      'resort',
      'dominican republic',
    ],
    description:
      'Beachfront suites and resort accommodation in Punta Cana.',
    rating: 4.8,
    reviewCount: 218,
    images: [],
    category: 'Hotels & Stays',
    metadata: {
      propertyType: 'resort',
      availableTimes: [],
    },
  },

  {
    name: 'Le Marais Boutique',
    title: 'Le Marais Boutique',
    type: 'stay',
    city: 'Paris',
    country: 'France',
    price: 210,
    currency: 'EUR',
    priceUnit: 'night',
    amenities: [
      'Wi-Fi',
      'Concierge',
      'Business Centre',
    ],
    tags: [
      'hotel',
      'boutique',
      'paris',
      'france',
    ],
    description:
      'Boutique accommodation in the heart of Paris.',
    rating: 4.8,
    reviewCount: 176,
    images: [],
    category: 'Hotels & Stays',
    metadata: {
      propertyType: 'boutique hotel',
      availableTimes: [],
    },
  },

  {
    name: 'Shibuya Sky Rooms',
    title: 'Shibuya Sky Rooms',
    type: 'stay',
    city: 'Tokyo',
    country: 'Japan',
    price: 18400,
    currency: 'JPY',
    priceUnit: 'night',
    amenities: [
      'Wi-Fi',
      'Laundry',
      'Airport Transfer',
    ],
    tags: [
      'hotel',
      'tokyo',
      'japan',
      'shibuya',
    ],
    description:
      'Modern rooms near Shibuya with convenient city access.',
    rating: 4.8,
    reviewCount: 193,
    images: [],
    category: 'Hotels & Stays',
    metadata: {
      propertyType: 'hotel',
      availableTimes: [],
    },
  },

  /* --------------------------------------------------------------------------
     MEETING
  -------------------------------------------------------------------------- */

  {
    name: 'Conference Room A',
    title: 'Conference Room A',
    type: 'meeting',
    city: 'Pétion-Ville',
    country: 'Haiti',
    price: 60,
    currency: 'USD',
    priceUnit: 'hour',
    amenities: [
      'Projector',
      'Wi-Fi',
      'Video conference',
      'Whiteboard',
    ],
    tags: [
      'meeting',
      'conference',
      'business',
      'haiti',
    ],
    description:
      'Professional conference room for meetings, presentations and video conferences.',
    rating: 4.8,
    reviewCount: 42,
    images: [],
    category: 'Meeting Spaces',
    metadata: {
      roomType: 'conference room',
      availableTimes: [
        '9:00 AM',
        '11:00 AM',
        '1:00 PM',
        '3:00 PM',
      ],
    },
  },

  /* --------------------------------------------------------------------------
     CARS
  -------------------------------------------------------------------------- */

  {
    name: 'Toyota Corolla',
    title: 'Toyota Corolla',
    type: 'car',
    city: 'Pétion-Ville',
    country: 'Haiti',
    price: 45,
    currency: 'USD',
    priceUnit: 'day',
    amenities: [
      '5 seats',
      'Automatic',
      'A/C',
      '2 bags',
    ],
    tags: [
      'car',
      'rental',
      'toyota',
      'corolla',
    ],
    description:
      'Reliable Toyota Corolla available for daily rental.',
    rating: 4.7,
    reviewCount: 31,
    images: [],
    category: 'Car Rental',
    metadata: {
      seats: 5,
      transmission: 'automatic',
      airConditioning: true,
      luggage: 2,
    },
  },

  {
    name: 'Toyota RAV4',
    title: 'Toyota RAV4',
    type: 'car',
    city: 'Pétion-Ville',
    country: 'Haiti',
    price: 55,
    currency: 'USD',
    priceUnit: 'day',
    amenities: [
      '5 seats',
      'Automatic',
      'A/C',
      'Unlimited mileage',
    ],
    tags: [
      'car',
      'rental',
      'toyota',
      'rav4',
      'suv',
    ],
    description:
      'Toyota RAV4 SUV with automatic transmission and unlimited mileage.',
    rating: 4.8,
    reviewCount: 27,
    images: [],
    category: 'Car Rental',
    metadata: {
      seats: 5,
      transmission: 'automatic',
      airConditioning: true,
      unlimitedMileage: true,
    },
  },

  {
    name: 'Ford Transit Van',
    title: 'Ford Transit Van',
    type: 'car',
    city: 'Pétion-Ville',
    country: 'Haiti',
    price: 95,
    currency: 'USD',
    priceUnit: 'day',
    amenities: [
      '12 seats',
      'A/C',
      'Group travel',
    ],
    tags: [
      'van',
      'car',
      'rental',
      'group travel',
      'ford',
    ],
    description:
      'Spacious Ford Transit van suitable for groups and family travel.',
    rating: 4.7,
    reviewCount: 19,
    images: [],
    category: 'Car Rental',
    metadata: {
      seats: 12,
      transmission: 'automatic',
      airConditioning: true,
      groupTravel: true,
    },
  },

  {
    name: 'Tesla Model 3',
    title: 'Tesla Model 3',
    type: 'car',
    city: 'Pétion-Ville',
    country: 'Haiti',
    price: 85,
    currency: 'USD',
    priceUnit: 'day',
    amenities: [
      '5 seats',
      'Automatic',
      'Electric',
      'Autopilot',
    ],
    tags: [
      'car',
      'rental',
      'tesla',
      'electric',
      'model 3',
    ],
    description:
      'Tesla Model 3 electric vehicle available for daily rental.',
    rating: 4.9,
    reviewCount: 15,
    images: [],
    category: 'Car Rental',
    metadata: {
      seats: 5,
      transmission: 'automatic',
      electric: true,
      autopilot: true,
    },
  },

  /* --------------------------------------------------------------------------
     RESTAURANTS
  -------------------------------------------------------------------------- */

  {
    name: 'Kinam Table Rouge',
    title: 'Kinam Table Rouge',
    type: 'restaurant',
    city: 'Pétion-Ville',
    country: 'Haiti',
    price: 0,
    currency: 'USD',
    priceUnit: 'reservation',
    amenities: [
      'Fine Dining',
    ],
    tags: [
      'Haitian',
      'Fine Dining',
      'haitian',
    ],
    description:
      'Fine dining restaurant featuring Haitian cuisine in Pétion-Ville.',
    rating: 4.7,
    reviewCount: 86,
    images: [],
    category: 'Restaurants',
    metadata: {
      cuisine: 'Haitian',
      cuisineTag: 'haitian',
      availableTimes: [
        '6:00 PM',
        '7:00 PM',
        '8:30 PM',
      ],
      reservationRequired: true,
    },
  },

  {
    name: 'Le Petit Marché',
    title: 'Le Petit Marché',
    type: 'restaurant',
    city: 'Paris',
    country: 'France',
    price: 0,
    currency: 'EUR',
    priceUnit: 'reservation',
    amenities: [
      'Bistro',
    ],
    tags: [
      'French',
      'Bistro',
      'french',
    ],
    description:
      'Classic French bistro dining in Paris.',
    rating: 4.7,
    reviewCount: 104,
    images: [],
    category: 'Restaurants',
    metadata: {
      cuisine: 'French',
      cuisineTag: 'french',
      availableTimes: [
        '6:00 PM',
        '7:00 PM',
        '8:30 PM',
      ],
      reservationRequired: true,
    },
  },

  {
    name: 'Shibuya Yakitori House',
    title: 'Shibuya Yakitori House',
    type: 'restaurant',
    city: 'Tokyo',
    country: 'Japan',
    price: 0,
    currency: 'JPY',
    priceUnit: 'reservation',
    amenities: [
      'Izakaya',
    ],
    tags: [
      'Japanese',
      'Izakaya',
      'japanese',
    ],
    description:
      'Japanese yakitori and izakaya dining in Shibuya.',
    rating: 4.8,
    reviewCount: 121,
    images: [],
    category: 'Restaurants',
    metadata: {
      cuisine: 'Japanese',
      cuisineTag: 'japanese',
      availableTimes: [
        '6:00 PM',
        '7:00 PM',
        '8:30 PM',
      ],
      reservationRequired: true,
    },
  },

  {
    name: 'Fogo Carioca',
    title: 'Fogo Carioca',
    type: 'restaurant',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    price: 0,
    currency: 'BRL',
    priceUnit: 'reservation',
    amenities: [
      'Churrascaria',
    ],
    tags: [
      'Brazilian',
      'Churrascaria',
      'brazilian',
    ],
    description:
      'Brazilian churrascaria experience in Rio de Janeiro.',
    rating: 4.8,
    reviewCount: 97,
    images: [],
    category: 'Restaurants',
    metadata: {
      cuisine: 'Brazilian',
      cuisineTag: 'brazilian',
      availableTimes: [
        '6:00 PM',
        '7:00 PM',
        '8:30 PM',
      ],
      reservationRequired: true,
    },
  },

  /* --------------------------------------------------------------------------
     EXPERIENCES
  -------------------------------------------------------------------------- */

  {
    name: 'Kenscoff Mountain Tour',
    title: 'Kenscoff Mountain Tour',
    type: 'experience',
    city: 'Kenscoff',
    country: 'Haiti',
    price: 50,
    currency: 'USD',
    priceUnit: 'person',
    amenities: [
      'Half-day',
      'Local guide',
    ],
    tags: [
      'experience',
      'tour',
      'haiti',
      'mountain',
    ],
    description:
      'Half-day guided mountain experience through Kenscoff.',
    rating: 4.8,
    reviewCount: 44,
    images: [],
    category: 'Experiences',
    metadata: {
      durationHours: 4,
    },
  },

  {
    name: 'Île-à-Vache Boat Trip',
    title: 'Île-à-Vache Boat Trip',
    type: 'experience',
    city: 'Île-à-Vache',
    country: 'Haiti',
    price: 85,
    currency: 'USD',
    priceUnit: 'person',
    amenities: [
      'Full-day',
      'Boat',
    ],
    tags: [
      'experience',
      'boat',
      'beach',
      'haiti',
    ],
    description:
      'Full-day boat trip exploring Île-à-Vache.',
    rating: 4.9,
    reviewCount: 53,
    images: [],
    category: 'Experiences',
    metadata: {
      durationHours: 8,
    },
  },

  {
    name: 'Cap-Haïtien Citadel Walk',
    title: 'Cap-Haïtien Citadel Walk',
    type: 'experience',
    city: 'Cap-Haïtien',
    country: 'Haiti',
    price: 30,
    currency: 'USD',
    priceUnit: 'person',
    amenities: [
      '2 hours',
      'Culture',
    ],
    tags: [
      'experience',
      'culture',
      'history',
      'haiti',
    ],
    description:
      'Guided cultural and historical walk around the Citadel area of Cap-Haïtien.',
    rating: 4.8,
    reviewCount: 61,
    images: [],
    category: 'Experiences',
    metadata: {
      durationHours: 2,
    },
  },

  /* --------------------------------------------------------------------------
     TRANSFER
  -------------------------------------------------------------------------- */

  {
    name: 'Airport Transfer — PAP to Pétion-Ville',
    title: 'Airport Transfer — PAP to Pétion-Ville',
    type: 'transfer',
    city: 'Pétion-Ville',
    country: 'Haiti',
    price: 40,
    currency: 'USD',
    priceUnit: 'ride',
    amenities: [
      'Private car',
      'Van',
      'Shuttle',
    ],
    tags: [
      'transfer',
      'airport',
      'PAP',
      'transportation',
    ],
    description:
      'Airport transfer service from Port-au-Prince airport to Pétion-Ville.',
    rating: 4.8,
    reviewCount: 73,
    images: [],
    category: 'Transportation',
    metadata: {
      airport: 'PAP',
      destination: 'Pétion-Ville',
      availableTimes: [
        '6:00 AM',
        '9:00 AM',
        '12:00 PM',
        '3:00 PM',
        '6:00 PM',
        '9:00 PM',
      ],
    },
  },
];

/* ============================================================================
   SEED
============================================================================ */

async function run() {
  ConfigModule.forRoot({
    isGlobal: true,
  });

  const mongoUri =
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/fockis_travel';

  await connect(mongoUri);

  /*
   * --------------------------------------------------------------------------
   * USER MODEL
   *
   * This is only used by the seed.
   * The Travel auth system can continue using its own registered model.
   * --------------------------------------------------------------------------
   */

  const UserSchema =
    new Schema(
      {
        email: {
          type: String,
          unique: true,
          index: true,
          trim: true,
          lowercase: true,
        },

        passwordHash: String,

        name: String,

        role: {
          type: String,
          default: 'user',
        },

        active: {
          type: Boolean,
          default: true,
        },
      },
      {
        timestamps: true,
      },
    );

  const User =
    model(
      'User',
      UserSchema,
    );

  /*
   * --------------------------------------------------------------------------
   * LISTING MODEL
   *
   * IMPORTANT:
   * This mirrors the real Travel Listing schema instead of creating
   * a stripped-down incompatible version.
   * --------------------------------------------------------------------------
   */

  const ListingSchema =
    new Schema(
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },

        title: {
          type: String,
          trim: true,
        },

        type: {
          type: String,
          required: true,
          index: true,
        },

        category: {
          type: String,
          trim: true,
          index: true,
        },

        description: {
          type: String,
          required: true,
          trim: true,
        },

        country: {
          type: String,
          required: true,
          trim: true,
          index: true,
        },

        city: {
          type: String,
          required: true,
          trim: true,
          index: true,
        },

        address: {
          type: String,
          trim: true,
        },

        latitude: Number,

        longitude: Number,

        phone: {
          type: String,
          trim: true,
        },

        website: {
          type: String,
          trim: true,
        },

        images: {
          type: [String],
          default: [],
        },

        amenities: {
          type: [String],
          default: [],
        },

        tags: {
          type: [String],
          default: [],
        },

        capacity: Number,

        bedrooms: Number,

        bathrooms: Number,

        rating: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },

        reviewCount: {
          type: Number,
          default: 0,
          min: 0,
        },

        currency: {
          type: String,
          required: true,
          default: 'USD',
          uppercase: true,
          trim: true,
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },

        priceUnit: {
          type: String,
          default: 'night',
          trim: true,
        },

        active: {
          type: Boolean,
          default: true,
          index: true,
        },

        status: {
          type: String,
          default: 'active',
          index: true,
        },

        /*
         * Keep partnerId compatible with the current Listing schema.
         */
        partnerId: {
          type: Types.ObjectId,
          ref: 'User',
          index: true,
        },

        inventory: {
          total: {
            type: Number,
            default: 0,
            min: 0,
          },

          reserved: {
            type: Number,
            default: 0,
            min: 0,
          },

          available: {
            type: Number,
            default: 0,
            min: 0,
          },
        },

        metadata: {
          type: Object,
          default: {},
        },
      },
      {
        timestamps: true,
      },
    );

  const Listing =
    model(
      'Listing',
      ListingSchema,
    );

  /* ==========================================================================
     ADMIN USER
  ========================================================================== */

  const email =
    process.env.SEED_ADMIN_EMAIL ||
    'admin@fockis.com';

  const password =
    process.env.SEED_ADMIN_PASSWORD ||
    'ChangeMe123!';

  let user =
    await User.findOne({
      email,
    });

  if (!user) {
    user =
      await User.create({
        email,

        passwordHash:
          await bcrypt.hash(
            password,
            12,
          ),

        name:
          'Fockis Travel Admin',

        role:
          'admin',

        active:
          true,
      });

    console.log(
      'Created Travel admin user:',
      email,
    );
  } else {
    console.log(
      'Travel admin already exists:',
      email,
    );
  }

  /* ==========================================================================
     LISTINGS
  ========================================================================== */

  /*
   * Only clear the Travel listings collection.
   *
   * This does NOT delete users, bookings, partners, reviews,
   * price alerts, trips or wishlist data.
   */
  await Listing.deleteMany({});

  const documents =
    listings.map(
      (listing) => ({
        ...listing,

        rating:
          listing.rating ?? 0,

        reviewCount:
          listing.reviewCount ?? 0,

        images:
          listing.images ?? [],

        amenities:
          listing.amenities ?? [],

        tags:
          listing.tags ?? [],

        active:
          true,

        status:
          'active',

        inventory:
          listing.type === 'restaurant'
            ? {
                total: 0,
                reserved: 0,
                available: 0,
              }
            : {
                total: 10,
                reserved: 0,
                available: 10,
              },

        metadata:
          listing.metadata ?? {},
      }),
    );

  const inserted =
    await Listing.insertMany(
      documents,
    );

  console.log(
    `Inserted ${inserted.length} Travel listings.`,
  );

  /* ==========================================================================
     SUMMARY
  ========================================================================== */

  const counts =
    await Listing.aggregate([
      {
        $group: {
          _id: '$type',
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

  console.log(
    'Listing summary:',
  );

  for (const item of counts) {
    console.log(
      `  ${item._id}: ${item.count}`,
    );
  }

  console.log('');
  console.log(
    '==================================================',
  );
  console.log(
    'Fockis Travel seed complete.',
  );
  console.log(
    '==================================================',
  );
  console.log(
    `Admin: ${email}`,
  );
  console.log(
    `Listings: ${inserted.length}`,
  );
  console.log(
    `MongoDB: ${mongoUri}`,
  );
  console.log(
    '==================================================',
  );
}

/* ============================================================================
   START
============================================================================ */

run()
  .catch((error) => {
    console.error(
      'Travel seed failed:',
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });