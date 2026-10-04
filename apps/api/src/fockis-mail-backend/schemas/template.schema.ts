import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type TemplateDocument=HydratedDocument<MailTemplate>;
@Schema({timestamps:true,collection:'fockis_mail_templates'})
export class MailTemplate {
 @Prop({required:true}) name:string;
 @Prop({default:'EMAIL'}) type:string;
 @Prop({default:''}) subject:string;
 @Prop({default:''}) html:string;
 @Prop({type:Object,default:[]}) blocks:any[];
 @Prop({default:''}) thumbnailUrl:string;
 @Prop({default:false}) system:boolean;
 @Prop({required:true,index:true}) ownerId:Types.ObjectId;
 @Prop({required:true,index:true}) workspaceId:string;
}
export const TemplateSchema=SchemaFactory.createForClass(MailTemplate);
