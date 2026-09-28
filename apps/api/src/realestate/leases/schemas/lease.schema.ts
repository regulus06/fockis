import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';



export type LeaseDocument =
  HydratedDocument<Lease>;



@Schema({
  timestamps: true,
})
export class Lease {


  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  property: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  tenant: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  landlord?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Agent',
  })
  agent?: Types.ObjectId;



  @Prop({
    required: true,
  })
  startDate: Date;



  @Prop({
    required: true,
  })
  endDate: Date;



  @Prop({
    required: true,
  })
  monthlyRent: number;



  @Prop()
  securityDeposit?: number;



  @Prop()
  paymentDay?: number;



  @Prop({
    enum: [
      'draft',
      'pending',
      'active',
      'expired',
      'terminated',
      'renewed',
    ],
    default: 'draft',
  })
  status: string;



  @Prop()
  terms?: string;



  @Prop()
  documentUrl?: string;



  @Prop({
    default: false,
  })
  autoRenew: boolean;



  @Prop()
  renewalDate?: Date;


}


export const LeaseSchema =
  SchemaFactory.createForClass(
    Lease,
  );