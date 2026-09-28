import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LandlordDocument = HydratedDocument<Landlord>;

@Schema({ timestamps: true })
export class Landlord {

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  user: Types.ObjectId;


  @Prop({ required: true })
  firstName: string;


  @Prop({ required: true })
  lastName: string;


  @Prop()
  phone?: string;


  @Prop()
  email?: string;


  @Prop()
  profileImage?: string;


  @Prop()
  address?: string;


  @Prop({
    enum: [
      'individual',
      'company',
    ],
    default: 'individual',
  })
  landlordType: string;


  @Prop()
  companyName?: string;


  @Prop({ default: 0 })
  totalProperties: number;


  @Prop({ default: 0 })
  activeRentals: number;


  @Prop({ default: 0 })
  monthlyRentalIncome: number;


  @Prop({ default: 0 })
  totalRevenue: number;


  @Prop({ default: 0 })
  totalMaintenanceRequests: number;


  @Prop({
    default: true,
  })
  verified: boolean;


  @Prop({
    type: [Types.ObjectId],
    ref: 'Property',
    default: [],
  })
  properties: Types.ObjectId[];
}


export const LandlordSchema =
  SchemaFactory.createForClass(Landlord);