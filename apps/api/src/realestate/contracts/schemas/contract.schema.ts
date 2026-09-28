import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';


export type ContractDocument =
  HydratedDocument<Contract>;



@Schema({
  timestamps:true,
})
export class Contract {


  @Prop({
    type: Types.ObjectId,
    ref:'Property',
    required:true,
  })
  property: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref:'User',
  })
  createdBy?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref:'Tenant',
  })
  tenant?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref:'Landlord',
  })
  landlord?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref:'Agent',
  })
  agent?: Types.ObjectId;



  @Prop({
    enum:[
      'lease',
      'sale',
      'purchase',
      'rental',
      'management',
      'other',
    ],
    default:'lease',
  })
  type:string;



  @Prop({
    required:true,
  })
  title:string;



  @Prop()
  description?:string;



  @Prop()
  documentUrl?:string;



  @Prop({
    enum:[
      'draft',
      'pending_signature',
      'active',
      'expired',
      'terminated',
    ],
    default:'draft',
  })
  status:string;



  @Prop()
  startDate?:Date;



  @Prop()
  endDate?:Date;



  @Prop()
  signedDate?:Date;



  @Prop()
  amount?:number;



  @Prop()
  signatureRequired?:boolean;



  @Prop()
  notes?:string;


}



export const ContractSchema =
SchemaFactory.createForClass(
  Contract,
);