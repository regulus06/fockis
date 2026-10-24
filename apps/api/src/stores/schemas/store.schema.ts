import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

export type StoreDocument = Store & Document;

export enum StoreCurrency {
  USD = "USD",
  CAD = "CAD",
  EUR = "EUR",
  GBP = "GBP",
  CHF = "CHF",
  AUD = "AUD",
  NZD = "NZD",
  JPY = "JPY",
  CNY = "CNY",
  HKD = "HKD",
  SGD = "SGD",
  INR = "INR",
  KRW = "KRW",
  BRL = "BRL",
  MXN = "MXN",
  ARS = "ARS",
  CLP = "CLP",
  COP = "COP",
  DOP = "DOP",
  HTG = "HTG",
  XOF = "XOF",
  ZAR = "ZAR",
  NGN = "NGN",
  KES = "KES",
  AED = "AED",
  SAR = "SAR",
  TRY = "TRY",
  PLN = "PLN",
  SEK = "SEK",
  NOK = "NOK",
  DKK = "DKK",
}

@Schema({
  timestamps: true,
})
export class Store {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  ownerId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "Seller",
    index: true,
  })
  sellerId?: Types.ObjectId;

  /*
   * Permanent Fockis Store identifier.
   */
  @Prop({
    required: true,
    unique: true,
    index: true,
    immutable: true,
    trim: true,
    uppercase: true,
  })
  fockisStoreId!: string;

  /*
   * Store's Fockis domain.
   */
  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  domainName!: string;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  slug!: string;

  @Prop({
    default: "",
  })
  description!: string;

  @Prop({
    default: "",
    index: true,
  })
  category!: string;

  /*
   * Public store profile image/logo.
   */
  @Prop({
    default: "",
  })
  logo!: string;

  @Prop({
    default: "",
  })
  banner!: string;

  /*
   * Contact details. These remain optional for the public store profile,
   * but live shipping rates require a usable email address.
   */
  @Prop({
    default: "",
    trim: true,
    lowercase: true,
  })
  email!: string;

  @Prop({
    default: "",
    trim: true,
  })
  phone!: string;

  @Prop({
    default: "",
    trim: true,
  })
  website!: string;

  /*
   * Human-readable country name.
   */
  @Prop({
    required: true,
    trim: true,
  })
  country!: string;

  /*
   * Two-letter ISO country code.
   */
  @Prop({
    required: true,
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 2,
    index: true,
  })
  countryCode!: string;

  @Prop({
    required: true,
    trim: true,
  })
  city!: string;

  /*
   * Store's ship-from street address. Required by live carrier rates.
   */
  @Prop({
    required: true,
    trim: true,
  })
  address!: string;

  /*
   * Keep these optional at the schema level so existing stores and store
   * profile creation remain compatible. ShippingService validates them
   * before requesting live carrier rates.
   */
  @Prop({
    default: "",
    trim: true,
  })
  state!: string;

  @Prop({
    default: "",
    trim: true,
  })
  zipCode!: string;

  @Prop({
    type: String,
    enum: Object.values(StoreCurrency),
    default: StoreCurrency.USD,
    required: true,
    index: true,
  })
  currency!: StoreCurrency;

  @Prop({
    default: "",
  })
  shippingPolicy!: string;

  @Prop({
    default: "",
  })
  returnPolicy!: string;

  @Prop({
    default: "",
  })
  facebook!: string;

  @Prop({
    default: "",
  })
  instagram!: string;

  @Prop({
    default: "",
  })
  twitter!: string;

  @Prop({
    default: 0,
  })
  followers!: number;

  @Prop({
    type: [Types.ObjectId],
    ref: "User",
    default: [],
  })
  followersList!: Types.ObjectId[];

  @Prop({
    default: 0,
  })
  rating!: number;

  @Prop({
    default: 0,
  })
  reviewCount!: number;

  @Prop({
    default: 0,
  })
  totalSales!: number;

  @Prop({
    default: 0,
  })
  totalProducts!: number;

  @Prop({
    default: 0,
  })
  totalViews!: number;

  @Prop({
    default: "PENDING",
    enum: [
      "PENDING",
      "ACTIVE",
      "SUSPENDED",
    ],
  })
  status!:
    | "PENDING"
    | "ACTIVE"
    | "SUSPENDED";

  @Prop({
    default: false,
  })
  verified!: boolean;

  @Prop({
    default: true,
    index: true,
  })
  active!: boolean;

  /*
   * Stripe Connect payouts. Set when the seller completes
   * "Set up payouts" (see src/payouts).
   */
  @Prop({
    default: "",
    index: true,
  })
  stripeAccountId!: string;

  @Prop({ default: false })
  stripeDetailsSubmitted!: boolean;

  @Prop({ default: false })
  stripePayoutsEnabled!: boolean;

  @Prop({ default: false })
  stripeTransfersActive!: boolean;

  @Prop({ type: Date, default: null })
  stripeAccountUpdatedAt!: Date | null;
}

export const StoreSchema =
  SchemaFactory.createForClass(Store);

StoreSchema.index({
  ownerId: 1,
  createdAt: -1,
});

StoreSchema.index({
  slug: 1,
  active: 1,
});

StoreSchema.index({
  ownerId: 1,
  active: 1,
});

StoreSchema.index({
  country: 1,
  currency: 1,
});

StoreSchema.index({
  countryCode: 1,
  active: 1,
});

StoreSchema.index({
  domainName: 1,
  active: 1,
});

StoreSchema.index({
  fockisStoreId: 1,
  active: 1,
});
