import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Types,
  Document,
} from "mongoose";

export type ProductDocument =
  Product & Document;

/* ============================================================================
   PRODUCT
============================================================================ */

@Schema({
  timestamps: true,
})
export class Product {

  /* ==========================================================================
     BASIC INFO
  ========================================================================== */

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  name!: string;

  @Prop({
    default: "",
  })
  description!: string;


  /* ==========================================================================
     PRICING
  ========================================================================== */

  /*
   * Original product price.
   *
   * Example:
   * price = 100
   */

  @Prop({
    required: true,
    min: 0,
  })
  price!: number;


  /*
   * Discount percentage.
   *
   * Examples:
   *
   * 0   = no discount
   * 10  = 10% discount
   * 25  = 25% discount
   * 50  = 50% discount
   * 100 = free
   */

  @Prop({
    default: 0,
    min: 0,
    max: 100,
  })
  discount!: number;


  /* ==========================================================================
     BACKEND DISCOUNT CALCULATION
  ========================================================================== */

  /*
   * Calculates the final price after discount.
   *
   * IMPORTANT:
   *
   * This is NOT stored in MongoDB.
   *
   * The backend calculates it whenever needed.
   *
   * Example:
   *
   * price = 100
   * discount = 20
   *
   * final price = 80
   */

  getDiscountedPrice(): number {
    const originalPrice =
      Number(this.price ?? 0);

    const discountPercent =
      Number(this.discount ?? 0);

    if (
      originalPrice <= 0
    ) {
      return 0;
    }

    if (
      discountPercent <= 0
    ) {
      return Number(
        originalPrice.toFixed(2),
      );
    }

    if (
      discountPercent >= 100
    ) {
      return 0;
    }

    const discountedPrice =
      originalPrice -
      (
        originalPrice *
        discountPercent
      ) /
      100;

    return Number(
      Math.max(
        0,
        discountedPrice,
      ).toFixed(2),
    );
  }


  /*
   * Returns the amount saved by the customer.
   *
   * Example:
   *
   * price = 100
   * discount = 20
   *
   * savings = 20
   */

  getDiscountAmount(): number {
    const originalPrice =
      Number(this.price ?? 0);

    const discountedPrice =
      this.getDiscountedPrice();

    return Number(
      Math.max(
        0,
        originalPrice -
          discountedPrice,
      ).toFixed(2),
    );
  }


  /* ==========================================================================
     INVENTORY
  ========================================================================== */

  @Prop({
    default: 0,
    min: 0,
  })
  stock!: number;


  /* ==========================================================================
     MEDIA
  ========================================================================== */

  @Prop({
    type: [String],
    default: [],
  })
  images!: string[];


  /* ==========================================================================
     CATEGORY
  ========================================================================== */

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  category!: string;


  /* ==========================================================================
     SELLER OWNER
  ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  seller!: Types.ObjectId;


  /* ==========================================================================
     STORE OWNER
  ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "Store",
    required: true,
    index: true,
  })
  storeId!: Types.ObjectId;


  /* ==========================================================================
     MARKETPLACE DISPLAY
  ========================================================================== */

  @Prop({
    type: [String],
    enum: [
      "marketplace",
      "feed",
      "story",
    ],
    default: [
      "marketplace",
    ],
  })
  displayLocations!: string[];


  @Prop({
    type: Date,
    default: null,
  })
  feedExpiresAt?: Date | null;


  @Prop({
    type: Date,
    default: null,
  })
  storyExpiresAt?: Date | null;


  /* ==========================================================================
     STATUS
  ========================================================================== */

  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;


  /* ==========================================================================
     MARKETPLACE FILTER DATA
  ========================================================================== */

  @Prop({
    default: "",
    trim: true,
    index: true,
  })
  brand!: string;


  @Prop({
    default: "",
    trim: true,
  })
  location!: string;


  /* ==========================================================================
     REVIEWS
  ========================================================================== */

  @Prop({
    default: 0,
  })
  rating!: number;


  @Prop({
    default: 0,
  })
  totalReviews!: number;


  /* ==========================================================================
     ANALYTICS
  ========================================================================== */

  @Prop({
    default: 0,
  })
  views!: number;


  @Prop({
    default: 0,
  })
  salesCount!: number;

}


/* ============================================================================
   SCHEMA
============================================================================ */

export const ProductSchema =
  SchemaFactory.createForClass(Product);


/* ============================================================================
   SEARCH INDEXES
============================================================================ */

ProductSchema.index({
  category: 1,
  price: 1,
  isActive: 1,
});


ProductSchema.index({
  storeId: 1,
  createdAt: -1,
});


ProductSchema.index({
  name: "text",
  description: "text",
  brand: "text",
});