
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SellerProfileDocument = SellerProfile & Document;

@Schema({
  timestamps: true,
})
export class SellerProfile {
  // One seller profile per user.
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["pending", "active", "suspended"],
    default: "pending",
  })
  status!: "pending" | "active" | "suspended";

  @Prop({
    type: Boolean,
    default: true,
  })
  active!: boolean;

  @Prop({
    type: [String],
    default: [
      "manage_products",
      "manage_orders",
      "manage_shipping",
      "manage_settings",
    ],
  })
  permissions!: string[];
}

export const SellerProfileSchema =
  SchemaFactory.createForClass(SellerProfile);
