import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContactMessage } from '../schemas/contact-message.schema';
import { CreateContactMessageDto } from '../dto/create-contact-message.dto';
import { UpdateContactMessageDto } from '../dto/update-contact-message.dto';

@Injectable()
export class ContactService {
  constructor(@InjectModel(ContactMessage.name) private messageModel: Model<ContactMessage>) {}

  async create(dto: CreateContactMessageDto) {
    const created = await this.messageModel.create(dto);
    // Hook your real notification path in here — e.g. publish to the
    // existing Kafka service, or call your email provider — so Admissions
    // actually gets notified instead of the message only sitting in Mongo.
    return { ok: true, id: created._id };
  }

  findAll() {
    return this.messageModel.find().sort({ createdAt: -1 }).exec();
  }

  async updateStatus(id: string, dto: UpdateContactMessageDto) {
    const message = await this.messageModel.findByIdAndUpdate(id, { status: dto.status }, { new: true }).exec();
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async remove(id: string) {
    const result = await this.messageModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Message not found');
    return { deleted: true };
  }
}
