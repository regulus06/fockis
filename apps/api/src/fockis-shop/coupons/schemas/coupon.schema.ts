import {
Prop,
Schema,
SchemaFactory
} from "@nestjs/mongoose";

import {Document} from "mongoose";


@Schema({
timestamps:true
})
export class Coupon extends Document {


@Prop({
unique:true
})
code:string;



@Prop()
type:string;



@Prop()
value:number;



@Prop()
minPurchase:number;



@Prop()
maxUses:number;



@Prop({
default:0
})
used:number;



@Prop()
expiresAt:Date;



@Prop({
default:true
})
active:boolean;


}


export const CouponSchema =
SchemaFactory.createForClass(Coupon);