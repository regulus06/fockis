import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScanDocument = Scan & Document;

export enum ScanType {
  DOCUMENT = 'document',
  RECEIPT = 'receipt',
  FORM = 'form',
  ID = 'id',
  HANDWRITING = 'handwriting',
  PASSPORT_PHOTO = 'passport_photo',
  OTHER = 'other',
}

export enum ScanStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum OcrStatus {
  NOT_REQUESTED = 'NOT_REQUESTED',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Schema({
  timestamps: true,
  collection: 'create_scans',
})
export class Scan {
  _id!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  originalFile!: string;

  @Prop()
  processedFile?: string;

  @Prop({
    type: String,
    enum: ScanType,
    default: ScanType.DOCUMENT,
  })
  type!: ScanType;

  @Prop({
    type: String,
    enum: ScanStatus,
    default: ScanStatus.UPLOADED,
    index: true,
  })
  status!: ScanStatus;

  @Prop({
    default: 1,
  })
  pageCount!: number;

  @Prop({
    type: String,
    enum: OcrStatus,
    default: OcrStatus.NOT_REQUESTED,
  })
  ocrStatus!: OcrStatus;

  @Prop()
  extractedText?: string;

  @Prop({
    type: Object,
  })
  ocrResult?: {
    confidence?: number;
    pages?: any[];
    blocks?: any[];
    lines?: any[];
    words?: any[];
    provider?: string;
  };

  @Prop({
    type: Types.ObjectId,
    ref: 'CreateDocument',
  })
  documentId?: Types.ObjectId;

  @Prop()
  failureReason?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ScanSchema = SchemaFactory.createForClass(Scan);

ScanSchema.index({
  userId: 1,
  status: 1,
});

ScanSchema.index({
  userId: 1,
  createdAt: -1,
});