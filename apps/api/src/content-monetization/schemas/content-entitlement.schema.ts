import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

import {
  EntitlementStatus,
  EntitlementType,
} from "../types/content-monetization.types";

export type ContentEntitlementDocument =
  ContentEntitlement & Document;

@Schema({
  timestamps: true,
})
export class ContentEntitlement {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "ContentPurchase",
    required: true,
  })
  purchaseId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(EntitlementType),
    required: true,
  })
  entitlementType!: EntitlementType;

  @Prop({
    type: String,
    enum: Object.values(EntitlementStatus),
    default: EntitlementStatus.ACTIVE,
    index: true,
  })
  status!: EntitlementStatus;

  @Prop({
    required: true,
  })
  grantedAt!: Date;

  @Prop()
  expiresAt?: Date;
}

export const ContentEntitlementSchema =
  SchemaFactory.createForClass(ContentEntitlement);

ContentEntitlementSchema.index({
  userId: 1,
  contentId: 1,
  entitlementType: 1,
});

ContentEntitlementSchema.index({
  userId: 1,
  status: 1,
});