import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';

import {
  TranslationCache,
  TranslationCacheSchema,
} from './schemas/translation-cache.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TranslationCache.name,
        schema: TranslationCacheSchema,
      },
    ]),
  ],

  controllers: [
    TranslationController,
  ],

  providers: [
    TranslationService,
  ],

  exports: [
    TranslationService,
  ],
})
export class TranslationModule {}