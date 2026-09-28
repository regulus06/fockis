import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PartnerDocument = HydratedDocument<Partner>;

export type PartnerStatus =
  | 'pending'
  | 'verified'
  | 'suspended'
  | 'rejected';

export type PartnerCategory =
  | 'Hotels & Stays'
  | 'Restaurants'
  | 'Car Rental'
  | 'Experiences'
  | 'Meeting Spaces'
  | 'Transportation'
  | 'Events'
  | 'Vacation Rentals'
  | string;

// ============================================================================
// CONTACT
// ============================================================================

@Schema({ _id: false })
export class PartnerContact {
  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  website?: string;

  @Prop()
  contactName?: string;
}

export const PartnerContactSchema =
  SchemaFactory.createForClass(PartnerContact);

// ============================================================================
// ADDRESS
// ============================================================================

@Schema({ _id: false })
export class PartnerAddress {
  @Prop()
  address?: string;

  @Prop()
  addressLine2?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  country?: string;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;
}

export const PartnerAddressSchema =
  SchemaFactory.createForClass(PartnerAddress);

// ============================================================================
// BUSINESS HOURS
// ============================================================================

@Schema({ _id: false })
export class PartnerBusinessHours {
  @Prop()
  monday?: string;

  @Prop()
  tuesday?: string;

  @Prop()
  wednesday?: string;

  @Prop()
  thursday?: string;

  @Prop()
  friday?: string;

  @Prop()
  saturday?: string;

  @Prop()
  sunday?: string;
}

export const PartnerBusinessHoursSchema =
  SchemaFactory.createForClass(PartnerBusinessHours);

// ============================================================================
// SERVICES
// ============================================================================

@Schema({ _id: false })
export class PartnerService {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  price?: number;

  @Prop()
  currency?: string;

  @Prop({ default: true })
  active!: boolean;
}

export const PartnerServiceSchema =
  SchemaFactory.createForClass(PartnerService);

// ============================================================================
// DOCUMENT INFORMATION
// ============================================================================

@Schema({ _id: false })
export class PartnerDocumentInfo {
  @Prop()
  name?: string;

  @Prop()
  url?: string;

  @Prop()
  type?: string;

  @Prop()
  uploadedAt?: Date;

  @Prop()
  status?: string;
}

export const PartnerDocumentInfoSchema =
  SchemaFactory.createForClass(PartnerDocumentInfo);

// ============================================================================
// SOCIAL LINKS
// ============================================================================

@Schema({ _id: false })
export class PartnerSocialLinks {
  @Prop()
  facebook?: string;

  @Prop()
  instagram?: string;

  @Prop()
  tiktok?: string;

  @Prop()
  youtube?: string;

  @Prop()
  linkedin?: string;

  @Prop()
  twitter?: string;
}

export const PartnerSocialLinksSchema =
  SchemaFactory.createForClass(PartnerSocialLinks);

// ============================================================================
// PARTNER
// ============================================================================

@Schema({
  timestamps: true,
})
export class Partner {
  // ==========================================================================
  // OWNER
  // ==========================================================================

  /**
   * IMPORTANT:
   *
   * Keep userId as a string.
   *
   * The JWT may contain:
   * - MongoDB ObjectId strings
   * - dev-user
   * - demo-user-id
   * - other application identifiers
   */
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  userId!: string;

  // ==========================================================================
  // BASIC BUSINESS INFORMATION
  // ==========================================================================

  @Prop({
    required: true,
    trim: true,
  })
  businessName!: string;

  /**
   * Legacy / primary category.
   *
   * The frontend sends this field.
   */
  @Prop({
    required: true,
    trim: true,
  })
  category!: PartnerCategory;

  /**
   * IMPORTANT:
   *
   * The Travel frontend sends:
   *
   * categories: [
   *   'Hotels & Stays',
   *   'Restaurants',
   *   'Experiences'
   * ]
   *
   * This field is therefore explicitly stored.
   */
  @Prop({
    type: [String],
    default: [],
    index: true,
  })
  categories!: string[];

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    trim: true,
  })
  businessType?: string;

  @Prop({
    trim: true,
  })
  registrationNumber?: string;

  @Prop({
    trim: true,
  })
  taxId?: string;

  // ==========================================================================
  // CONTACT
  // ==========================================================================

  @Prop({
    type: PartnerContact,
    default: {},
  })
  contact!: PartnerContact;

  /**
   * Direct/legacy fields are intentionally preserved
   * because the current Travel frontend uses them.
   */
  @Prop({
    trim: true,
  })
  phone?: string;

  @Prop({
    trim: true,
  })
  website?: string;

  @Prop({
    trim: true,
  })
  email?: string;

  // ==========================================================================
  // LOCATION
  // ==========================================================================

  @Prop({
    type: PartnerAddress,
    default: {},
  })
  addressInfo!: PartnerAddress;

  /**
   * Direct fields are preserved for frontend compatibility.
   */
  @Prop({
    trim: true,
  })
  address?: string;

  @Prop({
    trim: true,
  })
  country?: string;

  @Prop({
    trim: true,
  })
  city?: string;

  @Prop({
    trim: true,
  })
  state?: string;

  @Prop({
    trim: true,
  })
  postalCode?: string;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  // ==========================================================================
  // SERVICES / AMENITIES / FEATURES
  // ==========================================================================

  @Prop({
    type: [PartnerService],
    default: [],
  })
  services!: PartnerService[];

  @Prop({
    type: [String],
    default: [],
  })
  amenities!: string[];

  @Prop({
    type: [String],
    default: [],
  })
  features!: string[];

  // ==========================================================================
  // BUSINESS HOURS
  // ==========================================================================

  @Prop({
    type: PartnerBusinessHours,
    default: {},
  })
  businessHours!: PartnerBusinessHours;

  // ==========================================================================
  // MEDIA
  // ==========================================================================

  @Prop({
    type: [String],
    default: [],
  })
  images!: string[];

  @Prop()
  logo?: string;

  @Prop()
  coverImage?: string;

  // ==========================================================================
  // SOCIAL MEDIA
  // ==========================================================================

  @Prop({
    type: PartnerSocialLinks,
    default: {},
  })
  socialLinks!: PartnerSocialLinks;

  // ==========================================================================
  // DOCUMENTS / VERIFICATION
  // ==========================================================================

  @Prop({
    type: [PartnerDocumentInfo],
    default: [],
  })
  documentList!: PartnerDocumentInfo[];

  /**
   * Flexible documents object.
   *
   * This accepts the exact frontend payload:
   *
   * documents: {}
   *
   * and also future document structures.
   */
  @Prop({
    type: Object,
    default: {},
  })
  documents!: Record<string, unknown>;

  // ==========================================================================
  // STATUS
  // ==========================================================================

  @Prop({
    enum: [
      'pending',
      'verified',
      'suspended',
      'rejected',
    ],
    default: 'pending',
    index: true,
  })
  status!: PartnerStatus;

  @Prop()
  rejectionReason?: string;

  @Prop()
  suspensionReason?: string;

  @Prop()
  verifiedAt?: Date;

  // ==========================================================================
  // MARKETPLACE / BOOKING SETTINGS
  // ==========================================================================

  @Prop({
    default: true,
  })
  acceptingBookings!: boolean;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop({
    default: false,
  })
  featured!: boolean;

  @Prop({
    default: false,
  })
  instantBooking!: boolean;

  @Prop()
  cancellationPolicy?: string;

  @Prop()
  bookingPolicy?: string;

  // ==========================================================================
  // PAYMENT INFORMATION
  // ==========================================================================

  /**
   * Only provider/account identifiers.
   *
   * Never store raw card or bank credentials.
   */
  @Prop()
  paymentProvider?: string;

  @Prop()
  paymentAccountId?: string;

  @Prop()
  payoutCurrency?: string;

  // ==========================================================================
  // FLEXIBLE FRONTEND DATA
  // ==========================================================================

  /**
   * Allows additional Travel frontend information
   * to be retained without immediately changing
   * the database schema.
   */
  @Prop({
    type: Object,
    default: {},
  })
  metadata!: Record<string, unknown>;
}

export const PartnerSchema =
  SchemaFactory.createForClass(Partner);

// ============================================================================
// INDEXES
// ============================================================================

PartnerSchema.index({
  status: 1,
  active: 1,
});

PartnerSchema.index({
  categories: 1,
  status: 1,
});

PartnerSchema.index({
  country: 1,
  status: 1,
});

PartnerSchema.index({
  city: 1,
  status: 1,
});