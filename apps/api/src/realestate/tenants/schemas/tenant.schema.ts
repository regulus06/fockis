import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';


export type TenantDocument = HydratedDocument<Tenant>;


@Schema({
  timestamps: true,
})
export class Tenant {


  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  user: Types.ObjectId;



  @Prop({
    required: true,
  })
  firstName: string;



  @Prop({
    required: true,
  })
  lastName: string;



  @Prop()
  email?: string;



  @Prop()
  phone?: string;



  @Prop()
  profileImage?: string;



  @Prop()
  dateOfBirth?: Date;



  @Prop()
  occupation?: string;



  @Prop()
  employer?: string;



  @Prop()
  monthlyIncome?: number;



  @Prop()
  creditScore?: number;



  @Prop({
    default: false,
  })
  backgroundChecked: boolean;



  @Prop({
    default: false,
  })
  verified: boolean;



  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'Lease',
      },
    ],
    default: [],
  })
  leases: Types.ObjectId[];



  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'Property',
      },
    ],
    default: [],
  })
  rentedProperties: Types.ObjectId[];



  @Prop({
    default: 0,
  })
  totalRentPaid: number;



  @Prop({
    default: 0,
  })
  maintenanceRequests: number;



  @Prop({
    default: 'active',
    enum: [
      'active',
      'inactive',
      'blocked',
    ],
  })
  status: string;

}


export const TenantSchema =
  SchemaFactory.createForClass(Tenant);