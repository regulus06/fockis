import {Prop,Schema,SchemaFactory} from "@nestjs/mongoose";
import {Document,Types} from "mongoose";


@Schema({timestamps:true})
export class Dispute extends Document{


@Prop({
type:Types.ObjectId,
ref:"Order"
})
orderId:Types.ObjectId;



@Prop({
type:Types.ObjectId,
ref:"User"
})
openedBy:Types.ObjectId;



@Prop()
reason:string;



@Prop()
description:string;



@Prop({
default:"open"
})
status:string;



@Prop()
adminNote:string;


}


export const DisputeSchema =
SchemaFactory.createForClass(Dispute);