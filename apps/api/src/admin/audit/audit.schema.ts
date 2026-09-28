import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditDocument = Audit & Document;

@Schema({ timestamps: true })
export class Audit {
  @Prop() userId: string;
  @Prop() action: string;
  @Prop() target: string; // e.g. "user", "db", "media"
  @Prop() targetId: string;

  @Prop() metadata: Record<string, any>;

  @Prop() ip: string;
  @Prop() userAgent: string;

  @Prop() severity: 'low' | 'medium' | 'high' | 'critical';
}

export const AuditSchema = SchemaFactory.createForClass(Audit);