import {
BadRequestException,
ForbiddenException,
Injectable,
NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
Listing,
ListingDocument,
} from "../travel-src/listings/listing.schema";

import {
Partner,
PartnerDocument,
} from "../travel-src/partners/partner.schema";

import {
Booking,
BookingDocument,
} from "../travel-src/bookings/booking.schema";

import { User, UserDocument } from "../../users/user.schema";

type AdminUser = {
id?: string;
_id?: string;
userId?: string;
sub?: string;
role?: string;
roles?: string[];
isAdmin?: boolean;
isSuperAdmin?: boolean;
};

type ListingFilters = {
status?: string;
type?: string;
flaggedOnly?: boolean;
search?: string;
partnerId?: string;
limit?: number;
skip?: number;
};

type PartnerFilters = {
status?: string;
search?: string;
limit?: number;
skip?: number;
};

type PartnerApplicationFilters = {
status?: string;
search?: string;
limit?: number;
skip?: number;
};

type BookingFilters = {
status?: string;
type?: string;
search?: string;
listingId?: string;
userId?: string;
limit?: number;
skip?: number;
};

type TravelUserFilters = {
search?: string;
status?: string;
role?: string;
accountType?: string;
countryCode?: string;
limit?: number;
skip?: number;
};

@Injectable()
export class TravelAdminService {
constructor(
@InjectModel(Listing.name)
private readonly listingModel: Model<ListingDocument>,

@InjectModel(Partner.name)
private readonly partnerModel: Model<PartnerDocument>,

@InjectModel(Booking.name)
private readonly bookingModel: Model<BookingDocument>,

@InjectModel(User.name)
private readonly userModel: Model<UserDocument>,

) {}

private getUserId(user: AdminUser): string | undefined {
return user?.id ?? user?._id ?? user?.userId ?? user?.sub;
}

private assertAdmin(user: AdminUser): void {
const role = String(user?.role ?? "").toLowerCase();

const roles = Array.isArray(user?.roles)
  ? user.roles.map((item) => String(item).toLowerCase())
  : [];

const isAdmin =
  user?.isAdmin === true ||
  user?.isSuperAdmin === true ||
  role === "admin" ||
  role === "super_admin" ||
  role === "superadmin" ||
  roles.includes("admin") ||
  roles.includes("super_admin") ||
  roles.includes("superadmin");

if (!isAdmin) {
  throw new ForbiddenException("Administrator access is required.");
}

}

private normalizeStatus(status: unknown): string | undefined {
if (typeof status !== "string" || status.trim() === "") {
return undefined;
}

return status.trim().toLowerCase();

}

private normalizeType(type: unknown): string | undefined {
if (typeof type !== "string" || type.trim() === "") {
return undefined;
}

return type.trim().toLowerCase();

}

private escapeRegex(value: string): string {
return value.replace(
/[.*+?^${}()|[]\]/g,
"\$&",
);
}

private normalizeListing(listing: any): any {
if (!listing) {
return listing;
}

const metadata =
  listing.metadata && typeof listing.metadata === "object"
    ? listing.metadata
    : {};

const status =
  listing.status ??
  (listing.active === false ? "suspended" : "published");

const partnerId = listing.partnerId ? String(listing.partnerId) : "";

const flagReason =
  metadata.flagReason ??
  metadata.flaggedReason ??
  listing.flagReason ??
  "";

const flagged = Boolean(
  listing.flagged ??
    metadata.flagged ??
    metadata.isFlagged ??
    flagReason,
);

return {
  id: String(listing._id),
  _id: String(listing._id),

  name: listing.name ?? listing.title ?? "Untitled listing",
  title: listing.title ?? listing.name ?? "Untitled listing",

  type: listing.type ?? "thing",
  category: listing.category ?? null,
  description: listing.description ?? "",

  country: listing.country ?? "",
  city: listing.city ?? "",
  state: listing.state ?? "",
  postalCode: listing.postalCode ?? "",
  address: listing.address ?? "",

  images: Array.isArray(listing.images) ? listing.images : [],

  currency: listing.currency ?? "USD",

  price:
    typeof listing.price === "number"
      ? listing.price
      : Number(listing.price ?? 0),

  priceUnit: listing.priceUnit ?? "night",

  active: listing.active !== false,
  status,

  featured: listing.featured === true,

  flagged,
  flagReason,

  partnerId,

  partnerName:
    listing.partnerName ??
    listing.partner?.displayName ??
    listing.partner?.name ??
    partnerId,

  bookingCount: Number(
    listing.bookingCount ?? metadata.bookingCount ?? 0,
  ),

  rating: Number(listing.rating ?? 0),
  reviewCount: Number(listing.reviewCount ?? 0),

  inventory: listing.inventory ?? {
    total: 0,
    reserved: 0,
    available: 0,
  },

  metadata,

  createdAt: listing.createdAt ?? null,
  updatedAt: listing.updatedAt ?? null,
};

}

private normalizePartner(partner: any): any {
if (!partner) {
return partner;
}

const id = partner._id ? String(partner._id) : "";

const databaseStatus =
  partner.status ?? partner.applicationStatus ?? "pending";

const frontendStatus =
  databaseStatus === "verified" ? "active" : databaseStatus;

return {
  id,
  _id: id,

  businessName:
    partner.businessName ??
    partner.name ??
    partner.displayName ??
    "Unnamed partner",

  name:
    partner.name ??
    partner.businessName ??
    partner.displayName ??
    "Unnamed partner",

  displayName:
    partner.displayName ??
    partner.businessName ??
    partner.name ??
    "Unnamed partner",

  status: frontendStatus,
  databaseStatus,

  verificationStatus:
    partner.verificationStatus ?? databaseStatus,

  category: partner.category ?? partner.categories ?? null,

  categories: Array.isArray(partner.categories)
    ? partner.categories
    : partner.categories
      ? [partner.categories]
      : [],

  description: partner.description ?? "",

  email:
    partner.email ??
    partner.contactEmail ??
    "",

  phone:
    partner.phone ??
    partner.contactPhone ??
    "",

  website: partner.website ?? "",

  country: partner.country ?? "",
  state: partner.state ?? "",
  city: partner.city ?? "",
  address: partner.address ?? "",

  postalCode:
    partner.postalCode ??
    partner.zipCode ??
    "",

  images: Array.isArray(partner.images)
    ? partner.images
    : [],

  logo:
    partner.logo ??
    partner.logoUrl ??
    "",

  ownerId: partner.ownerId
    ? String(partner.ownerId)
    : partner.userId
      ? String(partner.userId)
      : "",

  userId: partner.userId
    ? String(partner.userId)
    : partner.ownerId
      ? String(partner.ownerId)
      : "",

  active: partner.active !== false,

  verified:
    databaseStatus === "verified" ||
    partner.verified === true ||
    partner.isVerified === true,

  rejectionReason:
    partner.rejectionReason ?? "",

  suspensionReason:
    partner.suspensionReason ?? "",

  verifiedAt:
    partner.verifiedAt ?? null,

  metadata:
    partner.metadata &&
    typeof partner.metadata === "object"
      ? partner.metadata
      : {},

  createdAt:
    partner.createdAt ?? null,

  updatedAt:
    partner.updatedAt ?? null,
};

}

private normalizeBooking(booking: any): any {
if (!booking) {
return booking;
}

const snapshot =
  booking.snapshot &&
  typeof booking.snapshot === "object"
    ? booking.snapshot
    : {};

const listing =
  booking.listing &&
  typeof booking.listing === "object"
    ? booking.listing
    : {};

const user =
  booking.user &&
  typeof booking.user === "object"
    ? booking.user
    : {};

const listingId = booking.listingId
  ? String(booking.listingId)
  : "";

const userId = booking.userId
  ? String(booking.userId)
  : "";

const subtotal = Number(booking.subtotal ?? 0);
const fees = Number(booking.fees ?? 0);
const tax = Number(booking.tax ?? 0);
const total = Number(booking.total ?? 0);

const joinedUserName = [
  user.firstName,
  user.lastName,
]
  .filter(Boolean)
  .join(" ");

const normalizedUserName =
  booking.userName ??
  user.displayName ??
  user.name ??
  (joinedUserName ||
    user.username ||
    user.email ||
    userId);

return {
  id: String(booking._id),
  _id: String(booking._id),

  bookingCode:
    booking.bookingCode ??
    String(booking._id),

  userId,

  userName: normalizedUserName,

  userEmail:
    booking.userEmail ??
    user.email ??
    snapshot.userEmail ??
    "",

  listingId,

  listingName:
    booking.listingName ??
    listing.name ??
    listing.title ??
    snapshot.listingName ??
    snapshot.title ??
    "Untitled listing",

  partnerId:
    booking.partnerId ??
    listing.partnerId ??
    snapshot.partnerId ??
    "",

  partnerName:
    booking.partnerName ??
    listing.partnerName ??
    snapshot.partnerName ??
    "",

  type: booking.type ?? "thing",

  startAt:
    booking.startAt ?? null,

  endAt:
    booking.endAt ?? null,

  quantity:
    Number(booking.quantity ?? 1),

  guests:
    Number(booking.guests ?? 1),

  currency:
    booking.currency ?? "USD",

  subtotal,
  fees,
  tax,
  total,

  status:
    booking.status ?? "pending",

  paymentStatus:
    booking.paymentStatus ?? "unpaid",

  notes:
    booking.notes ?? "",

  snapshot,

  createdAt:
    booking.createdAt ?? null,

  updatedAt:
    booking.updatedAt ?? null,
};

}

private normalizeAdminUser(user: any): any {
if (!user) {
return user;
}

const joinedName = [
  user.firstName,
  user.lastName,
]
  .filter(Boolean)
  .join(" ")
  .trim();

return {
  id: String(user._id),
  _id: String(user._id),

  username: user.username ?? "",

  fockisId:
    user.fockisId ?? null,

  firstName:
    user.firstName ?? "",

  lastName:
    user.lastName ?? "",

  name:
    joinedName ||
    user.username ||
    user.email ||
    "Unknown user",

  email:
    user.email ?? "",

  phone:
    user.phone ?? "",

  countryCode:
    user.countryCode ?? "",

  callingCode:
    user.callingCode ?? "",

  profilePicture:
    user.profilePicture ?? "",

  coverPhoto:
    user.coverPhoto ?? "",

  bio:
    user.bio ?? "",

  location:
    user.location ?? "",

  website:
    user.website ?? "",

  role:
    user.role ?? "user",

  accountType:
    user.accountType ?? "user",

  verified:
    user.verified === true,

  isActive:
    user.isActive !== false,

  online:
    user.online === true,

  isPrivate:
    user.isPrivate === true,

  sellerApproved:
    user.sellerApproved === true,

  storeName:
    user.storeName ?? "",

  storeDescription:
    user.storeDescription ?? "",

  fockisIdAccessPaid:
    user.fockisIdAccessPaid === true,

  paidAt:
    user.paidAt ?? null,

  paymentId:
    user.paymentId ?? null,

  premium:
    user.premium === true,

  subscriptionType:
    user.subscriptionType ?? "",

  subscriptionExpiresAt:
    user.subscriptionExpiresAt ?? null,

  lockedUntil:
    user.lockedUntil ?? null,

  loginAttempts:
    Number(user.loginAttempts ?? 0),

  lastSeen:
    user.lastSeen ?? null,

  lastActiveAt:
    user.lastActiveAt ?? null,

  createdAt:
    user.createdAt ?? null,

  updatedAt:
    user.updatedAt ?? null,
};

}

async getStats(user: AdminUser) {
this.assertAdmin(user);

const [
  totalListings,
  publishedListings,
  suspendedListings,
  draftListings,
  flaggedListings,
  totalPartners,
] = await Promise.all([
  this.listingModel.countDocuments(),

  this.listingModel.countDocuments({
    $or: [
      { status: "published" },
      {
        status: { $exists: false },
        active: true,
      },
    ],
  }),

  this.listingModel.countDocuments({
    $or: [
      { status: "suspended" },
      { status: "archived" },
      { active: false },
    ],
  }),

  this.listingModel.countDocuments({
    status: "draft",
  }),

  this.listingModel.countDocuments({
    $or: [
      { flagged: true },
      { "metadata.flagged": true },
      { "metadata.isFlagged": true },
      {
        "metadata.flagReason": {
          $exists: true,
          $nin: ["", null],
        },
      },
    ],
  }),

  this.partnerModel.countDocuments(),
]);

return {
  totalListings,
  publishedListings,
  suspendedListings,
  draftListings,
  flaggedListings,
  totalPartners,
};

}

async getPartnerApplications(
filters: PartnerApplicationFilters = {},
) {
const status =
this.normalizeStatus(filters.status);

const limit = Math.min(
  Math.max(Number(filters.limit ?? 50), 1),
  100,
);

const skip = Math.max(
  Number(filters.skip ?? 0),
  0,
);

const conditions: any[] = [];

if (status && status !== "all") {
  const databaseStatus =
    status === "active"
      ? "verified"
      : status;

  conditions.push({
    $or: [
      { status: databaseStatus },
      { applicationStatus: databaseStatus },
      { verificationStatus: databaseStatus },
    ],
  });
}

const search =
  typeof filters.search === "string"
    ? filters.search.trim()
    : "";

if (search) {
  const escaped =
    this.escapeRegex(search);

  const regex =
    new RegExp(escaped, "i");

  conditions.push({
    $or: [
      { businessName: regex },
      { name: regex },
      { displayName: regex },
      { email: regex },
      { "contact.email": regex },
      { phone: regex },
      { "contact.phone": regex },
      { city: regex },
      { state: regex },
      { country: regex },
      { description: regex },
    ],
  });
}

const query =
  conditions.length > 0
    ? { $and: conditions }
    : {};

const [documents, total] =
  await Promise.all([
    this.partnerModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),

    this.partnerModel.countDocuments(query),
  ]);

const items = documents.map(
  (partner) =>
    this.normalizePartner(partner),
);

return {
  items,
  applications: items,
  total,
  page: Math.floor(skip / limit) + 1,
  limit,
  skip,
};

}

async getPartnerApplication(id: string) {
if (!Types.ObjectId.isValid(id)) {
throw new BadRequestException(
"Invalid partner application ID.",
);
}

const partner =
  await this.partnerModel
    .findById(id)
    .lean()
    .exec();

if (!partner) {
  throw new NotFoundException(
    "Travel partner application not found.",
  );
}

return this.normalizePartner(partner);

}

async updatePartnerApplicationStatus(
id: string,
status: string,
reason: string | undefined,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid partner application ID.",
  );
}

const normalizedStatus =
  this.normalizeStatus(status);

const allowedStatuses = new Set([
  "pending",
  "active",
  "approved",
  "verified",
  "rejected",
  "suspended",
  "deactivated",
]);

if (
  !normalizedStatus ||
  !allowedStatuses.has(normalizedStatus)
) {
  throw new BadRequestException(
    "Invalid partner application status.",
  );
}

const partner =
  await this.partnerModel
    .findById(id)
    .exec();

if (!partner) {
  throw new NotFoundException(
    "Travel partner application not found.",
  );
}

if (
  normalizedStatus === "rejected" &&
  (!reason || !reason.trim())
) {
  throw new BadRequestException(
    "A rejection reason is required.",
  );
}

const databaseStatus =
  normalizedStatus === "active" ||
  normalizedStatus === "approved"
    ? "verified"
    : normalizedStatus === "deactivated"
      ? "suspended"
      : normalizedStatus;

const update: any = {
  status: databaseStatus,
};

if (databaseStatus === "verified") {
  update.active = true;
  update.verifiedAt = new Date();
  update.rejectionReason = null;
  update.suspensionReason = null;
}

if (databaseStatus === "pending") {
  update.active = true;
}

if (databaseStatus === "rejected") {
  update.active = false;
  update.rejectionReason =
    reason?.trim() ?? "";
}

if (databaseStatus === "suspended") {
  update.active = false;

  if (reason && reason.trim()) {
    update.suspensionReason =
      reason.trim();
  }
}

if (
  typeof reason === "string" &&
  reason.trim()
) {
  update.moderationReason =
    reason.trim();

  update.statusReason =
    reason.trim();

  update.moderatedAt =
    new Date();

  update.moderatedBy =
    this.getUserId(user) ?? null;
}

const updated =
  await this.partnerModel
    .findByIdAndUpdate(
      id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!updated) {
  throw new NotFoundException(
    "Travel partner application not found.",
  );
}

return this.normalizePartner(updated);

}

async requestPartnerApplicationInfo(
id: string,
message: string | undefined,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid partner application ID.",
  );
}

const cleanMessage =
  typeof message === "string"
    ? message.trim()
    : "";

if (!cleanMessage) {
  throw new BadRequestException(
    "A message is required when requesting more information.",
  );
}

const partner =
  await this.partnerModel
    .findById(id)
    .exec();

if (!partner) {
  throw new NotFoundException(
    "Travel partner application not found.",
  );
}

const existingMetadata =
  partner.metadata &&
  typeof partner.metadata === "object"
    ? {
        ...(partner.metadata as any),
      }
    : {};

existingMetadata.adminInfoRequest = {
  message: cleanMessage,
  requestedAt: new Date(),
  requestedBy:
    this.getUserId(user) ?? null,
};

partner.metadata =
  existingMetadata;

await partner.save();

return this.normalizePartner(
  partner.toObject(),
);

}

async getPartners(
filters: PartnerFilters = {},
) {
const status =
this.normalizeStatus(filters.status);
const limit = Math.min(
  Math.max(Number(filters.limit ?? 50), 1),
  100,
);

const skip = Math.max(
  Number(filters.skip ?? 0),
  0,
);

const conditions: any[] = [];

if (status && status !== "all") {
  const databaseStatus =
    status === "active"
      ? "verified"
      : status;

  conditions.push({
    $or: [
      { status: databaseStatus },
      { applicationStatus: databaseStatus },
      { verificationStatus: databaseStatus },
    ],
  });
}

const search =
  typeof filters.search === "string"
    ? filters.search.trim()
    : "";

if (search) {
  const escaped =
    this.escapeRegex(search);

  const regex =
    new RegExp(escaped, "i");

  conditions.push({
    $or: [
      { businessName: regex },
      { name: regex },
      { displayName: regex },
      { email: regex },
      { contactEmail: regex },
      { city: regex },
      { state: regex },
      { country: regex },
      { description: regex },
    ],
  });
}

const query =
  conditions.length > 0
    ? { $and: conditions }
    : {};

const [documents, total] =
  await Promise.all([
    this.partnerModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),

    this.partnerModel.countDocuments(query),
  ]);

const items = documents.map(
  (partner) =>
    this.normalizePartner(partner),
);

return {
  items,
  partners: items,
  total,
  page: Math.floor(skip / limit) + 1,
  limit,
  skip,
};

}

async getPartner(id: string) {
if (!Types.ObjectId.isValid(id)) {
throw new BadRequestException(
"Invalid partner ID.",
);
}

const partner =
  await this.partnerModel
    .findById(id)
    .lean()
    .exec();

if (!partner) {
  throw new NotFoundException(
    "Travel partner not found.",
  );
}

return this.normalizePartner(partner);
}

async updatePartnerStatus(
id: string,
status: string,
reason: string | undefined,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid partner ID.",
  );
}

const normalizedStatus =
  this.normalizeStatus(status);

const allowedStatuses = new Set([
  "pending",
  "active",
  "approved",
  "verified",
  "rejected",
  "suspended",
  "deactivated",
]);

if (
  !normalizedStatus ||
  !allowedStatuses.has(normalizedStatus)
) {
  throw new BadRequestException(
    "Invalid partner status.",
  );
}

const partner =
  await this.partnerModel
    .findById(id)
    .lean()
    .exec();

if (!partner) {
  throw new NotFoundException(
    "Travel partner not found.",
  );
}

const databaseStatus =
  normalizedStatus === "active" ||
  normalizedStatus === "approved"
    ? "verified"
    : normalizedStatus === "deactivated"
      ? "suspended"
      : normalizedStatus;

const update: any = {
  status: databaseStatus,
};

if (databaseStatus === "verified") {
  update.active = true;
  update.verifiedAt = new Date();
}

if (
  databaseStatus === "suspended" ||
  databaseStatus === "rejected"
) {
  update.active = false;
}

if (
  typeof reason === "string" &&
  reason.trim()
) {
  update.moderationReason =
    reason.trim();

  update.statusReason =
    reason.trim();

  update.moderatedAt =
    new Date();

  update.moderatedBy =
    this.getUserId(user) ?? null;

  if (databaseStatus === "rejected") {
    update.rejectionReason =
      reason.trim();
  }

  if (databaseStatus === "suspended") {
    update.suspensionReason =
      reason.trim();
  }
}

const updated =
  await this.partnerModel
    .findByIdAndUpdate(
      id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!updated) {
  throw new NotFoundException(
    "Travel partner not found.",
  );
}

return this.normalizePartner(updated);

}

async getListings(
filters: ListingFilters = {},
) {
const status =
this.normalizeStatus(filters.status);

const type =
  this.normalizeType(filters.type);

const limit = Math.min(
  Math.max(Number(filters.limit ?? 50), 1),
  100,
);

const skip = Math.max(
  Number(filters.skip ?? 0),
  0,
);

const conditions: any[] = [];

if (status) {
  if (status === "published") {
    conditions.push({
      $or: [
        { status: "published" },
        {
          status: { $exists: false },
          active: true,
        },
      ],
    });
  } else if (status === "suspended") {
    conditions.push({
      $or: [
        { status: "suspended" },
        { active: false },
      ],
    });
  } else {
    conditions.push({
      status,
    });
  }
}

if (type) {
  conditions.push({
    type,
  });
}

if (
  filters.partnerId &&
  Types.ObjectId.isValid(
    filters.partnerId,
  )
) {
  conditions.push({
    partnerId:
      new Types.ObjectId(
        filters.partnerId,
      ),
  });
} else if (filters.partnerId) {
  conditions.push({
    partnerId: filters.partnerId,
  });
}

if (filters.flaggedOnly === true) {
  conditions.push({
    $or: [
      { flagged: true },
      { "metadata.flagged": true },
      { "metadata.isFlagged": true },
      {
        "metadata.flagReason": {
          $exists: true,
          $nin: ["", null],
        },
      },
    ],
  });
}

const search =
  typeof filters.search === "string"
    ? filters.search.trim()
    : "";

if (search) {
  const escaped =
    this.escapeRegex(search);

  const regex =
    new RegExp(escaped, "i");

  conditions.push({
    $or: [
      { name: regex },
      { title: regex },
      { description: regex },
      { city: regex },
      { country: regex },
      { tags: regex },
    ],
  });
}

const query =
  conditions.length > 0
    ? { $and: conditions }
    : {};

const [documents, total] =
  await Promise.all([
    this.listingModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),

    this.listingModel.countDocuments(query),
  ]);

const items = documents.map(
  (listing) =>
    this.normalizeListing(listing),
);

return {
  items,
  total,
  page: Math.floor(skip / limit) + 1,
  limit,
};

}

async getListing(id: string) {
if (!Types.ObjectId.isValid(id)) {
throw new BadRequestException(
"Invalid listing ID.",
);
}

const listing =
  await this.listingModel
    .findById(id)
    .lean()
    .exec();

if (!listing) {
  throw new NotFoundException(
    "Travel listing not found.",
  );
}

return this.normalizeListing(listing);

}

async updateListingStatus(
id: string,
status: string,
reason: string | undefined,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid listing ID.",
  );
}

const normalizedStatus =
  this.normalizeStatus(status);

const allowedStatuses = new Set([
  "draft",
  "pending_review",
  "published",
  "suspended",
  "archived",
  "rejected",
]);

if (
  !normalizedStatus ||
  !allowedStatuses.has(normalizedStatus)
) {
  throw new BadRequestException(
    "Invalid listing status.",
  );
}

const listing =
  await this.listingModel
    .findById(id)
    .lean()
    .exec();

if (!listing) {
  throw new NotFoundException(
    "Travel listing not found.",
  );
}

const update: any = {
  status: normalizedStatus,
};

if (normalizedStatus === "published") {
  update.active = true;
}

if (
  normalizedStatus === "suspended" ||
  normalizedStatus === "archived" ||
  normalizedStatus === "rejected"
) {
  update.active = false;
}

const metadata =
  listing.metadata &&
  typeof listing.metadata === "object"
    ? { ...listing.metadata }
    : {};

if (
  typeof reason === "string" &&
  reason.trim()
) {
  metadata.moderationReason =
    reason.trim();

  metadata.moderatedAt =
    new Date();

  metadata.moderatedBy =
    this.getUserId(user) ?? null;

  update.metadata = metadata;
}

const updated =
  await this.listingModel
    .findByIdAndUpdate(
      id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!updated) {
  throw new NotFoundException(
    "Travel listing not found.",
  );
}

return this.normalizeListing(updated);

}

async deleteListing(
id: string,
user: AdminUser,
): Promise<void> {
this.assertAdmin(user);
if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid listing ID.",
  );
}

const listing =
  await this.listingModel
    .findById(id)
    .exec();

if (!listing) {
  throw new NotFoundException(
    "Travel listing not found.",
  );
}

const metadata =
  listing.metadata &&
  typeof listing.metadata === "object"
    ? { ...listing.metadata }
    : {};

metadata.archivedBy =
  this.getUserId(user) ?? null;

metadata.archivedAt =
  new Date();

await this.listingModel
  .findByIdAndUpdate(
    id,
    {
      $set: {
        active: false,
        status: "archived",
        metadata,
      },
    },
    {
      new: false,
    },
  )
  .exec();
}

async getUsers(
filters: TravelUserFilters = {},
user?: AdminUser,
) {
if (user) {
this.assertAdmin(user);
}
const limit = Math.min(
  Math.max(Number(filters.limit ?? 50), 1),
  100,
);

const skip = Math.max(
  Number(filters.skip ?? 0),
  0,
);

const conditions: any[] = [];

const status =
  this.normalizeStatus(filters.status);

if (status && status !== "all") {
  if (status === "active") {
    conditions.push({
      isActive: true,
    });
  } else if (
    status === "inactive" ||
    status === "suspended" ||
    status === "disabled"
  ) {
    conditions.push({
      isActive: false,
    });
  } else if (status === "locked") {
    conditions.push({
      lockedUntil: {
        $gt: new Date(),
      },
    });
  } else if (status === "online") {
    conditions.push({
      online: true,
    });
  } else if (status === "offline") {
    conditions.push({
      online: false,
    });
  } else {
    conditions.push({
      role: status,
    });
  }
}

const role =
  this.normalizeStatus(filters.role);

if (role && role !== "all") {
  conditions.push({
    role,
  });
}

const accountType =
  this.normalizeStatus(
    filters.accountType,
  );

if (
  accountType &&
  accountType !== "all"
) {
  conditions.push({
    accountType,
  });
}

const countryCode =
  typeof filters.countryCode === "string"
    ? filters.countryCode
        .trim()
        .toUpperCase()
    : "";

if (
  countryCode &&
  countryCode !== "ALL"
) {
  conditions.push({
    countryCode,
  });
}

const search =
  typeof filters.search === "string"
    ? filters.search.trim()
    : "";

if (search) {
  const escaped =
    this.escapeRegex(search);

  const regex =
    new RegExp(escaped, "i");

  conditions.push({
    $or: [
      { username: regex },
      { email: regex },
      { fockisId: regex },
      { firstName: regex },
      { lastName: regex },
      { phone: regex },
      { location: regex },
    ],
  });
}

const query =
  conditions.length > 0
    ? { $and: conditions }
    : {};

const [documents, total] =
  await Promise.all([
    this.userModel
      .find(query)
      .select(
        [
          "_id",
          "username",
          "fockisId",
          "countryCode",
          "callingCode",
          "email",
          "firstName",
          "lastName",
          "phone",
          "profilePicture",
          "coverPhoto",
          "bio",
          "location",
          "website",
          "role",
          "accountType",
          "verified",
          "isActive",
          "isPrivate",
          "online",
          "lastSeen",
          "lastActiveAt",
          "createdAt",
          "updatedAt",
          "fockisIdAccessPaid",
          "paidAt",
          "paymentId",
          "premium",
          "subscriptionType",
          "subscriptionExpiresAt",
          "lockedUntil",
          "loginAttempts",
          "sellerApproved",
          "storeName",
          "storeDescription",
        ].join(" "),
      )
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),

    this.userModel.countDocuments(query),
  ]);

const items = documents.map(
  (user: any) =>
    this.normalizeAdminUser(user),
);

return {
  items,
  users: items,
  total,
  page: Math.floor(skip / limit) + 1,
  limit,
  skip,
};

}

async getUser(
id: string,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid user ID.",
  );
}

const targetUser =
  await this.userModel
    .findById(id)
    .select(
      [
        "_id",
        "username",
        "fockisId",
        "countryCode",
        "callingCode",
        "email",
        "firstName",
        "lastName",
        "phone",
        "profilePicture",
        "coverPhoto",
        "bio",
        "location",
        "website",
        "role",
        "accountType",
        "verified",
        "isActive",
        "isPrivate",
        "online",
        "lastSeen",
        "lastActiveAt",
        "createdAt",
        "updatedAt",
        "fockisIdAccessPaid",
        "paidAt",
        "paymentId",
        "premium",
        "subscriptionType",
        "subscriptionExpiresAt",
        "lockedUntil",
        "loginAttempts",
        "sellerApproved",
        "storeName",
        "storeDescription",
      ].join(" "),
    )
    .lean()
    .exec();

if (!targetUser) {
  throw new NotFoundException(
    "User not found.",
  );
}

return this.normalizeAdminUser(
  targetUser,
);
}

async updateUserStatus(
id: string,
status: string,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid user ID.",
  );
}

const adminUserId =
  this.getUserId(user);

if (
  adminUserId &&
  adminUserId === id &&
  ["inactive", "suspended", "disabled", "locked"].includes(
    this.normalizeStatus(status) ?? "",
  )
) {
  throw new BadRequestException(
    "You cannot deactivate or lock your own administrator account.",
  );
}

const normalizedStatus =
  this.normalizeStatus(status);

const allowedStatuses = new Set([
  "active",
  "inactive",
  "suspended",
  "disabled",
  "locked",
  "unlocked",
]);

if (
  !normalizedStatus ||
  !allowedStatuses.has(normalizedStatus)
) {
  throw new BadRequestException(
    "Invalid user status.",
  );
}

const targetUser =
  await this.userModel
    .findById(id)
    .exec();

if (!targetUser) {
  throw new NotFoundException(
    "User not found.",
  );
}

const update: any = {};

if (normalizedStatus === "active") {
  update.isActive = true;
  update.lockedUntil = null;
}

if (
  normalizedStatus === "inactive" ||
  normalizedStatus === "suspended" ||
  normalizedStatus === "disabled"
) {
  update.isActive = false;
}

if (
  normalizedStatus === "locked"
) {
  update.isActive = false;

  update.lockedUntil =
    new Date(
      Date.now() +
        24 * 60 * 60 * 1000,
    );
}

if (
  normalizedStatus === "unlocked"
) {
  update.isActive = true;
  update.lockedUntil = null;
  update.loginAttempts = 0;
}

const updated =
  await this.userModel
    .findByIdAndUpdate(
      id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!updated) {
  throw new NotFoundException(
    "User not found.",
  );
}

return this.normalizeAdminUser(
  updated,
);

}

async updateUserVerification(
id: string,
verified: boolean,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid user ID.",
  );
}

if (
  typeof verified !== "boolean"
) {
  throw new BadRequestException(
    "The verified value must be true or false.",
  );
}

const updated =
  await this.userModel
    .findByIdAndUpdate(
      id,
      {
        $set: {
          verified,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!updated) {
  throw new NotFoundException(
    "User not found.",
  );
}

return this.normalizeAdminUser(
  updated,
);

}

async updateUserRole(
id: string,
role: string,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid user ID.",
  );
}

const normalizedRole =
  this.normalizeStatus(role);

const allowedRoles = new Set([
  "user",
  "moderator",
  "admin",
  "super_admin",
]);

if (
  !normalizedRole ||
  !allowedRoles.has(normalizedRole)
) {
  throw new BadRequestException(
    "Invalid user role.",
  );
}

const adminUserId =
  this.getUserId(user);

if (
  adminUserId &&
  adminUserId === id &&
  normalizedRole !== "admin" &&
  normalizedRole !== "super_admin"
) {
  throw new BadRequestException(
    "You cannot demote your own administrator account.",
  );
}

const currentRole =
  String(user?.role ?? "")
    .toLowerCase();

const currentRoles =
  Array.isArray(user?.roles)
    ? user.roles.map((item) =>
        String(item).toLowerCase(),
      )
    : [];

const isSuperAdmin =
  user?.isSuperAdmin === true ||
  currentRole === "super_admin" ||
  currentRole === "superadmin" ||
  currentRoles.includes("super_admin") ||
  currentRoles.includes("superadmin");

if (
  normalizedRole === "super_admin" &&
  !isSuperAdmin
) {
  throw new ForbiddenException(
    "Only a super administrator can assign the super_admin role.",
  );
}

const updated =
  await this.userModel
    .findByIdAndUpdate(
      id,
      {
        $set: {
          role: normalizedRole,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!updated) {
  throw new NotFoundException(
    "User not found.",
  );
}

return this.normalizeAdminUser(
  updated,
);

}

async updateUserAccountType(
id: string,
accountType: string,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid user ID.",
  );
}

const normalizedAccountType =
  this.normalizeStatus(
    accountType,
  );

const allowedAccountTypes =
  new Set([
    "user",
    "seller",
    "business",
  ]);

if (
  !normalizedAccountType ||
  !allowedAccountTypes.has(
    normalizedAccountType,
  )
) {
  throw new BadRequestException(
    "Invalid account type.",
  );
}

const updated =
  await this.userModel
    .findByIdAndUpdate(
      id,
      {
        $set: {
          accountType:
            normalizedAccountType,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!updated) {
  throw new NotFoundException(
    "User not found.",
  );
}

return this.normalizeAdminUser(
  updated,
);

}

async updateUserFockisIdAccess(
id: string,
accessPaid: boolean,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid user ID.",
  );
}

if (
  typeof accessPaid !== "boolean"
) {
  throw new BadRequestException(
    "The accessPaid value must be true or false.",
  );
}

const update: any = {
  fockisIdAccessPaid:
    accessPaid,
};

if (!accessPaid) {
  update.paidAt = null;
  update.paymentId = null;
}

const updated =
  await this.userModel
    .findByIdAndUpdate(
      id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!updated) {
  throw new NotFoundException(
    "User not found.",
  );
}

return this.normalizeAdminUser(
  updated,
);

}

async updateUserPremium(
id: string,
premium: boolean,
user: AdminUser,
) {
this.assertAdmin(user);

if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(
    "Invalid user ID.",
  );
}

if (
  typeof premium !== "boolean"
) {
  throw new BadRequestException(
    "The premium value must be true or false.",
  );
}

const updated =
  await this.userModel
    .findByIdAndUpdate(
      id,
      {
        $set: {
          premium,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!updated) {
  throw new NotFoundException(
    "User not found.",
  );
}

return this.normalizeAdminUser(
  updated,
);

}

async getBookings(
filters: BookingFilters = {},
) {
const status =
this.normalizeStatus(filters.status);

const type =
  this.normalizeType(filters.type);

const limit = Math.min(
  Math.max(Number(filters.limit ?? 50), 1),
  100,
);

const skip = Math.max(
  Number(filters.skip ?? 0),
  0,
);

const conditions: any[] = [];

if (status && status !== "all") {
  conditions.push({
    status,
  });
}

if (type && type !== "all") {
  conditions.push({
    type,
  });
}

if (filters.listingId) {
  if (
    !Types.ObjectId.isValid(
      filters.listingId,
    )
  ) {
    throw new BadRequestException(
      "Invalid listing ID.",
    );
  }

  conditions.push({
    listingId:
      new Types.ObjectId(
        filters.listingId,
      ),
  });
}

if (filters.userId) {
  if (
    !Types.ObjectId.isValid(
      filters.userId,
    )
  ) {
    throw new BadRequestException(
      "Invalid user ID.",
    );
  }

  conditions.push({
    userId:
      new Types.ObjectId(
        filters.userId,
      ),
  });
}

const search =
  typeof filters.search === "string"
    ? filters.search.trim()
    : "";

if (search) {
  const escaped =
    this.escapeRegex(search);

  const regex =
    new RegExp(escaped, "i");

  conditions.push({
    $or: [
      { bookingCode: regex },
      { notes: regex },
      {
        "snapshot.listingName":
          regex,
      },
      {
        "snapshot.title": regex,
      },
      {
        "snapshot.partnerName":
          regex,
      },
      {
        "snapshot.userEmail":
          regex,
      },
    ],
  });
}

const query =
  conditions.length > 0
    ? { $and: conditions }
    : {};

const [documents, total] =
  await Promise.all([
    this.bookingModel
      .find(query)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),

    this.bookingModel.countDocuments(
      query,
    ),
  ]);

const items = documents.map(
  (booking) =>
    this.normalizeBooking(booking),
);

return {
  items,
  bookings: items,
  total,
  page: Math.floor(skip / limit) + 1,
  limit,
  skip,
};

}

async getBooking(id: string) {
if (!Types.ObjectId.isValid(id)) {
throw new BadRequestException(
"Invalid booking ID.",
);
}

const booking =
  await this.bookingModel
    .findById(id)
    .lean()
    .exec();

if (!booking) {
  throw new NotFoundException(
    "Travel booking not found.",
  );
}

return this.normalizeBooking(
  booking,
);


}
}
