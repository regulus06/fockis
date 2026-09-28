import {
  Prop,
  Schema,
  SchemaFactory
} from '@nestjs/mongoose';

import {
  Document,
  Types
} from 'mongoose';



export type InventoryDocument =
Inventory & Document;




@Schema({
  timestamps:true
})
export class Inventory {



@Prop({
  type:Types.ObjectId,
  ref:'Product',
  required:true
})
product!: Types.ObjectId;




@Prop({
  type:Types.ObjectId,
  ref:'User',
  required:true
})
seller!: Types.ObjectId;




@Prop({
  default:0
})
quantity!: number;




@Prop({
  default:0
})
reserved!: number;



}




export const InventorySchema =
SchemaFactory.createForClass(Inventory);