import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  HydratedDocument,
  Types,
} from "mongoose";

export type ManagedDomainDocument =
  HydratedDocument<ManagedDomain>;

@Schema({
  collection: "managed_domains",
  timestamps: true,
})
export class ManagedDomain {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  domain!: string;

  @Prop({
    type: String,
    default: "available",
    enum: [
      "available",
      "assigned",
      "suspended",
    ],
    index: true,
  })
  status!:
    | "available"
    | "assigned"
    | "suspended";

  @Prop({
    type: String,
    default: null,
    enum: [
      "free",
      "paid",
      "manual",
      "promotional",
      null,
    ],
    index: true,
  })
  assignmentType!:
    | "free"
    | "paid"
    | "manual"
    | "promotional"
    | null;

  @Prop({
    type: String,
    default: null,
    enum: [
      "user",
      "organization",
      null,
    ],
  })
  ownerType!:
    | "user"
    | "organization"
    | null;

  @Prop({
    type: Types.ObjectId,
    default: null,
    index: true,
  })
  ownerId?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
  })
  assignedByUserId?:
    | Types.ObjectId
    | null;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  price!: number;

  @Prop({
    type: String,
    default: "USD",
  })
  currency!: string;

  @Prop({
    type: Date,
    default: null,
  })
  purchasedAt?: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  expiresAt?: Date | null;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive!: boolean;
}

export const ManagedDomainSchema =
  SchemaFactory.createForClass(
    ManagedDomain,
  );

ManagedDomainSchema.index({
  ownerType: 1,
  ownerId: 1,
});

ManagedDomainSchema.index({
  assignmentType: 1,
  status: 1,
});