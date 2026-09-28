import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';



export type FavoriteDocument =
  HydratedDocument<Favorite>;



@Schema({
  timestamps: true,
})
export class Favorite {


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
    default: false,
  })
  notified: boolean;



  @Prop({
    default: false,
  })
  contactedOwner: boolean;



  @Prop()
  notes?: string;



  @Prop({
    enum: [
      'interested',
      'viewing',
      'applied',
      'rented',
      'removed',
    ],

    default: 'interested',
  })
  status: string;


}


export const FavoriteSchema =
  SchemaFactory.createForClass(
    Favorite,
  );