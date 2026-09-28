import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CampusEvent } from '../schemas/event.schema';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(@InjectModel(CampusEvent.name) private eventModel: Model<CampusEvent>) {}

  findAll(includePast = false) {
    const filter = includePast ? {} : { date: { $gte: new Date() } };
    return this.eventModel.find(filter).sort({ date: 1 }).exec();
  }

  async findOne(id: string) {
    const event = await this.eventModel.findById(id).exec();
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  create(dto: CreateEventDto) {
    return this.eventModel.create({ ...dto, date: new Date(dto.date) });
  }

  async update(id: string, dto: UpdateEventDto) {
    const patch = dto.date ? { ...dto, date: new Date(dto.date) } : dto;
    const event = await this.eventModel.findByIdAndUpdate(id, patch, { new: true }).exec();
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async remove(id: string) {
    const result = await this.eventModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Event not found');
    return { deleted: true };
  }
}
