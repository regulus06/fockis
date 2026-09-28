import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop()
  userId!: string;

  @Prop()
  action!: string;

  @Prop()
  module!: string;

  @Prop()
  targetId?: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Record<string, any>;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);