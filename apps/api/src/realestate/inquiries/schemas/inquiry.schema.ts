import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';


export type InquiryDocument =
  HydratedDocument<Inquiry>;


@Schema({
  timestamps: true,
})
export class Inquiry {


  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  property: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Agent',
  })
  agent?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Landlord',
  })
  landlord?: Types.ObjectId;



  @Prop({
    required: true,
  })
  subject: string;



  @Prop({
    required: true,
  })
  message: string;



  @Prop({
    enum: [
      'new',
      'contacted',
      'scheduled',
      'completed',
      'closed',
      'cancelled',
    ],
    default: 'new',
  })
  status: string;



  @Prop()
  preferredMoveDate?: Date;



  @Prop()
  preferredTourDate?: Date;



  @Prop({
    default: false,
  })
  converted: boolean;



  @Prop()
  conversionType?: string;



  @Prop({
    type: [
      {
        sender: {
          type: Types.ObjectId,
          ref: 'User',
        },

        message: String,

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  })
  conversations: any[];

}


export const InquirySchema =
  SchemaFactory.createForClass(Inquiry);