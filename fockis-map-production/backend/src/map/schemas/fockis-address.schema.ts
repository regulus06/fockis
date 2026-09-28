import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type FockisAddressDocument = HydratedDocument<FockisAddress>;

export enum AddressStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum UnitStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

@Schema({ _id: true })
export class AddressUnit {
  @Prop({ required: true, trim: true, maxlength: 80 })
  unitNumber!: string;

  @Prop({ trim: true, maxlength: 40 })
  floor?: string;

  @Prop({
    enum: ["APARTMENT", "HOUSE", "ROOM", "SUITE", "OFFICE", "OTHER"],
    default: "APARTMENT",
  })
  unitType!: string;

  @Prop({ enum: Object.values(UnitStatus), default: UnitStatus.ACTIVE })
  status!: UnitStatus;
}

export const AddressUnitSchema = SchemaFactory.createForClass(AddressUnit);

@Schema({ timestamps: true, collection: "fockis_addresses" })
export class FockisAddress {
  @Prop({ required: true, unique: true, index: true })
  fockisAddressId!: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  country!: string;

  @Prop({ required: true, uppercase: true, trim: true, minlength: 2, maxlength: 2, index: true })
  countryCode!: string;

  @Prop({ trim: true, maxlength: 120, index: true })
  departmentOrRegion?: string;

  @Prop({ trim: true, maxlength: 120, index: true })
  communeOrCity?: string;

  @Prop({ trim: true, maxlength: 160, index: true })
  neighborhood?: string;

  @Prop({ trim: true, maxlength: 180 })
  street?: string;

  @Prop({ trim: true, maxlength: 40 })
  houseNumber?: string;

  @Prop({ trim: true, maxlength: 40 })
  postalCode?: string;

  @Prop({ trim: true, maxlength: 200 })
  landmark?: string;

  @Prop({ trim: true, maxlength: 300 })
  addressLine?: string;

  @Prop({ required: true, min: -90, max: 90 })
  latitude!: number;

  @Prop({ required: true, min: -180, max: 180 })
  longitude!: number;

  @Prop({ trim: true, maxlength: 300 })
  mapboxPlaceId?: string;

  @Prop({ trim: true, maxlength: 160 })
  buildingName?: string;

  @Prop({ trim: true, maxlength: 80 })
  buildingNumber?: string;

  @Prop({ enum: Object.values(AddressStatus), default: AddressStatus.ACTIVE, index: true })
  status!: AddressStatus;

  @Prop({ type: [AddressUnitSchema], default: [] })
  units!: AddressUnit[];

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  createdBy!: MongooseSchema.Types.ObjectId;

  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [], index: true })
  managers!: MongooseSchema.Types.ObjectId[];
}

export const FockisAddressSchema = SchemaFactory.createForClass(FockisAddress);

FockisAddressSchema.index({ countryCode: 1, status: 1, communeOrCity: 1 });
FockisAddressSchema.index({ countryCode: 1, neighborhood: 1 });
