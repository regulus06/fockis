import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
} from "mongoose";

// ============================================================
// USER DOCUMENT TYPE
// ============================================================

export type UserDocument = HydratedDocument<User>;

// ============================================================
// USER SCHEMA
// ============================================================

@Schema({
  timestamps: true,
})
export class User {
  // ============================================================
  // BASIC ACCOUNT
  // ============================================================

  @Prop({
    required: true,
    trim: true,
  })
  username!: string;

  // ============================================================
  // FOCKIS ID
  // ============================================================

  /**
   * Permanent internal Fockis identity.
   *
   * Format:
   * FK + 6 uppercase characters
   *
   * Example:
   * FK7Q2M8A
   *
   * IMPORTANT:
   * This value is the globally unique identity.
   *
   * It does NOT contain the country/calling code.
   *
   * Public identity is generated from:
   *
   * callingCode + "-" + fockisId
   *
   * Example:
   * +509-FK7Q2M8A
   */
  @Prop({
    type: String,
    required: false,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    minlength: 8,
    maxlength: 8,
    match: /^FK[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
    index: true,
  })
  fockisId?: string;

  // ============================================================
  // FOCKIS COUNTRY
  // ============================================================

  /**
   * ISO 3166-1 alpha-2 country code.
   *
   * Examples:
   *
   * US = United States
   * HT = Haiti
   * DO = Dominican Republic
   * CA = Canada
   * FR = France
   *
   * This is NOT a phone number.
   *
   * New accounts should provide this during registration.
   *
   * required:false is intentional for backward compatibility
   * with existing/test accounts created before country support.
   */
  @Prop({
    type: String,
    required: false,
    uppercase: true,
    trim: true,
    minlength: 2,
    maxlength: 2,
    match: /^[A-Z]{2}$/,
    index: true,
  })
  countryCode?: string;

  // ============================================================
  // FOCKIS CALLING CODE
  // ============================================================

  /**
   * International calling code associated with countryCode.
   *
   * Examples:
   *
   * US -> +1
   * HT -> +509
   * DO -> +1
   * CA -> +1
   * FR -> +33
   *
   * IMPORTANT:
   *
   * This is NOT the user's phone number.
   *
   * Multiple countries/territories can share
   * the same calling code.
   *
   * Therefore callingCode is NOT unique.
   *
   * The backend determines this value from
   * countryCode. It should not be trusted from
   * the frontend.
   *
   * required:false is intentional for backward compatibility
   * with existing/test accounts created before country support.
   */
  @Prop({
    type: String,
    required: false,
    trim: true,
    match: /^\+[1-9]\d{0,14}$/,
    index: true,
  })
  callingCode?: string;

  // ============================================================
  // FOCKIS ID ACCESS / PAYMENT
  // ============================================================

  /**
   * Whether the user has paid for Fockis ID access.
   */
  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  fockisIdAccessPaid!: boolean;

  /**
   * Date/time when Fockis ID access was successfully paid.
   */
  @Prop({
    type: Date,
    default: null,
  })
  fockisIdAccessPaidAt!: Date | null;

  /**
   * Stripe payment identifier associated with
   * the successful Fockis ID access payment.
   */
  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  fockisIdAccessPaymentId!: string | null;

  // ============================================================
  // EMAIL / PASSWORD
  // ============================================================

  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
  })
  password!: string;

  // ============================================================
  // PASSWORD SECURITY
  // ============================================================

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  mustChangePassword!: boolean;

  @Prop({
    type: [String],
    default: [],
  })
  passwordHistory!: string[];

  @Prop({
    type: Date,
    default: null,
  })
  passwordChangedAt!: Date | null;

  @Prop({
    type: Boolean,
    default: false,
  })
  passwordResetByAdmin!: boolean;

  // ============================================================
  // LOGIN SECURITY / ACCOUNT LOCKOUT
  // ============================================================

  @Prop({
    type: Number,
    default: 0,
    min: 0,
    index: true,
  })
  failedLoginAttempts!: number;

  @Prop({
    type: Date,
    default: null,
  })
  lastFailedLoginAt!: Date | null;

  @Prop({
    type: Date,
    default: null,
    index: true,
  })
  lockedUntil!: Date | null;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  lockoutCount!: number;

  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt!: Date | null;

  @Prop({
    type: String,
    default: null,
  })
  lastLoginIp!: string | null;

  @Prop({
    type: String,
    default: null,
  })
  lastLoginUserAgent!: string | null;

  // ============================================================
  // ACCOUNT ACTIVITY
  // ============================================================

  @Prop({
    type: Date,
    default: null,
    index: true,
  })
  lastActiveAt!: Date | null;

  @Prop({
    type: Boolean,
    default: false,
  })
  online!: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  lastSeen!: Date | null;

  // ============================================================
  // PASSWORD RESET
  // ============================================================

  @Prop({
    type: String,
    default: null,
  })
  resetPasswordToken!: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  resetPasswordExpires!: Date | null;

  // ============================================================
  // PROFILE
  // ============================================================

  @Prop({
    type: String,
    default: "",
  })
  firstName!: string;

  @Prop({
    type: String,
    default: "",
  })
  lastName!: string;

  @Prop({
    type: String,
    default: "",
  })
  bio!: string;

  @Prop({
    type: String,
    default: "",
  })
  location!: string;

  @Prop({
    type: String,
    default: "",
  })
  website!: string;

  /**
   * Existing phone field.
   *
   * This remains separate from Fockis ID.
   *
   * Fockis registration does NOT require
   * a phone number.
   */
  @Prop({
    type: String,
    default: "",
  })
  phone!: string;

  @Prop({
    type: String,
    default: "",
  })
  profilePicture!: string;

  @Prop({
    type: String,
    default: "",
  })
  coverPhoto!: string;

  @Prop({
    type: String,
    default: "",
  })
  gender!: string;

  @Prop({
    type: String,
    default: "",
  })
  birthDate!: string;

  // ============================================================
  // SOCIAL
  // ============================================================

  @Prop({
    type: [String],
    default: [],
  })
  followers!: string[];

  @Prop({
    type: [String],
    default: [],
  })
  following!: string[];

  @Prop({
    type: Number,
    default: 0,
  })
  followersCount!: number;

  @Prop({
    type: Number,
    default: 0,
  })
  followingCount!: number;

  @Prop({
    type: [String],
    default: [],
  })
  friends!: string[];

  @Prop({
    type: Number,
    default: 0,
  })
  friendsCount!: number;

  // ============================================================
  // RBAC / ADMIN PERMISSIONS
  // ============================================================

  @Prop({
    type: String,
    default: "user",
    enum: [
      "user",
      "moderator",
      "admin",
      "super_admin",
    ],
  })
  role!: string;

  @Prop({
    type: [String],
    default: [],
  })
  permissions!: string[];

  // ============================================================
  // ACCOUNT TYPE
  // ============================================================

  @Prop({
    type: String,
    default: "user",
    enum: [
      "user",
      "seller",
      "business",
    ],
  })
  accountType!: string;

  // ============================================================
  // ACCOUNT STATUS
  // ============================================================

  @Prop({
    type: Boolean,
    default: false,
  })
  verified!: boolean;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  isPrivate!: boolean;

  // ============================================================
  // SELLER INFORMATION
  // ============================================================

  @Prop({
    type: Boolean,
    default: false,
  })
  sellerApproved!: boolean;

  @Prop({
    type: String,
    default: "",
  })
  storeName!: string;

  @Prop({
    type: String,
    default: "",
  })
  storeDescription!: string;

  // ============================================================
  // USER STATS
  // ============================================================

  @Prop({
    type: Number,
    default: 0,
  })
  postsCount!: number;

  @Prop({
    type: Number,
    default: 0,
  })
  likesReceived!: number;

  // ============================================================
  // PREMIUM / SUBSCRIPTION
  // ============================================================

  @Prop({
    type: Boolean,
    default: false,
  })
  premium!: boolean;

  @Prop({
    type: String,
    default: "",
  })
  subscriptionType!: string;

  @Prop({
    type: Date,
    default: null,
  })
  subscriptionExpiresAt!: Date | null;
}

// ============================================================
// CREATE SCHEMA
// ============================================================

export const UserSchema =
  SchemaFactory.createForClass(User);

// ============================================================
// SEARCH INDEXES
// ============================================================

UserSchema.index({
  username: 1,
});

UserSchema.index({
  firstName: 1,
  lastName: 1,
});

UserSchema.index({
  email: 1,
});

UserSchema.index({
  isActive: 1,
});

UserSchema.index({
  lockedUntil: 1,
});

UserSchema.index({
  failedLoginAttempts: 1,
});

UserSchema.index({
  lastActiveAt: 1,
});

// ============================================================
// FOCKIS ID INDEXES
// ============================================================

UserSchema.index({
  fockisId: 1,
});

UserSchema.index({
  fockisIdAccessPaid: 1,
});

// ============================================================
// FOCKIS COUNTRY INDEXES
// ============================================================

UserSchema.index({
  countryCode: 1,
});

UserSchema.index({
  callingCode: 1,
});

// ============================================================
// FOCKIS PUBLIC ID LOOKUP
// ============================================================

/**
 * Allows efficient lookup of:
 *
 * +509-FK7Q2M8A
 *
 * by:
 *
 * callingCode + fockisId
 *
 * The Fockis ID itself remains globally unique.
 */
UserSchema.index({
  callingCode: 1,
  fockisId: 1,
});