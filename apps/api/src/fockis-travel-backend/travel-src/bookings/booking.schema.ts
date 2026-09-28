import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type BookingDocument = HydratedDocument<Booking>;
@Schema({ timestamps: true })
export class Booking {
  @Prop({ required: true, unique: true }) bookingCode!: string;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) userId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true }) listingId!: Types.ObjectId;
  @Prop({ required: true, enum: ['stay','rental','meeting','event','restaurant','car','flight','transfer','experience','attraction','thing'] }) type!: string;
  @Prop({ required: true }) startAt!: Date;
  @Prop({ required: true }) endAt!: Date;
  @Prop({ default: 1 }) quantity!: number;
  @Prop({ default: 1 }) guests!: number;
  @Prop({ required: true }) currency!: string;
  @Prop({ required: true }) subtotal!: number;
  @Prop({ default: 0 }) fees!: number;
  @Prop({ default: 0 }) tax!: number;
  @Prop({ required: true }) total!: number;
  @Prop({ enum: ['pending','confirmed','cancelled','completed','refunded'], default: 'pending' }) status!: string;
  @Prop({ default: 'unpaid' }) paymentStatus!: string;
  @Prop() notes?: string;
  @Prop({ type: Object, default: {} }) snapshot!: Record<string, any>;
}
export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ userId: 1, startAt: -1 });
BookingSchema.index({ listingId: 1, startAt: 1, endAt: 1 });
