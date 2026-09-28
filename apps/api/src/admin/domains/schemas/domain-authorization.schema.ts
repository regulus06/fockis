import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  HydratedDocument,
  Types,
} from "mongoose";

export type DomainAuthorizationDocument =
  HydratedDocument<DomainAuthorization>;

@Schema({
  collection: "domain_authorizations",
  timestamps: true,
})
export class DomainAuthorization {
  @Prop({
    type: String,
    required: true,
    enum: ["user", "organization"],
    index: true,
  })
  targetType!: "user" | "organization";

  @Prop({
    required: true,
    type: Types.ObjectId,
    index: true,
  })
  targetId!: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  freeDomainQuantity!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  usedQuantity!: number;

  @Prop({
    type: Date,
    default: null,
  })
  expiresAt?: Date | null;

  @Prop({
    type: String,
    default: "",
    trim: true,
  })
  reason!: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  enabled!: boolean;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: "User",
  })
  grantedByUserId!: Types.ObjectId;
}

export const DomainAuthorizationSchema =
  SchemaFactory.createForClass(
    DomainAuthorization,
  );

DomainAuthorizationSchema.index({
  targetType: 1,
  targetId: 1,
  enabled: 1,
});