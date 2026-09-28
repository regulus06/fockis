import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property, PropertyDocument } from '../schemas/property.schema';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async findAll(query: any) {
    const filter: any = {};

    if (query.location) filter.location = query.location;
    if (query.type) filter.type = query.type;

    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }

    if (query.search) {
      filter.title = { $regex: query.search, $options: 'i' };
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 12;
    const skip = (page - 1) * limit;

    const data = await this.propertyModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await this.propertyModel.countDocuments(filter);

    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const property = await this.propertyModel.findById(id);
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async create(data: Partial<Property>) {
    return this.propertyModel.create(data);
  }

  async update(id: string, data: Partial<Property>) {
    const updated = await this.propertyModel.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!updated) throw new NotFoundException('Property not found');
    return updated;
  }

  async delete(id: string) {
    const deleted = await this.propertyModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Property not found');
    return { success: true };
  }

  // 🟣 NEW: IMAGE UPLOAD (TEMP LOCAL VERSION)
  async uploadImages(files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      return { urls: [] };
    }

    const urls = files.map((file) => {
      // simple local path (replace with S3 later)
      return `/uploads/${file.filename}`;
    });

    return { urls };
  }
}