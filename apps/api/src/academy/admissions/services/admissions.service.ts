import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application } from '../schemas/application.schema';
import { CreateApplicationDto } from '../dto/create-application.dto';

@Injectable()
export class AdmissionsService {
  constructor(@InjectModel(Application.name) private applicationModel: Model<Application>) {}

  create(dto: CreateApplicationDto) {
    return this.applicationModel.create(dto);
  }

  findAll() {
    return this.applicationModel.find().populate('programId').sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const application = await this.applicationModel.findById(id).populate('programId').exec();
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  async updateStatus(id: string, status: string) {
    const application = await this.applicationModel.findByIdAndUpdate(id, { status }, { new: true }).exec();
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }
}
