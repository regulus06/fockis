import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";



export type NotificationDocument =
  Notification &
  Document & {

    createdAt: Date;

    updatedAt: Date;

  };




@Schema({
  timestamps:true,
})
export class Notification {



  @Prop({
    type:Types.ObjectId,
    ref:"User",
    required:true,
  })
  recipientId!:Types.ObjectId;




  @Prop({
    type:Types.ObjectId,
    ref:"User",
  })
  senderId?:Types.ObjectId;




  @Prop({
    required:true,
  })
  type!:string;




  @Prop({
    required:true,
  })
  title!:string;




  @Prop({
    required:true,
  })
  message!:string;




  @Prop()
  entityId?:string;




  @Prop()
  entityType?:string;




  @Prop({
    default:false,
  })
  read!:boolean;




  @Prop()
  image?:string;




  @Prop()
  link?:string;



}



export const NotificationSchema =
SchemaFactory.createForClass(Notification);