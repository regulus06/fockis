import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Faculty } from '../schemas/faculty.schema';
import { CreateFacultyDto } from '../dto/create-faculty.dto';
import { UpdateFacultyDto } from '../dto/update-faculty.dto';

@Injectable()
export class FacultyService {
  constructor(@InjectModel(Faculty.name) private facultyModel: Model<Faculty>) {}

  findAll() {
    return this.facultyModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string) {
    const member = await this.facultyModel.findById(id).exec();
    if (!member) throw new NotFoundException('Faculty member not found');
    return member;
  }

  create(dto: CreateFacultyDto) {
    return this.facultyModel.create(dto);
  }

  async update(id: string, dto: UpdateFacultyDto) {
    const member = await this.facultyModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!member) throw new NotFoundException('Faculty member not found');
    return member;
  }

  async remove(id: string) {
    const result = await this.facultyModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Faculty member not found');
    return { deleted: true };
  }
}
