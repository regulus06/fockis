import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order!: Types.ObjectId;

  @Prop({ required: true })
  invoiceNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customer!: Types.ObjectId;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  customerEmail!: string;

  @Prop({ required: false, default: '' })
  customerPhone!: string;

  @Prop({ required: true })
  billingAddress!: string;

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({ required: true })
  currency!: string;

  @Prop({ required: true })
  status!: string;

  @Prop({ required: true })
  orderDate!: Date;

  @Prop({ required: true })
  month!: string;

  @Prop({ required: true })
  year!: number;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);