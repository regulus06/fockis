import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

import {
  DocumentScanStatus,
  DocumentScanType,
} from "../types/document-scanner.types";

export type ScannedDocumentDocument =
  HydratedDocument<ScannedDocument>;

@Schema({
  timestamps: true,
  collection: "scanned_documents",
})
export class ScannedDocument {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  title!: string;

  @Prop({
    enum: Object.values(DocumentScanType),
    default: DocumentScanType.DOCUMENT,
  })
  type!: DocumentScanType;

  @Prop({
    enum: Object.values(DocumentScanStatus),
    default: DocumentScanStatus.PROCESSING,
  })
  status!: DocumentScanStatus;

  @Prop()
  originalName?: string;

  @Prop()
  filename?: string;

  @Prop()
  filePath?: string;

  @Prop()
  enhancedFilePath?: string;

  @Prop()
  croppedFilePath?: string;

  @Prop()
  backgroundRemovedFilePath?: string;

  @Prop()
  pdfFilePath?: string;

  @Prop()
  mimeType?: string;

  @Prop()
  fileSize?: number;

  @Prop({
    default: "",
  })
  ocrText!: string;

  @Prop({
    default: 0,
  })
  ocrConfidence!: number;

  @Prop({
    default: "eng",
  })
  ocrLanguage!: string;

  @Prop({
    type: [String],
    default: [],
  })
  tags!: string[];

  @Prop({
    default: false,
  })
  isDeleted!: boolean;
}

export const ScannedDocumentSchema =
  SchemaFactory.createForClass(ScannedDocument);