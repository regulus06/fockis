import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Program,
} from '../schemas/program.schema';

import type {
  ProgramCategory,
} from '../schemas/program.schema';

import { CreateProgramDto } from '../dto/create-program.dto';
import { UpdateProgramDto } from '../dto/update-program.dto';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectModel(Program.name)
    private readonly programModel: Model<Program>,
  ) {}

  async findAll(cat?: ProgramCategory) {
    const filter =
      cat && cat !== ('all' as ProgramCategory)
        ? { cat }
        : {};

    return this.programModel
      .find(filter)
      .sort({ name: 1 })
      .exec();
  }

  async findBySlug(slug: string) {
    const program = await this.programModel
      .findOne({ slug })
      .exec();

    if (!program) {
      throw new NotFoundException(
        `Program "${slug}" not found`,
      );
    }

    return program;
  }

  async getCurriculum(slug: string) {
    const program = await this.findBySlug(slug);

    return program.curriculum;
  }

  async create(dto: CreateProgramDto) {
    return this.programModel.create(dto);
  }

  async update(
    slug: string,
    dto: UpdateProgramDto,
  ) {
    const program =
      await this.programModel
        .findOneAndUpdate(
          { slug },
          dto,
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

    if (!program) {
      throw new NotFoundException(
        `Program "${slug}" not found`,
      );
    }

    return program;
  }

  async remove(slug: string) {
    const result =
      await this.programModel
        .deleteOne({ slug })
        .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Program "${slug}" not found`,
      );
    }

    return {
      deleted: true,
    };
  }
}