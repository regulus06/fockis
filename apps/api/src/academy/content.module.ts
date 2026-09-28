import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  ContentItem,
  ContentItemSchema,
} from './content/schemas/content-item.schema';

import { ContentService } from './content/services/content.service';
import { ContentController } from './content/controllers/content.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ContentItem.name,
        schema: ContentItemSchema,
      },
    ]),
  ],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}