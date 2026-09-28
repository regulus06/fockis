import {
Prop,
Schema,
SchemaFactory
} from "@nestjs/mongoose";


import {
Document,
Types
} from "mongoose";





export type ShippingDocument =
Shipping & Document;





@Schema({
timestamps:true
})

export class Shipping {



@Prop({

type:Types.ObjectId,

ref:"Order",

required:true

})

order!:Types.ObjectId;





@Prop()

trackingNumber?:string;






@Prop({

default:"pending"

})

status!:string;






@Prop()

carrier?:string;






@Prop()

shippedAt?:Date;






@Prop()

deliveredAt?:Date;



}




export const ShippingSchema =
SchemaFactory.createForClass(Shipping);