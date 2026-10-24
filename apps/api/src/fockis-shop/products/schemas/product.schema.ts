
import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Types,
  Document,
} from "mongoose";

export type ProductDocument = Product & Document;

@Schema({
  timestamps: true,
})
export class Product {
  // BASIC INFO

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

  // PRICING

  @Prop({
    required: true,
    min: 0,
  })
  price!: number;

  @Prop({
    default: 0,
    min: 0,
    max: 100,
  })
  discount!: number;

  getDiscountedPrice(): number {
    const originalPrice = Number(this.price ?? 0);
    const discountPercent = Number(this.discount ?? 0);

    if (originalPrice <= 0) return 0;
    if (discountPercent <= 0) {
      return Number(originalPrice.toFixed(2));
    }
    if (discountPercent >= 100) return 0;

    return Number(
      Math.max(
        0,
        originalPrice -
          (originalPrice * discountPercent) / 100,
      ).toFixed(2),
    );
  }

  getDiscountAmount(): number {
    return Number(
      Math.max(
        0,
        Number(this.price ?? 0) -
          this.getDiscountedPrice(),
      ).toFixed(2),
    );
  }

  // INVENTORY

  @Prop({
    default: 0,
    min: 0,
  })
  stock!: number;

  // MEDIA

  @Prop({
    type: [String],
    default: [],
  })
  images!: string[];

  // CATEGORY

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  category!: string;

  // SELLER AND STORE

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  seller!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "Store",
    required: true,
    index: true,
  })
  storeId!: Types.ObjectId;

  // SHIPPING PACKAGE

  @Prop({
    type: Number,
    min: 0.000001,
    default: undefined,
  })
  shippingWeight?: number;

  @Prop({
    type: String,
    enum: ["lb", "oz", "kg", "g"],
    default: "lb",
  })
  shippingWeightUnit!: "lb" | "oz" | "kg" | "g";

  @Prop({
    type: Number,
    min: 0.000001,
    default: undefined,
  })
  shippingLength?: number;

  @Prop({
    type: Number,
    min: 0.000001,
    default: undefined,
  })
  shippingWidth?: number;

  @Prop({
    type: Number,
    min: 0.000001,
    default: undefined,
  })
  shippingHeight?: number;

  @Prop({
    type: String,
    enum: ["in", "cm", "ft", "mm", "m"],
    default: "in",
  })
  shippingDimensionUnit!: "in" | "cm" | "ft" | "mm" | "m";

  // MARKETPLACE DISPLAY

  @Prop({
    type: [String],
    enum: ["marketplace", "feed", "story"],
    default: ["marketplace"],
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

  // STATUS

  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;

  // MARKETPLACE FILTER DATA

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

  // REVIEWS

  @Prop({
    default: 0,
  })
  rating!: number;

  @Prop({
    default: 0,
  })
  totalReviews!: number;

  // ANALYTICS

  @Prop({
    default: 0,
  })
  views!: number;

  @Prop({
    default: 0,
  })
  salesCount!: number;
}

export const ProductSchema =
  SchemaFactory.createForClass(Product);

// SEARCH INDEXES

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
