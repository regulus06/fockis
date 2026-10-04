import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TransactionStatus } from '../enums/fockis-mail.enums';
export type CreditDocument=HydratedDocument<MailCredit>;
@Schema({timestamps:true,collection:'fockis_mail_credits'})
export class MailCredit { @Prop({required:true,index:true}) ownerId:Types.ObjectId; @Prop({required:true,index:true}) workspaceId:string; @Prop({default:0}) balance:number; @Prop({default:0}) used:number; @Prop({default:0}) purchased:number; }
export const CreditSchema=SchemaFactory.createForClass(MailCredit);
export type TransactionDocument=HydratedDocument<MailTransaction>;
@Schema({timestamps:true,collection:'fockis_mail_transactions'})
export class MailTransaction { @Prop({required:true,index:true}) ownerId:Types.ObjectId; @Prop({required:true,index:true}) workspaceId:string; @Prop({required:true}) description:string; @Prop({required:true}) amount:number; @Prop({default:'USD'}) currency:string; @Prop({enum:TransactionStatus,default:TransactionStatus.PENDING}) status:TransactionStatus; @Prop() providerId?:string; @Prop({type:Object,default:{}}) metadata:any; }
export const TransactionSchema=SchemaFactory.createForClass(MailTransaction);
