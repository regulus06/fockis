import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewsItem } from '../schemas/news.schema';
import { CreateNewsDto } from '../dto/create-news.dto';
import { UpdateNewsDto } from '../dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(@InjectModel(NewsItem.name) private newsModel: Model<NewsItem>) {}

  findAll(limit = 8, includeUnpublished = false) {
    const filter = includeUnpublished ? {} : { published: true };
    return this.newsModel.find(filter).sort({ createdAt: -1 }).limit(limit).exec();
  }

  create(dto: CreateNewsDto) {
    return this.newsModel.create(dto);
  }

  async update(id: string, dto: UpdateNewsDto) {
    const item = await this.newsModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!item) throw new NotFoundException('News item not found');
    return item;
  }

  async remove(id: string) {
    const result = await this.newsModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('News item not found');
    return { deleted: true };
  }
}
