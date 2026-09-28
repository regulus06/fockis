import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import type { DocumentContent } from '../interfaces/editor.interfaces';

export type DocumentVersionDocument = DocumentVersion & Document;

@Schema({
  timestamps: true,
  collection: 'create_document_versions',
})
export class DocumentVersion {
  _id!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CreateDocument',
    required: true,
    index: true,
  })
  documentId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  version!: number;

  @Prop({
    type: Object,
    required: true,
  })
  content!: DocumentContent;

  @Prop()
  title?: string;

  @Prop({ default: false })
  isAutosave!: boolean;

  @Prop()
  note?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DocumentVersionSchema =
  SchemaFactory.createForClass(DocumentVersion);

DocumentVersionSchema.index(
  { documentId: 1, version: -1 },
  { unique: true },
);

DocumentVersionSchema.index({
  documentId: 1,
  createdAt: -1,
});