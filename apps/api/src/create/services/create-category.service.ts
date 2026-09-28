import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../schemas/create-category.schema';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryNotFoundException } from '../constants/errors';
import { assertValidObjectId } from '../utils/object-id.util';
import { slugify } from '../utils/slugify.util';

@Injectable()
export class CreateCategoryService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async findAll(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    return this.categoryModel.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  }

  async findById(id: string) {
    assertValidObjectId(id);
    const category = await this.categoryModel.findById(id).lean();
    if (!category) throw new CategoryNotFoundException(id);
    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.categoryModel.findOne({ slug: slug.toLowerCase() }).lean();
    if (!category) throw new CategoryNotFoundException(slug);
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = (dto.slug || slugify(dto.name)).toLowerCase();
    const existing = await this.categoryModel.findOne({ slug }).lean();
    if (existing) throw new ConflictException(`Category slug "${slug}" already exists`);

    return this.categoryModel.create({ ...dto, slug });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    assertValidObjectId(id);
    const update: any = { ...dto };
    if (dto.slug) update.slug = dto.slug.toLowerCase();

    const category = await this.categoryModel.findByIdAndUpdate(id, update, { new: true });
    if (!category) throw new CategoryNotFoundException(id);
    return category;
  }

  async remove(id: string) {
    assertValidObjectId(id);
    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!category) throw new CategoryNotFoundException(id);
    return { deleted: true };
  }
}
