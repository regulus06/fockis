import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';



export type DocumentDocument =
  HydratedDocument<Document>;



@Schema({
  timestamps: true,
})
export class Document {


  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  property: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  uploadedBy?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Tenant',
  })
  tenant?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Landlord',
  })
  landlord?: Types.ObjectId;



  @Prop({
    enum: [
      'ownership',
      'lease',
      'inspection',
      'insurance',
      'tax',
      'identity',
      'other',
    ],
    default: 'other',
  })
  type: string;



  @Prop({
    required: true,
  })
  title: string;



  @Prop({
    required: true,
  })
  fileUrl: string;



  @Prop()
  fileType?: string;



  @Prop()
  fileSize?: number;



  @Prop({
    enum:[
      'pending',
      'verified',
      'rejected',
    ],
    default:'pending',
  })
  verificationStatus:string;



  @Prop()
  expiresAt?: Date;



  @Prop()
  notes?: string;


}



export const DocumentSchema =
SchemaFactory.createForClass(Document);