import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { CreateToolType } from '../interfaces/editor.interfaces';
import type {
  CanvasConfig,
  TemplateElement,
  TemplateField,
} from '../interfaces/editor.interfaces';

export type TemplateDocument = Template & Document;

@Schema({
  timestamps: true,
  collection: 'create_templates',
})
export class Template {
  _id!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  slug!: string;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  categoryId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: CreateToolType,
    required: true,
    index: true,
  })
  type!: CreateToolType;

  @Prop()
  thumbnailUrl?: string;

  @Prop()
  previewUrl?: string;

  @Prop({
    default: false,
    index: true,
  })
  isActive!: boolean;

  @Prop({
    default: false,
    index: true,
  })
  isFeatured!: boolean;

  @Prop({
    default: false,
    index: true,
  })
  isPremium!: boolean;

  @Prop({
    default: true,
  })
  isPublic!: boolean;

  /**
   * Current published version number.
   * Incremented on every admin update.
   */
  @Prop({
    default: 1,
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
    type: [String],
    default: [],
  })
  tags!: string[];

  @Prop({
    default: 0,
  })
  usageCount!: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  createdBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);

TemplateSchema.index({
  categoryId: 1,
  isActive: 1,
});

TemplateSchema.index({
  type: 1,
  isActive: 1,
});

TemplateSchema.index({
  isFeatured: 1,
  isActive: 1,
});

TemplateSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
});