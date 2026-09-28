import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

import { CreateToolType } from '../interfaces/editor.interfaces';
import type { DocumentContent } from '../interfaces/editor.interfaces';

export type CreateDocumentDocument = CreateDocument & MongooseDocument;

export enum DocumentSource {
  TEMPLATE = 'TEMPLATE',
  SCRATCH = 'SCRATCH',
  SCAN = 'SCAN',
  OCR = 'OCR',
  UPLOAD = 'UPLOAD',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentVisibility {
  PRIVATE = 'private',
  SHARED = 'shared',
  PUBLIC = 'public',
}

/**
 * Named `CreateDocument` (not `Document`) to avoid clashing with
 * mongoose.Document in this codebase.
 */
@Schema({
  timestamps: true,
  collection: 'create_documents',
})
export class CreateDocument {
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
    ref: 'Template',
    index: true,
  })
  templateId?: Types.ObjectId;

  @Prop()
  templateVersion?: number;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    type: String,
    enum: CreateToolType,
    required: true,
    index: true,
  })
  type!: CreateToolType;

  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
    index: true,
  })
  status!: DocumentStatus;

  @Prop({
    type: String,
    enum: DocumentSource,
    required: true,
  })
  source!: DocumentSource;

  @Prop({
    type: Types.ObjectId,
    ref: 'Scan',
  })
  scanId?: Types.ObjectId;

  @Prop({
    type: Object,
    default: () => ({
      fields: {},
      elements: [],
    }),
  })
  content!: DocumentContent;

  @Prop({
    type: Object,
    default: () => ({
      pageSize: 'A4',
      orientation: 'portrait',
      language: 'en',
    }),
  })
  metadata!: {
    pageSize?: string;
    orientation?: string;
    language?: string;
    [key: string]: any;
  };

  @Prop()
  thumbnailUrl?: string;

  @Prop({
    default: 1,
  })
  currentVersion!: number;

  @Prop({
    default: false,
    index: true,
  })
  isFavorite!: boolean;

  @Prop({
    type: String,
    enum: DocumentVisibility,
    default: DocumentVisibility.PRIVATE,
  })
  visibility!: DocumentVisibility;

  @Prop()
  lastOpenedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CreateDocumentSchema =
  SchemaFactory.createForClass(CreateDocument);

CreateDocumentSchema.index({
  userId: 1,
  status: 1,
  updatedAt: -1,
});

CreateDocumentSchema.index({
  userId: 1,
  lastOpenedAt: -1,
});

CreateDocumentSchema.index({
  userId: 1,
  templateId: 1,
});

CreateDocumentSchema.index({
  userId: 1,
  type: 1,
});

CreateDocumentSchema.index({
  title: 'text',
});