import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { DesignCategory } from '../types/design.types';
import { DesignDocumentSchemaFactory, DesignDocumentSchema } from './design.schema';

export type DesignTemplateDocument = HydratedDocument<DesignTemplate>;

@Schema({ timestamps: true, collection: 'design_templates' })
export class DesignTemplate {
  @Prop({ required: true, unique: true, trim: true, index: true }) slug!: string;
  @Prop({ required: true, trim: true, maxlength: 160 }) name!: string;
  @Prop({ required: true, enum: ['logo', 'flyer', 'banner', 'badge', 'business-card', 'poster', 'invitation', 'certificate', 'social', 'menu'], index: true }) category!: DesignCategory;
  @Prop({ required: true, trim: true, maxlength: 1000 }) description!: string;
  @Prop({ required: true }) iconName!: string;
  @Prop({ required: true }) gradient!: string;
  @Prop({ required: true }) dimensions!: string;
  @Prop({ default: false, index: true }) popular!: boolean;
  @Prop({ default: false, index: true }) premium!: boolean;
  @Prop({ default: true, index: true }) active!: boolean;
  @Prop({ type: DesignDocumentSchemaFactory, required: true }) document!: DesignDocumentSchema;
  @Prop({ type: [String], default: [] }) tags!: string[];
  @Prop({ default: 0 }) usageCount!: number;
}

export const DesignTemplateSchema = SchemaFactory.createForClass(DesignTemplate);
DesignTemplateSchema.index({ category: 1, active: 1, popular: -1 });
DesignTemplateSchema.index({ name: 'text', description: 'text', tags: 'text' });
