import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsItem, NewsItemSchema } from './schemas/news.schema';
import { NewsService } from './services/news.service';
import { NewsController } from './controllers/news.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: NewsItem.name, schema: NewsItemSchema }])],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
