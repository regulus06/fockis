import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type WorkspaceDocument=HydratedDocument<MailWorkspace>;
@Schema({timestamps:true,collection:'fockis_mail_workspaces'})
export class MailWorkspace {
 @Prop({required:true}) name:string;
 @Prop({default:'Fockis Mail'}) brandName:string;
 @Prop() logoUrl?:string;
 @Prop({default:'America/New_York'}) timezone:string;
 @Prop({default:'USD'}) currency:string;
 @Prop({type:[Types.ObjectId],ref:'User',default:[]}) members:Types.ObjectId[];
 @Prop({required:true,index:true}) ownerId:Types.ObjectId;
}
export const WorkspaceSchema=SchemaFactory.createForClass(MailWorkspace);
