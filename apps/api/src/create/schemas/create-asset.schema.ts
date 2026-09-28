import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssetDocument = Asset & Document;

export enum AssetType {
  PHOTO = 'photo',
  LOGO = 'logo',
  SIGNATURE = 'signature',
  IMAGE = 'image',
  ICON = 'icon',
  SCANNED_PAGE = 'scanned_page',
  OTHER = 'other',
}

@Schema({ timestamps: true, collection: 'create_assets' })
export class Asset {
  _id!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CreateDocument',
    index: true,
  })
  documentId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: AssetType,
    default: AssetType.OTHER,
  })
  type!: AssetType;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  filename!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ type: Object })
  meta?: {
    width?: number;
    height?: number;
    [key: string]: any;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);

AssetSchema.index({ userId: 1, documentId: 1 });