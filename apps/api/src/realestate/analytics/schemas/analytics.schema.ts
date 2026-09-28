import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';


export type AnalyticsDocument =
  HydratedDocument<Analytics>;



@Schema({
  timestamps: true,
})
export class Analytics {


  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
  })
  property?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Agent',
  })
  agent?: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  user?: Types.ObjectId;



  @Prop({
    enum: [
      'view',
      'search',
      'favorite',
      'inquiry',
      'tour',
      'contract',
      'contact',
    ],
    required: true,
  })
  eventType!: string;



  @Prop()
  source?: string;



  @Prop()
  location?: string;



  @Prop()
  device?: string;



  @Prop()
  duration?: number;



  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;

}



export const AnalyticsSchema =
  SchemaFactory.createForClass(
    Analytics,
  );