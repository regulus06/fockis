import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ListingDocument = HydratedDocument<Listing>;

export type ListingType =
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
| 'thing'
| string;

export const LISTING_TYPES: ListingType[] = [
'stay',
'rental',
'meeting',
'event',
'restaurant',
'car',
'flight',
'transfer',
'experience',
'attraction',
'thing',
];

/* ============================================================================
INVENTORY
============================================================================ */

@Schema({
_id: false,
})
export class ListingInventory {
@Prop({
required: true,
default: 0,
min: 0,
})
total!: number;

@Prop({
required: true,
default: 0,
min: 0,
})
reserved!: number;

@Prop({
required: true,
default: 0,
min: 0,
})
available!: number;
}

export const ListingInventorySchema =
SchemaFactory.createForClass(ListingInventory);

/* ============================================================================
LISTING
============================================================================ */

@Schema({
timestamps: true,
})
export class Listing {
/* ==========================================================================
BASIC INFORMATION
========================================================================== */

@Prop({
required: true,
trim: true,
index: true,
})
name!: string;

@Prop({
trim: true,
index: true,
})
title?: string;

@Prop({
required: true,
enum: LISTING_TYPES,
index: true,
})
type!: ListingType;

/**

Primary category.
Kept for backwards compatibility with the existing
Travel listing system.
*/
@Prop({
trim: true,
index: true,
})
category?: string;

/**

All categories selected by the owner.
Example:
[
'Hotels & Stays',
'Restaurants',
'Meeting Spaces',
]
*/
@Prop({
type: [String],
default: [],
index: true,
})
categories!: string[];

@Prop({
required: true,
trim: true,
})
description!: string;

/* ==========================================================================
LOCATION
========================================================================== */

@Prop({
required: true,
trim: true,
index: true,
})
country!: string;

@Prop({
required: true,
trim: true,
index: true,
})
city!: string;

@Prop({
trim: true,
})
state?: string;

@Prop({
trim: true,
})
postalCode?: string;

@Prop({
trim: true,
})
address?: string;

@Prop()
addressLine2?: string;

@Prop()
latitude?: number;

@Prop()
longitude?: number;

/* ==========================================================================
CONTACT
========================================================================== */

@Prop({
trim: true,
})
phone?: string;

@Prop({
trim: true,
})
email?: string;

@Prop({
trim: true,
})
website?: string;

/* ==========================================================================
IMAGES / MEDIA
========================================================================== */

@Prop({
type: [String],
default: [],
})
images!: string[];

@Prop({
trim: true,
})
logo?: string;

@Prop({
trim: true,
})
coverImage?: string;

/* ==========================================================================
FEATURES
========================================================================== */

@Prop({
type: [String],
default: [],
})
amenities!: string[];

@Prop({
type: [String],
default: [],
})
tags!: string[];

@Prop({
type: [String],
default: [],
})
features!: string[];

/* ==========================================================================
LISTING DETAILS
========================================================================== */

@Prop({
min: 0,
})
capacity?: number;

@Prop({
min: 0,
})
bedrooms?: number;

@Prop({
min: 0,
})
bathrooms?: number;

/* ==========================================================================
RESTAURANT / RESERVATION SUPPORT
========================================================================== */

@Prop({
default: false,
})
reservationRequired!: boolean;

@Prop({
default: true,
})
acceptingBookings!: boolean;

@Prop({
type: [String],
default: [],
})
availableTimes!: string[];

@Prop({
type: [Number],
default: [],
})
partySizes!: number[];

/* ==========================================================================
BUSINESS HOURS
========================================================================== */

@Prop({
type: Object,
default: {},
})
businessHours!: {
[key: string]: unknown;
};

/* ==========================================================================
REVIEWS / RATING
========================================================================== */

@Prop({
default: 0,
min: 0,
max: 5,
})
rating!: number;

@Prop({
default: 0,
min: 0,
})
reviewCount!: number;

/* ==========================================================================
PRICING
========================================================================== */

@Prop({
required: true,
trim: true,
uppercase: true,
default: 'USD',
})
currency!: string;

@Prop({
required: true,
min: 0,
})
price!: number;

@Prop({
default: 'night',
trim: true,
})
priceUnit!: string;

@Prop({
min: 0,
})
originalPrice?: number;

/* ==========================================================================
STATUS
========================================================================== */

@Prop({
default: true,
index: true,
})
active!: boolean;

@Prop({
trim: true,
default: 'active',
index: true,
})
status!: string;

@Prop({
default: false,
index: true,
})
featured!: boolean;

/* ==========================================================================
PARTNER
========================================================================== */

@Prop({
type: Types.ObjectId,
ref: 'User',
index: true,
})
partnerId?: Types.ObjectId;

/* ==========================================================================
INVENTORY
========================================================================== */

@Prop({
type: ListingInventorySchema,
default: () => ({
total: 0,
reserved: 0,
available: 0,
}),
})
inventory!: ListingInventory;

/* ==========================================================================
FLEXIBLE METADATA
========================================================================== */

@Prop({
type: Object,
default: {},
})
metadata!: {
[key: string]: unknown;
};
}

/* ============================================================================
SCHEMA
============================================================================ */

export const ListingSchema =
SchemaFactory.createForClass(Listing);

/* ============================================================================
SEARCH INDEXES
============================================================================ */

ListingSchema.index({
type: 1,
country: 1,
city: 1,
active: 1,
});

ListingSchema.index({
country: 1,
city: 1,
active: 1,
});

ListingSchema.index({
partnerId: 1,
active: 1,
});

ListingSchema.index({
name: 'text',
title: 'text',
description: 'text',
tags: 'text',
});

/* ============================================================================
PRIMARY CATEGORY SEARCH
============================================================================ */

ListingSchema.index({
category: 1,
type: 1,
active: 1,
});

/* ============================================================================
MULTI-CATEGORY SEARCH
============================================================================ */

ListingSchema.index({
categories: 1,
type: 1,
active: 1,
});

ListingSchema.index({
categories: 1,
active: 1,
});

ListingSchema.index({
categories: 1,
category: 1,
type: 1,
active: 1,
});

/* ============================================================================
METADATA SEARCH
============================================================================ */

ListingSchema.index({
'metadata.category': 1,
type: 1,
active: 1,
});

ListingSchema.index({
'metadata.durationHours': 1,
type: 1,
});

ListingSchema.index({
'metadata.transmission': 1,
'metadata.seats': 1,
type: 1,
});

ListingSchema.index({
'metadata.availableFrom': 1,
'metadata.availableUntil': 1,
type: 1,
});

/* ============================================================================
INVENTORY SEARCH
============================================================================ */

ListingSchema.index({
'inventory.available': 1,
active: 1,
});

/* ============================================================================
RESTAURANT SEARCH
============================================================================ */

ListingSchema.index({
type: 1,
category: 1,
active: 1,
rating: -1,
});

ListingSchema.index({
type: 1,
categories: 1,
active: 1,
rating: -1,
});

ListingSchema.index({
type: 1,
city: 1,
active: 1,
rating: -1,
});

/* ============================================================================
PRICE SEARCH
============================================================================ */

ListingSchema.index({
type: 1,
price: 1,
active: 1,
});