import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';


export type RecommendationDocument =
  HydratedDocument<Recommendation>;



@Schema({
  timestamps: true,
})
export class Recommendation {


  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user!: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  property!: Types.ObjectId;



  @Prop()
  score!: number;



  @Prop()
  reason!: string;



  @Prop({
    enum: [
      'location',
      'price',
      'features',
      'behavior',
      'similarity',
    ],
  })
  type!: string;



  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;

}



export const RecommendationSchema =
  SchemaFactory.createForClass(
    Recommendation,
  );