import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


@Schema({
  timestamps:true
})
export class Seller extends Document {



  @Prop({
    type:Types.ObjectId,
    ref:"User",
    required:true
  })
  userId!: Types.ObjectId;




  @Prop()
  storeName!: string;




  @Prop()
  description!: string;




  @Prop()
  logo!: string;




  @Prop()
  banner!: string;




  @Prop({
    default:false
  })
  verified!: boolean;




  @Prop({
    default:0
  })
  rating!: number;




  @Prop({
    default:0
  })
  totalSales!: number;




  @Prop({
    default:"pending"
  })
  status!: string;



}



export const SellerSchema =
SchemaFactory.createForClass(Seller);