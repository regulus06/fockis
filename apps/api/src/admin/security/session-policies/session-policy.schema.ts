import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SessionPolicyDocument = HydratedDocument<SessionPolicy>;

@Schema({ timestamps: true, collection: 'session_policies' })
export class SessionPolicy {
  @Prop({ required: true, unique: true, trim: true, lowercase: true, index: true })
  key!: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  displayName!: string;

  @Prop({ default: '', trim: true, maxlength: 500 })
  description!: string;

  @Prop({ default: true, index: true })
  enabled!: boolean;

  @Prop({ required: true, min: 1, max: 1440 })
  inactivityMinutes!: number;

  @Prop({ required: true, min: 1, max: 168 })
  maximumSessionHours!: number;

  @Prop({ default: false })
  requireMfa!: boolean;

  @Prop({ type: [String], default: [] })
  routePatterns!: string[];

  @Prop({ default: 100, min: 0, max: 10000, index: true })
  priority!: number;

  @Prop({ default: false })
  isDefault!: boolean;

  @Prop({ default: false })
  isProtected!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy!: Types.ObjectId | null;
}

export const SessionPolicySchema = SchemaFactory.createForClass(SessionPolicy);

SessionPolicySchema.index({ enabled: 1, priority: -1 });
SessionPolicySchema.index({ isDefault: 1 });
