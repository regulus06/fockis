import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type AddressRequestDocument = HydratedDocument<AddressRequest>;

export enum AddressRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  REVOKED = "REVOKED",
}

@Schema({ timestamps: true, collection: "fockis_address_requests" })
export class AddressRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  addressId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  unitId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  requesterId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  reviewedBy?: MongooseSchema.Types.ObjectId;

  @Prop({ enum: Object.values(AddressRequestStatus), default: AddressRequestStatus.PENDING, index: true })
  status!: AddressRequestStatus;

  @Prop({ trim: true, maxlength: 500 })
  note?: string;
}

export const AddressRequestSchema = SchemaFactory.createForClass(AddressRequest);

AddressRequestSchema.index(
  { addressId: 1, unitId: 1, requesterId: 1, status: 1 },
);
