import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TranslationCacheDocument =
  HydratedDocument<TranslationCache>;

@Schema({
  collection: 'translation_cache',
  timestamps: true,
})
export class TranslationCache {
  @Prop({
    required: true,
    index: true,
  })
  cacheKey!: string;

  @Prop({
    required: true,
  })
  sourceText!: string;

  @Prop({
    required: true,
  })
  sourceLanguage!: string;

  @Prop({
    required: true,
  })
  targetLanguage!: string;

  @Prop({
    required: true,
  })
  translatedText!: string;

  @Prop({
    required: true,
  })
  provider!: string;

  @Prop({
    required: true,
  })
  model!: string;
}

export const TranslationCacheSchema =
  SchemaFactory.createForClass(TranslationCache);

TranslationCacheSchema.index(
  { cacheKey: 1 },
  { unique: true },
);

TranslationCacheSchema.index(
  {
    sourceLanguage: 1,
    targetLanguage: 1,
  },
);