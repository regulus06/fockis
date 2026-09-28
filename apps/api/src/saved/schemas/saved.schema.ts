import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";


export type SavedDocument =
  Saved & Document;


@Schema({
  timestamps: true,
})
export class Saved {


  /*
  |--------------------------------------------------------------------------
  | USER
  |--------------------------------------------------------------------------
  */

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
  })
  userId!: Types.ObjectId;



  /*
  |--------------------------------------------------------------------------
  | POST
  |--------------------------------------------------------------------------
  |
  | This references the real Post document.
  |
  | Because this is a Post reference, the SavedService
  | can use:
  |
  | .populate("postId")
  |
  | and return the complete saved post.
  |
  */

  @Prop({
    type: Types.ObjectId,
    ref: "Post",
    required: true,
  })
  postId!: Types.ObjectId;



  /*
  |--------------------------------------------------------------------------
  | TYPE
  |--------------------------------------------------------------------------
  */

  @Prop({
    default: "post",
  })
  type!: string;

}


export const SavedSchema =
  SchemaFactory.createForClass(Saved);