import {Prop,Schema,SchemaFactory} from "@nestjs/mongoose";
import {Document,Types} from "mongoose";


@Schema({timestamps:true})
export class Return extends Document{


@Prop({
type:Types.ObjectId,
ref:"Order"
})
orderId:Types.ObjectId;



@Prop({
type:Types.ObjectId,
ref:"User"
})
userId:Types.ObjectId;



@Prop()
reason:string;



@Prop({
default:"requested"
})
status:string;



@Prop()
refundAmount:number;


}


export const ReturnSchema =
SchemaFactory.createForClass(Return);