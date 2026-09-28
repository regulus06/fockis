import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export type GroupDocument = Group & Document;



@Schema({
timestamps:true
})
export class Group {



@Prop({
required:true
})
name!: string;






@Prop({
type:[Types.ObjectId],
ref:"User",
default:[]
})
members!: Types.ObjectId[];







@Prop({
type:[Types.ObjectId],
ref:"User",
default:[]
})
admins!: Types.ObjectId[];








@Prop({
type:Types.ObjectId,
ref:"User",
required:true
})
createdBy!: Types.ObjectId;








@Prop({
type:String,
enum:[
"open",
"request",
"private"
],
default:"open"
})
joinMode!: string;









@Prop({
type:[
Types.ObjectId
],
ref:"User",
default:[]
})
pendingRequests!: Types.ObjectId[];









@Prop({

type:[

{

sender:{

type:Types.ObjectId,

ref:"User"

},


text:String,


mediaUrl:String,


mediaType:{

type:String,

enum:[
"text",
"image",
"video"
],

default:"text"

},



createdAt:{

type:Date,

default:Date.now

}

}

],

default:[]

})
messages!: any[];




}



export const GroupSchema =
SchemaFactory.createForClass(Group);