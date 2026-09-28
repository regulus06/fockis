import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import type {
  CanvasConfig,
  TemplateElement,
  TemplateField,
} from '../interfaces/editor.interfaces';

export type TemplateVersionDocument = TemplateVersion & Document;

/**
 * Immutable snapshot of a Template's structure at a given version number.
 *
 * Documents created from a template pin `templateVersion` so that later
 * edits to the master template never retroactively change existing
 * user documents.
 */
@Schema({
  timestamps: true,
  collection: 'create_template_versions',
})
export class TemplateVersion {
  _id!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Template',
    required: true,
    index: true,
  })
  templateId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  version!: number;

  @Prop({
    type: Object,
    required: true,
  })
  canvas!: CanvasConfig;

  @Prop({
    type: [Object],
    default: [],
  })
  fields!: TemplateField[];

  @Prop({
    type: [Object],
    default: [],
  })
  elements!: TemplateElement[];

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  createdBy?: Types.ObjectId;

  @Prop()
  changeNote?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const TemplateVersionSchema =
  SchemaFactory.createForClass(TemplateVersion);

TemplateVersionSchema.index(
  {
    templateId: 1,
    version: 1,
  },
  {
    unique: true,
  },
);