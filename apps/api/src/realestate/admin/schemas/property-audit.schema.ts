import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export type PropertyAuditDocument =
  PropertyAudit & Document;


@Schema({
  timestamps: true,
})
export class PropertyAudit {


  @Prop({
    type: Types.ObjectId,
    ref: "Property",
    required: true,
  })
  propertyId!: Types.ObjectId;



  @Prop({
    required: true,
  })
  action!: string;



  @Prop()
  reason?: string;



  @Prop({
    type: Types.ObjectId,
    ref: "User",
  })
  adminId?: Types.ObjectId;



  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;

}


export const PropertyAuditSchema =
  SchemaFactory.createForClass(PropertyAudit);