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

  // --------------------------------------------------------------------------
  // Security audit fields (optional; older records do not have them)
  // --------------------------------------------------------------------------

  /** success | failure | denied */
  @Prop()
  outcome?: string;

  /** info | low | medium | high | critical */
  @Prop()
  severity?: string;

  /** user | policy | organization | session ... */
  @Prop()
  targetType?: string;

  @Prop()
  organizationId?: string;

  @Prop()
  actorName?: string;

  /**
   * Set only for high-volume authentication events so they expire under the
   * platform retention policy. Policy changes and administrator actions have
   * no expiry.
   */
  @Prop({ type: Date, default: undefined })
  expiresAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ module: 1, createdAt: -1 });
AuditLogSchema.index({ module: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ targetId: 1, createdAt: -1 });
AuditLogSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $type: 'date' } },
  },
);

// Audit records are append-only through the application.
for (const op of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const) {
  AuditLogSchema.pre(op as any, function () {
    throw new Error('Audit log records cannot be modified or deleted.');
  });
}
