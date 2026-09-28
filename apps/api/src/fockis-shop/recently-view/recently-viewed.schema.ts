import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";


export type RecentlyViewedDocument =
  RecentlyViewed & Document;


@Schema({
  timestamps: true,
})
export class RecentlyViewed {

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;


  @Prop({
    type: Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  })
  productId!: Types.ObjectId;


  @Prop({
    type: Date,
    default: Date.now,
    index: true,
  })
  lastViewedAt!: Date;
}


export const RecentlyViewedSchema =
  SchemaFactory.createForClass(
    RecentlyViewed,
  );


RecentlyViewedSchema.index(
  {
    userId: 1,
    productId: 1,
  },
  {
    unique: true,
  },
);


RecentlyViewedSchema.index(
  {
    lastViewedAt: 1,
  },
  {
    expireAfterSeconds:
      60 * 60 * 24 * 30,
  },
);