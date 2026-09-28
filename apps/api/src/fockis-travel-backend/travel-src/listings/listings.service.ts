import {
BadRequestException,
Injectable,
NotFoundException,
ForbiddenException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
Model,
Types,
} from "mongoose";

import {
Listing,
ListingDocument,
ListingType,
} from "./listing.schema";

import {
CreateListingDto,
UpdateListingDto,
} from "./dto";

/* ============================================================================
SEARCH QUERY
============================================================================ */

interface SearchListingsQuery {
type?: string;
category?: string;
city?: string;
country?: string;
minPrice?: number | string;
maxPrice?: number | string;
text?: string;
limit?: number | string;
skip?: number | string;

/* Car rental search */
pickupDate?: string;
dropoffDate?: string;
}

/* ============================================================================
CATEGORY -> CANONICAL TYPE
============================================================================ */

const CATEGORY_TO_TYPE: Record<string, ListingType> = {
"Hotels & Stays": "stay",
Restaurants: "restaurant",
"Car Rental": "car",
Experiences: "experience",
"Meeting Spaces": "meeting",
Transportation: "transfer",
Events: "event",
"Vacation Rentals": "rental",
Flights: "flight",
Attractions: "attraction",
"Things To Do": "thing",
};

/* ============================================================================
SERVICE
============================================================================ */

@Injectable()
export class ListingsService {
constructor(
@InjectModel(Listing.name)
private readonly model: Model<ListingDocument>,
) {}

/* ==========================================================================
CREATE

```
 POST /travel/listings

 The authenticated user's MongoDB User._id becomes partnerId.
```

========================================================================== */

async create(
dto: CreateListingDto,
partnerId?: string,
) {
if (!partnerId) {
throw new BadRequestException(
"Authenticated partner ID is required",
);
}

if (!Types.ObjectId.isValid(partnerId)) {
  throw new BadRequestException(
    "Invalid partner ID",
  );
}

const normalizedPartnerId =
  new Types.ObjectId(partnerId);

const metadata: Record<string, any> =
  isPlainObject(dto.metadata)
    ? {
        ...dto.metadata,
      }
    : {};

/* ------------------------------------------------------------------------
   CATEGORIES
------------------------------------------------------------------------ */

const normalizedCategories =
  normalizeCategories(
    dto.categories,
    dto.category,
  );

const primaryCategory =
  normalizedCategories[0] ??
  normalizeCategory(dto.category);

/* ------------------------------------------------------------------------
   CANONICAL TYPE
------------------------------------------------------------------------ */

let listingType: ListingType = dto.type;

if (primaryCategory) {
  const mappedType =
    CATEGORY_TO_TYPE[primaryCategory];

  if (mappedType) {
    listingType = mappedType;
  }
}

/* ------------------------------------------------------------------------
   INVENTORY
------------------------------------------------------------------------ */

const suppliedInventory =
  dto.inventory ??
  metadata.inventory;

const inventory =
  normalizeInventory(
    suppliedInventory,
  );

metadata.inventory =
  inventory;

/* ------------------------------------------------------------------------
   CATEGORY
------------------------------------------------------------------------ */

const category =
  primaryCategory ??
  typeToCategory(listingType);

const categories =
  normalizedCategories.length > 0
    ? normalizedCategories
    : category
      ? [category]
      : [];

if (categories.length === 0) {
  throw new BadRequestException(
    "At least one listing category is required",
  );
}

/* ------------------------------------------------------------------------
   DOCUMENT
------------------------------------------------------------------------ */

const document: Record<string, any> = {
  ...dto,

  type: listingType,

  category,

  categories,

  metadata,

  inventory,

  partnerId:
    normalizedPartnerId,
};

/* ------------------------------------------------------------------------
   NAME / TITLE
------------------------------------------------------------------------ */

const name =
  typeof dto.name === "string"
    ? dto.name.trim()
    : "";

const title =
  typeof dto.title === "string"
    ? dto.title.trim()
    : "";

document.name =
  name || title;

document.title =
  title || name;

if (!document.name) {
  throw new BadRequestException(
    "Listing name or title is required",
  );
}

if (
  typeof document.description !==
    "string" ||
  !document.description.trim()
) {
  throw new BadRequestException(
    "Listing description is required",
  );
}

/* ------------------------------------------------------------------------
   NORMALIZE STRINGS
------------------------------------------------------------------------ */

if (
  typeof document.name ===
  "string"
) {
  document.name =
    document.name.trim();
}

if (
  typeof document.title ===
  "string"
) {
  document.title =
    document.title.trim();
}

if (
  typeof document.description ===
  "string"
) {
  document.description =
    document.description.trim();
}

if (
  typeof document.country ===
  "string"
) {
  document.country =
    document.country.trim();
}

if (
  typeof document.city ===
  "string"
) {
  document.city =
    document.city.trim();
}

if (
  typeof document.address ===
  "string"
) {
  document.address =
    document.address.trim();
}

/* ------------------------------------------------------------------------
   CREATE
------------------------------------------------------------------------ */

const created =
  await this.model.create(
    document,
  );

return normalizeListingResponse(
  created.toObject(),
);


}

/* ==========================================================================
FIND ONE

```
 GET /travel/listings/:id
```

========================================================================== */

async findOne(id: string) {
if (
!Types.ObjectId.isValid(id)
) {
throw new NotFoundException(
"Listing not found",
);
}

const item =
  await this.model
    .findById(id)
    .lean();

if (!item) {
  throw new NotFoundException(
    "Listing not found",
  );
}

return normalizeListingResponse(
  item,
);

}

/* ==========================================================================
FIND LISTINGS OWNED BY PARTNER

 Used by the Travel Partner Dashboard.

 partnerId corresponds to Listing.partnerId.

========================================================================== */

async findByPartner(
partnerId: string,
) {
const normalizedPartnerId =
this.normalizePartnerId(
partnerId,
);

const rawItems =
  await this.model
    .find({
      partnerId:
        normalizedPartnerId,
    })
    .sort({
      createdAt: -1,
    })
    .lean();

const items =
  rawItems.map(
    (item) =>
      normalizeListingResponse(
        item,
      ),
  );

return {
  items,
  total: items.length,
};

}

/* ==========================================================================
SEARCH
========================================================================== */

async search(
q: SearchListingsQuery,
) {
const filter: Record<string, any> = {
active: true,
};

/* ------------------------------------------------------------------------
   TYPE
------------------------------------------------------------------------ */

const requestedType =
  typeof q.type === "string"
    ? q.type.trim().toLowerCase()
    : "";

if (requestedType) {
  const categoryEntry =
    Object.entries(
      CATEGORY_TO_TYPE,
    ).find(
      ([category]) =>
        category
          .trim()
          .toLowerCase() ===
        requestedType,
    );

  const mappedType =
    categoryEntry?.[1];

  filter.type =
    mappedType ??
    requestedType;
}

/* ------------------------------------------------------------------------
   CATEGORY
------------------------------------------------------------------------ */

const requestedCategory =
  typeof q.category === "string"
    ? q.category.trim()
    : "";

if (requestedCategory) {
  const categoryRegex =
    new RegExp(
      `^${escapeRegExp(
        requestedCategory,
      )}$`,
      "i",
    );

  filter.$or = [
    {
      categories:
        categoryRegex,
    },
    {
      category:
        categoryRegex,
    },
  ];
}

/* ------------------------------------------------------------------------
   CITY
------------------------------------------------------------------------ */

const requestedCity =
  typeof q.city === "string"
    ? q.city.trim()
    : "";

if (requestedCity) {
  filter.city =
    new RegExp(
      `^${escapeRegExp(
        requestedCity,
      )}$`,
      "i",
    );
}

/* ------------------------------------------------------------------------
   COUNTRY
------------------------------------------------------------------------ */

const requestedCountry =
  typeof q.country === "string"
    ? q.country.trim()
    : "";

if (requestedCountry) {
  filter.country =
    new RegExp(
      `^${escapeRegExp(
        requestedCountry,
      )}$`,
      "i",
    );
}

/* ------------------------------------------------------------------------
   PRICE
------------------------------------------------------------------------ */

const minPrice =
  q.minPrice !== undefined &&
  q.minPrice !== null &&
  q.minPrice !== ""
    ? Number(q.minPrice)
    : undefined;

const maxPrice =
  q.maxPrice !== undefined &&
  q.maxPrice !== null &&
  q.maxPrice !== ""
    ? Number(q.maxPrice)
    : undefined;

if (
  minPrice !== undefined &&
  Number.isFinite(minPrice)
) {
  filter.price = {
    ...(filter.price || {}),
    $gte: minPrice,
  };
}

if (
  maxPrice !== undefined &&
  Number.isFinite(maxPrice)
) {
  filter.price = {
    ...(filter.price || {}),
    $lte: maxPrice,
  };
}

/* ------------------------------------------------------------------------
   TEXT SEARCH
------------------------------------------------------------------------ */

const requestedText =
  typeof q.text === "string"
    ? q.text.trim()
    : "";

if (requestedText) {
  filter.$text = {
    $search:
      requestedText,
  };
}

/* ------------------------------------------------------------------------
   CAR RENTAL DATE SEARCH
------------------------------------------------------------------------ */

if (
  requestedType === "car" &&
  q.pickupDate &&
  q.dropoffDate
) {
  const pickup =
    parseDateStart(
      q.pickupDate,
    );

  const dropoff =
    parseDateEnd(
      q.dropoffDate,
    );

  if (
    pickup &&
    dropoff
  ) {
    if (pickup > dropoff) {
      throw new BadRequestException(
        "pickupDate must be before or equal to dropoffDate",
      );
    }

    filter.$and = [
      {
        $or: [
          {
            "metadata.availableFrom":
              {
                $exists: false,
              },
          },
          {
            "metadata.availableFrom":
              {
                $lte: pickup,
              },
          },
        ],
      },
      {
        $or: [
          {
            "metadata.availableUntil":
              {
                $exists: false,
              },
          },
          {
            "metadata.availableUntil":
              {
                $gte: dropoff,
              },
          },
        ],
      },
    ];
  }
}

/* ------------------------------------------------------------------------
   PAGINATION
------------------------------------------------------------------------ */

const requestedLimit =
  Number(q.limit) || 20;

const limit =
  Math.min(
    Math.max(
      requestedLimit,
      1,
    ),
    100,
  );

const requestedSkip =
  Number(q.skip) || 0;

const skip =
  Math.max(
    requestedSkip,
    0,
  );

/* ------------------------------------------------------------------------
   DATABASE QUERY
------------------------------------------------------------------------ */

const databaseQuery =
  this.model
    .find(filter)
    .sort(
      requestedText
        ? {
            score: {
              $meta:
                "textScore",
            },
          }
        : {
            createdAt: -1,
          },
    )
    .skip(skip)
    .limit(limit)
    .lean();

const [
  rawItems,
  total,
] =
  await Promise.all([
    databaseQuery,
    this.model.countDocuments(
      filter,
    ),
  ]);

const items =
  rawItems.map(
    (item) =>
      normalizeListingResponse(
        item,
      ),
  );

return {
  items,
  total,
  page:
    Math.floor(
      skip / limit,
    ) + 1,
  limit,
};
}

/* ==========================================================================
UPDATE

```
 PATCH /travel/listings/:id

 The authenticated partner must own the listing.

 Backwards compatibility:
 If an old listing has no partnerId, the authenticated partner may claim
 it by updating it. This is useful for existing listings created before
 partner ownership was wired into the Travel system.
```

========================================================================== */

async update(
id: string,
dto: UpdateListingDto,
partnerId: string,
) {
if (
!Types.ObjectId.isValid(id)
) {
throw new NotFoundException(
"Listing not found",
);
}

const normalizedPartnerId =
  this.normalizePartnerId(
    partnerId,
  );

const existing =
  await this.model.findById(id);

if (!existing) {
  throw new NotFoundException(
    "Listing not found",
  );
}

/* ------------------------------------------------------------------------
   OWNERSHIP

   Existing listings without partnerId are legacy records.

   We allow the authenticated partner to claim an unowned legacy listing
   through the authenticated update endpoint.

   A listing that already belongs to another partner cannot be modified.
------------------------------------------------------------------------ */

if (
  existing.partnerId &&
  existing.partnerId.toString() !==
    normalizedPartnerId.toString()
) {
  throw new ForbiddenException(
    "You do not own this listing",
  );
}

const update: Record<string, any> = {};

/* ------------------------------------------------------------------------
   NAME / TITLE
------------------------------------------------------------------------ */

const incomingTitle =
  typeof dto.title === "string"
    ? dto.title.trim()
    : undefined;

const incomingName =
  typeof dto.name === "string"
    ? dto.name.trim()
    : undefined;

if (incomingTitle) {
  update.title =
    incomingTitle;

  update.name =
    incomingName ||
    incomingTitle;
} else if (incomingName) {
  update.name =
    incomingName;

  update.title =
    incomingName;
}

/* ------------------------------------------------------------------------
   CATEGORY / TYPE
------------------------------------------------------------------------ */

if (
  typeof dto.category ===
  "string"
) {
  const category =
    dto.category.trim();

  update.category =
    category;

  const mappedType =
    CATEGORY_TO_TYPE[
      category
    ];

  if (mappedType) {
    update.type =
      mappedType;
  }
}

/* ------------------------------------------------------------------------
   MULTI-CATEGORY SUPPORT
------------------------------------------------------------------------ */

if (
  dto.categories !==
  undefined
) {
  const categories =
    normalizeCategories(
      dto.categories,
      dto.category,
    );

  if (
    categories.length ===
    0
  ) {
    throw new BadRequestException(
      "At least one listing category is required",
    );
  }

  update.categories =
    categories;

  update.category =
    categories[0];

  const mappedType =
    CATEGORY_TO_TYPE[
      categories[0]
    ];

  if (mappedType) {
    update.type =
      mappedType;
  }
}

/* ------------------------------------------------------------------------
   CATEGORY-ONLY UPDATE
------------------------------------------------------------------------ */

if (
  dto.category !==
    undefined &&
  dto.categories ===
    undefined
) {
  const nextPrimaryCategory =
    typeof dto.category ===
    "string"
      ? dto.category.trim()
      : "";

  if (nextPrimaryCategory) {
    const existingCategories =
      normalizeCategories(
        Array.isArray(
          existing.categories,
        )
          ? existing.categories
          : undefined,
        existing.category,
      );

    const remainingCategories =
      existingCategories.filter(
        (item) =>
          item !==
          existing.category,
      );

    update.categories =
      uniqueStrings([
        nextPrimaryCategory,
        ...remainingCategories,
      ]);
  }
}

/* ------------------------------------------------------------------------
   EXPLICIT TYPE
------------------------------------------------------------------------ */

if (dto.type) {
  update.type =
    dto.type;
}

/* ------------------------------------------------------------------------
   STRING FIELDS
------------------------------------------------------------------------ */

const stringFields = [
  "description",
  "country",
  "city",
  "address",
  "phone",
  "website",
  "priceUnit",
  "currency",
] as const;

for (
  const field of stringFields
) {
  const value =
    dto[field];

  if (
    value !== undefined
  ) {
    update[field] =
      typeof value ===
      "string"
        ? value.trim()
        : value;
  }
}

/* ------------------------------------------------------------------------
   NUMERIC FIELDS
------------------------------------------------------------------------ */

const numberFields = [
  "price",
  "latitude",
  "longitude",
  "capacity",
  "bedrooms",
  "bathrooms",
] as const;

for (
  const field of numberFields
) {
  const value =
    dto[field];

  if (
    value === undefined
  ) {
    continue;
  }

  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric,
    )
  ) {
    throw new BadRequestException(
      `${field} must be a valid number`,
    );
  }

  if (
    numeric < 0 &&
    [
      "price",
      "capacity",
      "bedrooms",
      "bathrooms",
    ].includes(field)
  ) {
    throw new BadRequestException(
      `${field} cannot be negative`,
    );
  }

  update[field] =
    numeric;
}

/* ------------------------------------------------------------------------
   ARRAYS
------------------------------------------------------------------------ */

if (
  dto.amenities !==
  undefined
) {
  update.amenities =
    dto.amenities;
}

if (
  dto.images !==
  undefined
) {
  update.images =
    dto.images;
}

if (
  dto.tags !==
  undefined
) {
  update.tags =
    dto.tags;
}

/* ------------------------------------------------------------------------
   ACTIVE
------------------------------------------------------------------------ */

if (
  dto.active !==
  undefined
) {
  update.active =
    dto.active;

  update.status =
    dto.active
      ? "active"
      : "inactive";
}

/* ------------------------------------------------------------------------
   INVENTORY
------------------------------------------------------------------------ */

let nextInventory:
  | ReturnType<
      typeof normalizeInventory
    >
  | undefined;

if (
  dto.inventory !==
  undefined
) {
  nextInventory =
    normalizeInventory(
      dto.inventory,
    );
}

/* ------------------------------------------------------------------------
   METADATA
------------------------------------------------------------------------ */

const existingMetadata =
  isPlainObject(
    existing.metadata,
  )
    ? existing.metadata
    : {};

const incomingMetadata =
  isPlainObject(
    dto.metadata,
  )
    ? dto.metadata
    : undefined;

if (
  incomingMetadata !==
  undefined
) {
  const mergedMetadata = {
    ...existingMetadata,
    ...incomingMetadata,
  };

  if (nextInventory) {
    mergedMetadata.inventory =
      nextInventory;
  }

  update.metadata =
    mergedMetadata;
}

/* ------------------------------------------------------------------------
   INVENTORY -> BOTH LOCATIONS
------------------------------------------------------------------------ */

if (nextInventory) {
  update.inventory =
    nextInventory;

  const currentMetadata =
    isPlainObject(
      update.metadata ??
        existing.metadata,
    )
      ? (
          update.metadata ??
          existing.metadata
        )
      : {};

  update.metadata = {
    ...currentMetadata,
    inventory:
      nextInventory,
  };
}

/* ------------------------------------------------------------------------
   CATEGORY FALLBACK
------------------------------------------------------------------------ */

if (
  !update.category &&
  update.type
) {
  const generatedCategory =
    typeToCategory(
      update.type,
    );

  if (generatedCategory) {
    update.category =
      generatedCategory;

    if (
      !update.categories
    ) {
      update.categories =
        [generatedCategory];
    }
  }
}

/* ------------------------------------------------------------------------
   NAME / TITLE SAFETY
------------------------------------------------------------------------ */

if (
  !update.name &&
  !existing.name
) {
  if (update.title) {
    update.name =
      update.title;
  }
}

if (
  !update.title &&
  !existing.title
) {
  if (update.name) {
    update.title =
      update.name;
  }
}

/* ------------------------------------------------------------------------
   REMOVE UNDEFINED VALUES
------------------------------------------------------------------------ */

for (
  const key of Object.keys(
    update,
  )
) {
  if (
    update[key] ===
    undefined
  ) {
    delete update[key];
  }
}

/* ------------------------------------------------------------------------
   CLAIM LEGACY LISTING OWNERSHIP

   This is the critical repair.

   If the old listing has no partnerId, assign the authenticated
   partnerId during the authenticated update.
------------------------------------------------------------------------ */

update.partnerId =
  normalizedPartnerId;

/* ------------------------------------------------------------------------
   UPDATE

   We include partnerId in the query as an additional ownership guard.

   For a legacy listing with no partnerId, the initial ownership check
   above permits the authenticated partner to claim it.
------------------------------------------------------------------------ */

const ownershipFilter: Record<
  string,
  any
> = {
  _id: new Types.ObjectId(id),
  $or: [
    {
      partnerId:
        normalizedPartnerId,
    },
    {
      partnerId: {
        $exists: false,
      },
    },
    {
      partnerId: null,
    },
  ],
};

const updated =
  await this.model
    .findOneAndUpdate(
      ownershipFilter,
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean();

if (!updated) {
  throw new ForbiddenException(
    "You do not own this listing",
  );
}

return normalizeListingResponse(
  updated,
);

}

/* ==========================================================================
SOFT DELETE

 DELETE /travel/listings/:id

 Only the listing owner may deactivate it.

========================================================================== */

async remove(
id: string,
partnerId: string,
) {
if (
!Types.ObjectId.isValid(id)
) {
throw new NotFoundException(
"Listing not found",
);
}

const normalizedPartnerId =
  this.normalizePartnerId(
    partnerId,
  );

const existing =
  await this.model.findById(id);

if (!existing) {
  throw new NotFoundException(
    "Listing not found",
  );
}

if (
  !existing.partnerId ||
  existing.partnerId.toString() !==
    normalizedPartnerId.toString()
) {
  throw new ForbiddenException(
    "You do not own this listing",
  );
}

const result =
  await this.model.findOneAndUpdate(
    {
      _id:
        new Types.ObjectId(id),
      partnerId:
        normalizedPartnerId,
    },
    {
      $set: {
        active: false,
        status: "inactive",
      },
    },
    {
      new: true,
    },
  );

if (!result) {
  throw new NotFoundException(
    "Listing not found",
  );
}

return normalizeListingResponse(
  result.toObject(),
);

}

/* ==========================================================================
NORMALIZE PARTNER ID
========================================================================== */

private normalizePartnerId(
partnerId: string,
): Types.ObjectId {
if (!partnerId) {
throw new BadRequestException(
"Partner ID is required",
);
}

const normalized =
  String(partnerId).trim();

if (
  !Types.ObjectId.isValid(
    normalized,
  )
) {
  throw new BadRequestException(
    "Invalid partner ID",
  );
}

return new Types.ObjectId(
  normalized,
);

}
}

/* ============================================================================
RESPONSE NORMALIZATION
============================================================================ */

function normalizeListingResponse(
item: any,
) {
const inventory =
normalizeInventory(
item?.inventory ??
item?.metadata?.inventory,
);

const title =
item?.title ??
item?.name ??
"";

const name =
item?.name ??
item?.title ??
"";

const category =
item?.category ??
item?.metadata?.category ??
typeToCategory(
item?.type,
);

const categories =
normalizeCategories(
Array.isArray(
item?.categories,
)
? item.categories
: undefined,
category,
);

const metadata =
isPlainObject(
item?.metadata,
)
? item.metadata
: {};

return {
...item,

_id:
  item?._id,

id:
  item?._id?.toString?.() ??
  item?.id,

title,

name,

category,

categories,

type:
  item?.type,

description:
  item?.description ??
  "",

country:
  item?.country ??
  "",

city:
  item?.city ??
  "",

address:
  item?.address,

latitude:
  item?.latitude,

longitude:
  item?.longitude,

phone:
  item?.phone,

website:
  item?.website,

images:
  Array.isArray(
    item?.images,
  )
    ? item.images
    : [],

amenities:
  Array.isArray(
    item?.amenities,
  )
    ? item.amenities
    : [],

tags:
  Array.isArray(
    item?.tags,
  )
    ? item.tags
    : [],

capacity:
  Number.isFinite(
    Number(
      item?.capacity,
    ),
  )
    ? Number(
        item.capacity,
      )
    : undefined,

bedrooms:
  Number.isFinite(
    Number(
      item?.bedrooms,
    ),
  )
    ? Number(
        item.bedrooms,
      )
    : undefined,

bathrooms:
  Number.isFinite(
    Number(
      item?.bathrooms,
    ),
  )
    ? Number(
        item.bathrooms,
      )
    : undefined,

rating:
  Number.isFinite(
    Number(
      item?.rating,
    ),
  )
    ? Number(
        item.rating,
      )
    : 0,

reviewCount:
  Number.isFinite(
    Number(
      item?.reviewCount,
    ),
  )
    ? Number(
        item.reviewCount,
      )
    : 0,

currency:
  item?.currency ??
  "USD",

price:
  Number.isFinite(
    Number(
      item?.price,
    ),
  )
    ? Number(
        item.price,
      )
    : 0,

priceUnit:
  item?.priceUnit ??
  "night",

active:
  item?.active ??
  true,

status:
  item?.status ??
  (
    item?.active === false
      ? "inactive"
      : "active"
  ),

inventory,

metadata: {
  ...metadata,

  inventory,

  ...(item?.capacity !==
    undefined &&
  metadata.capacity ===
    undefined
    ? {
        capacity:
          item.capacity,
      }
    : {}),
},

};
}

/* ============================================================================
CATEGORY NORMALIZATION
============================================================================ */

function normalizeCategories(
categories?: unknown,
fallbackCategory?: unknown,
): string[] {
const values: string[] = [];

if (
Array.isArray(categories)
) {
for (
const value of categories
) {
if (
typeof value !==
"string"
) {
continue;
}

  const normalized =
    value.trim();

  if (normalized) {
    values.push(
      normalized,
    );
  }
}

}

if (
typeof fallbackCategory ===
"string"
) {
const normalized =
fallbackCategory.trim();

if (normalized) {
  values.unshift(
    normalized,
  );
}


}

return uniqueStrings(
values,
);
}

/* ============================================================================
CATEGORY STRING NORMALIZATION
============================================================================ */

function normalizeCategory(
value: unknown,
): string | undefined {
if (
typeof value !==
"string"
) {
return undefined;
}

const normalized =
value.trim();

return (
normalized ||
undefined
);
}

/* ============================================================================
UNIQUE STRING ARRAY
============================================================================ */

function uniqueStrings(
values: string[],
): string[] {
const seen =
new Set<string>();

const result: string[] = [];

for (
const value of values
) {
const normalized =
value.trim();

if (!normalized) {
  continue;
}

const key =
  normalized.toLowerCase();

if (seen.has(key)) {
  continue;
}

seen.add(key);

result.push(
  normalized,
);

}

return result;
}

/* ============================================================================
INVENTORY NORMALIZATION
============================================================================ */

function normalizeInventory(
inventory?: {
total?: unknown;
reserved?: unknown;
available?: unknown;
} | null,
) {
const total =
normalizeInteger(
inventory?.total,
0,
);

const reserved =
Math.min(
total,
normalizeInteger(
inventory?.reserved,
0,
),
);

const available =
Math.max(
0,
total - reserved,
);

return {
total,
reserved,
available,
};
}

/* ============================================================================
CATEGORY HELPERS
============================================================================ */

function typeToCategory(
type?: string,
): string | undefined {
switch (
type?.toLowerCase()
) {
case "stay":
return "Hotels & Stays";

case "restaurant":
  return "Restaurants";

case "car":
  return "Car Rental";

case "experience":
  return "Experiences";

case "meeting":
  return "Meeting Spaces";

case "transfer":
  return "Transportation";

case "event":
  return "Events";

case "rental":
  return "Vacation Rentals";

case "flight":
  return "Flights";

case "attraction":
  return "Attractions";

case "thing":
  return "Things To Do";

default:
  return undefined;

}
}

/* ============================================================================
NUMBER HELPERS
============================================================================ */

function normalizeInteger(
value: unknown,
fallback = 0,
): number {
const numeric =
Number(value);

if (
!Number.isFinite(
numeric,
)
) {
return fallback;
}

return Math.max(
0,
Math.floor(numeric),
);
}

/* ============================================================================
OBJECT HELPER
============================================================================ */

function isPlainObject(
value: unknown,
): value is Record<string, any> {
return (
typeof value ===
"object" &&
value !== null &&
!Array.isArray(value)
);
}

/* ============================================================================
REGEX HELPER
============================================================================ */

function escapeRegExp(
value: string,
): string {
return value.replace(
/[.*+?^${}()|[]\]/g,
"\$&",
);
}

/* ============================================================================
DATE HELPERS
============================================================================ */

function parseDateStart(
value: string,
): Date | null {
if (
!/^\d{4}-\d{2}-\d{2}$/.test(
value,
)
) {
return null;
}

const date =
new Date(
`${value}T00:00:00.000Z`,
);

return Number.isNaN(
date.getTime(),
)
? null
: date;
}

function parseDateEnd(
value: string,
): Date | null {
if (
!/^\d{4}-\d{2}-\d{2}$/.test(
value,
)
) {
return null;
}

const date =
new Date(
`${value}T23:59:59.999Z`,
);

return Number.isNaN(
date.getTime(),
)
? null
: date;
}
