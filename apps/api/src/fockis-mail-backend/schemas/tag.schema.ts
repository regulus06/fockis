import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type MailTagDocument = HydratedDocument<MailTag>;

@Schema({
  collection: 'fockis_mail_tags',
  timestamps: true,
})
export class MailTag {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  ownerId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  workspaceId!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    type: String,
    default: '#2563eb',
    trim: true,
  })
  color!: string;

  @Prop({
    type: Number,
    default: 0,
  })
  contactCount!: number;

  @Prop({
    type: Date,
    default: null,
  })
  lastUsedAt!: Date | null;
}

export const TagSchema =
  SchemaFactory.createForClass(MailTag);

TagSchema.index({
  ownerId: 1,
  workspaceId: 1,
});

TagSchema.index(
  {
    ownerId: 1,
    workspaceId: 1,
    name: 1,
  },
  {
    unique: true,
  },
);