import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContentItem } from '../schemas/content-item.schema';
import { CreateContentItemDto } from '../dto/create-content-item.dto';
import { UpdateContentItemDto } from '../dto/update-content-item.dto';

@Injectable()
export class ContentService {
  constructor(@InjectModel(ContentItem.name) private contentModel: Model<ContentItem>) {}

  findBySection(section: string) {
    return this.contentModel.find({ section }).sort({ order: 1 }).exec();
  }

  listSections() {
    return this.contentModel.distinct('section').exec();
  }

  create(dto: CreateContentItemDto) {
    return this.contentModel.create({ ...dto, order: dto.order ?? 0 });
  }

  async update(id: string, dto: UpdateContentItemDto) {
    const item = await this.contentModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!item) throw new NotFoundException('Content item not found');
    return item;
  }

  async remove(id: string) {
    const result = await this.contentModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Content item not found');
    return { deleted: true };
  }
}
