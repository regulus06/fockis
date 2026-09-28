import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CartDocument = Cart & Document;

@Schema({ _id: false })
export class CartItem {
  @Prop({
    type: Types.ObjectId,
    ref: "Product",
    required: true,
  })
  productId!: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    default: 1,
  })
  quantity!: number;

  @Prop({
    type: String,
    default: "",
    trim: true,
  })
  productSlug!: string;

  @Prop({
    type: String,
    default: "",
    trim: true,
  })
  productName!: string;

  @Prop({
    type: String,
    default: "",
  })
  productImageUrl!: string;

  @Prop({
    type: String,
    default: "",
  })
  productEmoji!: string;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
  })
  sellerId!: Types.ObjectId | null;

  @Prop({
    type: String,
    default: null,
  })
  sellerName!: string | null;

  @Prop({
    type: Types.ObjectId,
    ref: "Store",
    default: null,
  })
  storeId!: Types.ObjectId | null;

  @Prop({
    type: String,
    default: "",
    trim: true,
  })
  storeSlug!: string;

  @Prop({
    type: String,
    default: "",
    trim: true,
  })
  storeName!: string;

  @Prop({
    type: {
      variantId: {
        type: String,
        default: "",
      },
      optionsLabel: {
        type: String,
        default: "",
      },
    },
    default: null,
  })
  variant!: {
    variantId: string;
    optionsLabel: string;
  } | null;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  unitPrice!: number;

  @Prop({
    type: Number,
    default: null,
    min: 0,
  })
  originalPrice!: number | null;

  @Prop({
    type: Number,
    default: null,
    min: 0,
  })
  salePrice!: number | null;

  @Prop({
    type: String,
    default: "USD",
    trim: true,
  })
  currency!: string;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  sku!: string | null;
}

export const CartItemSchema =
  SchemaFactory.createForClass(CartItem);

@Schema({
  timestamps: true,
})
export class Cart {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: [CartItemSchema],
    default: [],
  })
  items!: CartItem[];
}

export const CartSchema =
  SchemaFactory.createForClass(Cart);